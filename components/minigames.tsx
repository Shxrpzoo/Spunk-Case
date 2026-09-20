"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Coins, Sparkles, Shuffle } from "lucide-react";
import {
  cardValue,
  effectChances,
  effectMultipliers,
  type UpgradeEffect,
  type Catalog,
  type Settings,
} from "@/lib/catalog";
import type { Outcome, State } from "@/lib/types";
import { CoinLeaderboard } from "./coin-leaderboard";
import { CoinCelebration } from "./coin-celebration";
import { ItemArt, CardEffect } from "./item-card";
const randomZone = () =>
  Math.floor(
    (crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * 360,
  );
export function Minigame({
  kind,
  run,
  busy,
  signedIn,
  onAuth,
  sound,
  state,
  catalog,
  settings,
  onLanded,
}: {
  kind: "upgrade" | "coin";
  settings: Settings;
  onLanded: () => void;
  run: (body: Record<string, unknown>) => Promise<Outcome | null>;
  busy: boolean;
  signedIn: boolean;
  onAuth: () => void;
  sound: (win?: boolean) => void;
  state: State | null;
  catalog: Catalog;
}) {
  const [mode, setMode] = useState<"card" | "nuggets">("card"),
    [target, setTarget] = useState<UpgradeEffect>("SPUNK"),
    [multiplier, setMultiplier] = useState(2),
    [zone, setZone] = useState(0),
    [selected, setSelected] = useState(""),
    [wager, setWager] = useState("20"),
    [face, setFace] = useState<"HEADS" | "TAILS">("HEADS"),
    [spinning, setSpinning] = useState(false),
    [rotation, setRotation] = useState(0),
    [duration, setDuration] = useState(3600),
    [result, setResult] = useState<Outcome | null>(null),
    [error, setError] = useState(""),
    [spinItem, setSpinItem] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true),
    lock = useRef(false),
    landedRef = useRef(onLanded);
  landedRef.current = onLanded;
  useEffect(() => {
    mounted.current = true;
    setZone(randomZone());
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (kind === "coin") landedRef.current();
    };
  }, []);
  const cardMode = kind === "upgrade" && mode === "card",
    available = state?.cards ?? [];
  const chosen =
    available.find((c) => c.item_id + "|" + c.effect === selected) ??
    available[0];
  const selectedItem = catalog.items.find(
    (i) => i.id === (result?.itemId ?? (spinning ? spinItem : chosen?.item_id)),
  );
  const odds = cardMode
      ? effectChances[target]
      : kind === "coin"
        ? 50
        : settings.upgradeChances[String(multiplier)],
    n = Number(wager),
    valid =
      Number.isInteger(n) &&
      n >= 1 &&
      n <= 1000000 &&
      n <= (state?.player.balance ?? 0);
  const highlight = cardMode
    ? target === "SPUNK"
      ? "#edf7e5"
      : target === "POO"
        ? "#8bad48"
        : "#ffd867"
    : "#c8f77c";
  function prepare() {
    setResult(null);
    setZone(randomZone());
    setError("");
  }
  async function spin() {
    if (!signedIn) {
      onAuth();
      return;
    }
    if (busy || lock.current) return;
    if (kind === "upgrade" && result) {
      prepare();
      return;
    }
    if (cardMode && !chosen) return;
    if (!cardMode && !valid) {
      setError(
        "Enter a whole amount from 1 to your balance (maximum 1,000,000 SN).",
      );
      return;
    }
    lock.current = true;
    setSpinItem(chosen?.item_id ?? "");
    setSpinning(true);
    setResult(null);
    setError("");
    const out = await run(
      kind === "coin"
        ? { kind: "coin", wager: n, face }
        : cardMode
          ? {
              kind: "upgrade",
              itemId: chosen!.item_id,
              sourceEffect: chosen!.effect,
              effect: target,
              zone,
            }
          : { kind: "nugget-upgrade", wager: n, multiplier, zone },
    );
    if (!mounted.current) {
      if (kind === "coin") landedRef.current();
      return;
    }
    if (!out) {
      lock.current = false;
      setSpinning(false);
      return;
    }
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 120
      : 3600;
    setDuration(ms);
    setRotation(
      (prev) =>
        (Math.floor(prev / 360) + 7) * 360 +
        (kind === "coin"
          ? out.face === "HEADS"
            ? 0
            : 180
          : (out.roll ?? 0) * 360),
    );
    sound();
    timer.current = setTimeout(() => {
      if (!mounted.current) return;
      if (kind === "coin") landedRef.current();
      setResult(out);
      setSpinning(false);
      lock.current = false;
      sound(!!out.won);
    }, ms + 80);
  }
  return (
    <section className="page-section minigame-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">
            {kind === "upgrade"
              ? "CHOOSE YOUR RISK. PLACE YOUR ODDS."
              : "PICK A SIDE. TAKE A CHANCE."}
          </span>
          <h1>{kind === "upgrade" ? "THE UPGRADE LAB." : "HEADS OR TAILS?"}</h1>
          <p>
            {kind === "upgrade"
              ? "Give a card an effect, or multiply your Spunk Nuggets."
              : "A fair 50/50 flip. Win for a 2× total return."}
          </p>
        </div>
        {kind === "upgrade" ? (
          <Sparkles className="page-emblem" />
        ) : (
          <Coins className="page-emblem" />
        )}
      </div>
      <div className="game-lab">
        <div
          className={"game-display " + (spinning ? "is-spinning" : "")}
          style={{ position: "relative", overflow: "hidden" }}
        >
          {kind === "coin" && result && (
            <CoinCelebration key={result.id} won={!!result.won} />
          )}
          {kind === "upgrade" ? (
            <>
              <div
                className="effect-wheel-wrap"
                style={{ "--effect-color": highlight } as React.CSSProperties}
              >
                <div
                  className="effect-wheel"
                  style={{
                    background: `conic-gradient(from ${zone}deg,${highlight} 0 ${odds}%,#2b382c ${odds}% 100%)`,
                  }}
                />
                <div
                  className="needle-track"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: `transform ${duration}ms cubic-bezier(.1,.72,.1,1)`,
                  }}
                >
                  <div className="wheel-pointer" />
                </div>
                <div
                  className={
                    "wheel-card " +
                    (result && !result.won && cardMode ? "card-lost" : "")
                  }
                >
                  {cardMode && selectedItem ? (
                    <>
                      <ItemArt item={selectedItem} />
                      <CardEffect
                        effect={result?.won ? result.effect : chosen?.effect}
                      />
                    </>
                  ) : (
                    <div className="wheel-nuggets">
                      <i className="nugget" />
                      <strong>{multiplier}×</strong>
                    </div>
                  )}
                </div>
              </div>
              <div className="zone-control">
                <label htmlFor="zone-position">
                  Winning area <strong>{odds}% chance</strong>
                </label>
                <input
                  id="zone-position"
                  type="range"
                  min="0"
                  max="359"
                  value={zone}
                  disabled={busy || spinning || !!result}
                  onChange={(e) => setZone(Number(e.target.value))}
                  aria-valuetext={zone + " degrees clockwise"}
                />
                <div>
                  <span>← Anti-clockwise</span>
                  <button
                    className="text-link"
                    disabled={busy || spinning || !!result}
                    onClick={() => setZone(randomZone())}
                  >
                    <Shuffle size={12} /> Random
                  </button>
                  <span>Clockwise →</span>
                </div>
                <p>Move the highlighted area. Your odds stay the same.</p>
              </div>
            </>
          ) : (
            <div className="coin-stage">
              <div className="coin-shadow" />
              <div
                className="coin-3d"
                style={{
                  transform: `rotateY(${rotation}deg)`,
                  transition: `transform ${duration}ms cubic-bezier(.12,.72,.12,1)`,
                }}
              >
                <div className="coin-face heads">
                  <span>SPUNK NUGGET</span>
                  <strong>S</strong>
                  <small>HEADS</small>
                </div>
                <div className="coin-face tails">
                  <span>THE OTHER SIDE</span>
                  <strong>✦</strong>
                  <small>TAILS</small>
                </div>
              </div>
            </div>
          )}
          <div className="game-result" role="status">
            {spinning ? (
              <>
                <strong>
                  Finding your {kind === "coin" ? "side" : "result"}…
                </strong>
                <span>Result is saved before it lands.</span>
              </>
            ) : result ? (
              <>
                <strong className={result.won ? "lime" : "loss-text"}>
                  {cardMode
                    ? result.won
                      ? result.effect + " EFFECT!"
                      : "UPGRADE FAILED · CARD LOST"
                    : kind === "coin"
                      ? result.face +
                        " · " +
                        (result.won ? "YOU WIN" : "NEXT TIME")
                      : result.won
                        ? result.multiplier + "× UPGRADE WON"
                        : "UPGRADE LOST"}
                </strong>
                <span>
                  {cardMode
                    ? result.won
                      ? "Card saved · " +
                        result.value?.toLocaleString("en-GB") +
                        " SN value"
                      : "One copy was lost. Your collection discovery is kept."
                    : result.won
                      ? "+" +
                        result.payout?.toLocaleString("en-GB") +
                        " SN total return"
                      : "Your wager was " + result.wager + " SN."}
                </span>
              </>
            ) : (
              <>
                <strong>
                  {kind === "upgrade"
                    ? "Land in the highlighted area."
                    : "Feeling lucky?"}
                </strong>
                <span>
                  {cardMode
                    ? "Win the effect. Miss and lose one copy."
                    : kind === "upgrade"
                      ? "Win the multiplier. Miss and lose your wager."
                      : "Choose heads or tails, then flip."}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="game-console">
          {kind === "upgrade" && (
            <div className="segmented upgrade-modes">
              <button
                disabled={busy || spinning}
                className={mode === "card" ? "selected" : ""}
                onClick={() => {
                  setMode("card");
                  prepare();
                }}
              >
                Card effects
              </button>
              <button
                disabled={busy || spinning}
                className={mode === "nuggets" ? "selected" : ""}
                onClick={() => {
                  setMode("nuggets");
                  prepare();
                }}
              >
                Spunk Nuggets
              </button>
            </div>
          )}
          {cardMode ? (
            <>
              <h2>Choose a card & effect</h2>
              <label className="field">
                Card to risk
                <select
                  value={chosen ? chosen.item_id + "|" + chosen.effect : ""}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    prepare();
                  }}
                  disabled={busy || spinning}
                >
                  <option value="" disabled>
                    {available.length
                      ? "Select a card"
                      : "Open a case to get a card"}
                  </option>
                  {available.map((c) => {
                    const i = catalog.items.find((x) => x.id === c.item_id)!;
                    return (
                      <option
                        key={c.item_id + c.effect}
                        value={c.item_id + "|" + c.effect}
                      >
                        {i.name} · {c.effect === "RAW" ? "Original" : c.effect}{" "}
                        · ×{c.quantity} · {cardValue(i, c.effect)} SN
                      </option>
                    );
                  })}
                </select>
              </label>
              <div className="effect-targets">
                {(["SPUNK", "POO", "SMEGMA"] as const).map((t) => (
                  <button
                    key={t}
                    disabled={spinning || busy}
                    className={target === t ? "selected" : ""}
                    onClick={() => {
                      setTarget(t);
                      prepare();
                    }}
                  >
                    <span>
                      {t === "SPUNK" ? "◉" : t === "POO" ? "💩" : "🧀"} {t}
                    </span>
                    <b>{effectChances[t]}%</b>
                    <small>{effectMultipliers[t]}× base card value</small>
                  </button>
                ))}
              </div>
              <div className="payout-summary">
                <span>
                  CHANCE<strong>{odds}%</strong>
                </span>
                <span>
                  SUCCESS VALUE
                  <strong>
                    {selectedItem
                      ? cardValue(selectedItem, target).toLocaleString("en-GB")
                      : 0}{" "}
                    SN
                  </strong>
                </span>
              </div>
              <p className="game-note">
                A failed roll destroys one selected copy. A success replaces its
                effect with {target.toLowerCase()}. Values are based on the
                card’s pull odds; effects do not stack.
              </p>
            </>
          ) : (
            <>
              <h2>
                {kind === "coin" ? "Call the flip" : "Choose your multiplier"}
              </h2>
              {kind === "coin" ? (
                <div className="segmented coin-choices">
                  {(["HEADS", "TAILS"] as const).map((f) => (
                    <button
                      key={f}
                      disabled={spinning || busy}
                      className={f === face ? "selected" : ""}
                      onClick={() => setFace(f)}
                    >
                      {f === "HEADS" ? "S" : "✦"} {f}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="segmented multiplier-choices">
                  {[2, 5, 10, 20].map((m) => (
                    <button
                      key={m}
                      disabled={busy || spinning}
                      className={m === multiplier ? "selected" : ""}
                      onClick={() => {
                        setMultiplier(m);
                        prepare();
                      }}
                    >
                      {m}×
                    </button>
                  ))}
                </div>
              )}
              <label className="field">
                Your wager · SN
                <input
                  inputMode="numeric"
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  value={wager}
                  disabled={spinning || busy}
                  onChange={(e) => setWager(e.target.value)}
                />
              </label>
              <div className="wager-presets">
                {[20, 100, 500].map((v) => (
                  <button
                    key={v}
                    disabled={spinning || busy}
                    onClick={() => setWager(String(v))}
                  >
                    {v} SN
                  </button>
                ))}
                <button
                  disabled={spinning || busy}
                  onClick={() =>
                    setWager(
                      String(
                        Math.min(
                          1000000,
                          Math.max(
                            1,
                            Math.floor((state?.player.balance ?? 0) / 2),
                          ),
                        ),
                      ),
                    )
                  }
                >
                  ½ balance
                </button>
              </div>
              <div className="payout-summary">
                <span>
                  WIN CHANCE<strong>{odds}%</strong>
                </span>
                <span>
                  TOTAL RETURN
                  <strong>
                    {Number.isFinite(n) && n > 0
                      ? (n * (kind === "coin" ? 2 : multiplier)).toLocaleString(
                          "en-GB",
                        )
                      : 0}{" "}
                    SN
                  </strong>
                </span>
              </div>
              <p className="game-note">
                {kind === "coin"
                  ? "Both sides have the same chance on every flip."
                  : "The highlighted arc is your winning area."}{" "}
                A loss costs your wager.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary full"
            disabled={
              busy || spinning || (signedIn && cardMode && !chosen && !result)
            }
            onClick={spin}
          >
            {spinning
              ? "Spinning…"
              : kind === "upgrade" && result
                ? "PREPARE NEXT SPIN"
                : cardMode
                  ? "RISK CARD & SPIN"
                  : kind === "upgrade"
                    ? "UPGRADE NUGGETS"
                    : "FLIP THE COIN"}{" "}
            <ArrowUpRight size={19} />
          </button>
          {kind === "upgrade" && (
            <a className="text-link lab-inventory" href="#inventory">
              View and sell your cards <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      </div>
      {kind === "coin" && (
        <CoinLeaderboard
          state={state}
          paused={spinning || busy}
          resultId={result?.id}
        />
      )}
    </section>
  );
}
