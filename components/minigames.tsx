"use client";
import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Outcome } from "@/lib/types";
import type { Settings } from "@/lib/catalog";
export function Minigame({
  kind,
  settings,
  run,
  busy,
  signedIn,
  onAuth,
  sound,
}: {
  kind: "upgrade" | "coin";
  settings: Settings;
  run: (body: Record<string, unknown>) => Promise<Outcome | null>;
  busy: boolean;
  signedIn: boolean;
  onAuth: () => void;
  sound: (win?: boolean) => void;
}) {
  const [wager, setWager] = useState(500),
    [multiplier, setMultiplier] = useState(2),
    [face, setFace] = useState("HEADS"),
    [spin, setSpin] = useState(false),
    [rotation, setRotation] = useState(0),
    [result, setResult] = useState<Outcome | null>(null);
  const rotationRef = useRef(0);
  const chance =
    kind === "coin" ? 50 : settings.upgradeChances[String(multiplier)];
  async function go() {
    if (!signedIn) {
      onAuth();
      return;
    }
    if (spin || busy) return;
    setSpin(true);
    setResult(null);
    const r = await run(
      kind === "coin" ? { kind, wager, face } : { kind, wager, multiplier },
    );
    if (!r) {
      setSpin(false);
      return;
    }
    sound();
    const angle =
      kind === "coin"
        ? r.face === "HEADS"
          ? 0
          : 180
        : r.won
          ? ((chance / 100) * 360) / 2
          : (chance / 100) * 360 + (360 - (chance / 100) * 360) / 2;
    rotationRef.current =
      (Math.floor(rotationRef.current / 360) + 6) * 360 + angle;
    setRotation(rotationRef.current);
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 500
          : 3200,
      ),
    );
    setSpin(false);
    setResult(r);
    sound(r.won);
  }
  return (
    <section className="page-section">
      <div className="page-title">
        <div>
          <span className="eyebrow">A LITTLE LUCK GOES A LONG WAY</span>
          <h1>{kind === "coin" ? "CALL IT. FLIP IT." : "RAISE THE STAKES."}</h1>
          <p>
            {kind === "coin"
              ? "Heads or tails. A fair 50 / 50."
              : "Choose your multiplier. See your chance. Take your shot."}
          </p>
        </div>
      </div>
      <div className="game-layout">
        <div className="game-stage">
          {kind === "upgrade" ? (
            <div
              className="upgrade-wheel"
              style={{
                background: `conic-gradient(var(--lime) 0deg ${chance * 3.6}deg, #30333e ${chance * 3.6}deg 360deg)`,
              }}
            >
              <div
                className="wheel-pointer"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <i />
              </div>
              <div className="wheel-inner">
                <span>
                  {spin
                    ? "UPGRADING"
                    : result
                      ? result.won
                        ? "WIN"
                        : "LOSS"
                      : "WIN CHANCE"}
                </span>
                <strong>
                  {spin
                    ? "…"
                    : result
                      ? result.won
                        ? "×" + result.multiplier
                        : "×0"
                      : chance + "%"}
                </strong>
                <small>{multiplier}× MULTIPLIER</small>
              </div>
            </div>
          ) : (
            <div className="coin-space">
              <div
                className="coin"
                style={{ transform: `rotateY(${rotation}deg)` }}
              >
                <div className="coin-face front">
                  <span>SPUNK CASES</span>
                  <strong>S</strong>
                  <span>HEADS</span>
                </div>
                <div className="coin-face back">
                  <span>SPUNK CASES</span>
                  <strong>✦</strong>
                  <span>TAILS</span>
                </div>
              </div>
              <p className="coin-caption">
                {spin
                  ? "IN THE AIR…"
                  : result
                    ? result.face
                    : "FORTUNE HAS TWO SIDES."}
              </p>
            </div>
          )}
          {result && (
            <div
              className={"game-result " + (result.won ? "win" : "loss")}
              role="status"
            >
              <span>
                {result.won ? "NICE ONE. YOU WON!" : "NO LUCK THIS TIME."}
              </span>
              <strong>
                {result.won
                  ? "+" +
                    ((result.payout ?? 0) - (result.wager ?? 0)).toLocaleString(
                      "en-GB",
                    )
                  : "−" + result.wager?.toLocaleString("en-GB")}{" "}
                SN
              </strong>
              <p>
                {result.won
                  ? "Total return " +
                    result.payout?.toLocaleString("en-GB") +
                    " SN, including your wager."
                  : "Your result and updated balance are saved."}
              </p>
            </div>
          )}
        </div>
        <form
          className="game-form panel"
          onSubmit={(e) => {
            e.preventDefault();
            void go();
          }}
        >
          <span className="eyebrow">
            {kind === "coin" ? "COIN FLIP" : "UPGRADER"}
          </span>
          <label>
            Wager in Spunk Nuggets
            <input
              type="number"
              min={1}
              max={1000000}
              step={1}
              required
              value={wager}
              disabled={spin || busy}
              onChange={(e) => setWager(Number(e.target.value))}
            />
          </label>
          <div className="wager-shortcuts">
            {[100, 500, 1000, 5000].map((n) => (
              <button
                type="button"
                key={n}
                disabled={spin || busy}
                onClick={() => setWager(n)}
              >
                {n.toLocaleString("en-GB")}
              </button>
            ))}
          </div>
          <label>
            {kind === "coin" ? "Make your call" : "Choose a multiplier"}
          </label>
          <div className="choices">
            {kind === "coin"
              ? ["HEADS", "TAILS"].map((f) => (
                  <button
                    type="button"
                    disabled={spin || busy}
                    key={f}
                    onClick={() => setFace(f)}
                    className={face === f ? "selected" : ""}
                  >
                    {f}
                  </button>
                ))
              : [1.5, 2, 5, 10, 20].map((m) => (
                  <button
                    type="button"
                    disabled={spin || busy}
                    key={m}
                    onClick={() => {
                      setMultiplier(m);
                      setResult(null);
                    }}
                    className={multiplier === m ? "selected" : ""}
                  >
                    {m}×
                  </button>
                ))}
          </div>
          <div className="game-summary">
            <div>
              <span>Chance to win</span>
              <b>{chance}%</b>
            </div>
            <div>
              <span>Potential total return</span>
              <b className="lime">
                {Math.floor(
                  wager * (kind === "coin" ? 2 : multiplier),
                ).toLocaleString("en-GB")}{" "}
                SN
              </b>
            </div>
          </div>
          <button className="primary full" disabled={spin || busy}>
            {spin
              ? "Playing…"
              : kind === "coin"
                ? "FLIP THE COIN"
                : "LET IT SPIN"}
            <ArrowUpRight size={20} />
          </button>
          <p className="micro">
            The server decides the result. A loss costs your wager. Spunk
            Nuggets have no cash value.
          </p>
        </form>
      </div>
    </section>
  );
}
