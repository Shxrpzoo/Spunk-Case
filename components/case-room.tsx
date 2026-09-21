"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  LockKeyhole,
} from "lucide-react";
import {
  rarities,
  chance,
  colors,
  hiddenMystery,
  cardValue,
  type Catalog,
  type Item,
  type Rarity,
  type Effect,
} from "@/lib/catalog";
import type { Outcome } from "@/lib/types";
import { ItemArt, ItemCard } from "./item-card";
import { CustomCase } from "./custom-case";
import goonStyles from "./goon.module.css";
import autoStyles from "./auto-roll.module.css";
import { api } from "@/lib/api";
import type { AutoBatch } from "@/lib/auto-roll";
const visualRandom = () =>
  crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
function shuffled(items: Item[]) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(visualRandom() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
export function CaseRoom({
  catalog,
  run,
  busy,
  onAuth,
  signedIn,
  balance,
  sound,
  onOutcome,
}: {
  catalog: Catalog;
  run: (body: Record<string, unknown>) => Promise<Outcome | null>;
  busy: boolean;
  onAuth: () => void;
  signedIn: boolean;
  balance: number;
  sound: (win?: boolean) => void;
  onOutcome: (out: Outcome) => void;
}) {
  const [caseId, setCaseId] = useState<string | null>(null),
    [quick, setQuick] = useState(false),
    [stage, setStage] = useState<"idle" | "drop" | "spin">("idle"),
    [reel, setReel] = useState<Item[]>([]),
    [travel, setTravel] = useState(0),
    [duration, setDuration] = useState(0),
    [expanded, setExpanded] = useState(false),
    [shownContents, setShownContents] = useState(24),
    [autoActive, setAutoActive] = useState(false),
    [autoRemaining, setAutoRemaining] = useState(0),
    [autoCount, setAutoCount] = useState(10),
    [autoStop, setAutoStop] = useState<Rarity | "">(""),
    [autoLog, setAutoLog] = useState<{ item: Item; effect?: Effect }[]>([]),
    [autoMessage, setAutoMessage] = useState("");
  const [batch, setBatch] = useState<AutoBatch | null>(null),
    [batchError, setBatchError] = useState("");
  const batchId = useRef<string | null>(null),
    autoRunning = useRef(false);
  async function loadBatch(id?: string) {
    try {
      const value = await api<AutoBatch | null>(
        "auto-batch" + (id ? "?id=" + encodeURIComponent(id) : ""),
      );
      if (mounted.current) {
        setBatch(value);
        setBatchError("");
      }
    } catch (e) {
      if (mounted.current) setBatchError((e as Error).message);
    }
  }
  useEffect(() => {
    if (signedIn) void loadBatch();
  }, [signedIn]);
  const viewport = useRef<HTMLDivElement>(null),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    mounted = useRef(true),
    soundRef = useRef(sound),
    opening = useRef(false),
    autoStartBalance = useRef(0);
  soundRef.current = sound;
  useEffect(() => {
    mounted.current = true;
    setQuick(localStorage.getItem("spunk-quick") === "true");
    const pause = () => {
      if (document.hidden && autoRunning.current) {
        autoRunning.current = false;
        setAutoActive(false);
        setAutoMessage(
          "Paused because this tab is hidden. Your results are saved.",
        );
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      autoRunning.current = false;
      document.removeEventListener("visibilitychange", pause);
      mounted.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);
  function later(fn: () => void, ms: number) {
    timers.current.push(
      setTimeout(() => {
        if (mounted.current) fn();
      }, ms),
    );
  }
  const ca = catalog.cases.find((c) => c.id === caseId),
    items = ca
      ? catalog.items.filter((i) => ca.weights.some((w) => w.itemId === i.id))
      : [];
  const active = stage !== "idle";
  function finishRoll(out: Outcome, isAuto: boolean) {
    if (!isAuto) return;
    if (out.batchId) void loadBatch(out.batchId);
    if (out.item)
      setAutoLog((log) =>
        [{ item: out.item!, effect: out.effect }, ...log].slice(0, 50),
      );
    setAutoRemaining((n) => Math.max(0, n - 1));
    if (
      out.item &&
      (out.item.mystery ||
        (autoStop &&
          rarities.indexOf(out.item.rarity) >= rarities.indexOf(autoStop)))
    ) {
      setAutoActive(false);
      autoRunning.current = false;
      setAutoMessage(
        `Stopped — pulled a ${out.item.rarity.toLowerCase()} card.`,
      );
    }
  }
  function startAuto() {
    if (!signedIn) {
      onAuth();
      return;
    }
    if (!ca || active || busy || opening.current) return;
    autoStartBalance.current = balance;
    batchId.current = crypto.randomUUID();
    setBatch({ id: batchId.current, results: [] });
    autoRunning.current = true;
    setAutoLog([]);
    setAutoMessage("");
    setAutoRemaining(autoCount);
    setAutoActive(true);
  }
  function stopAuto() {
    autoRunning.current = false;
    setAutoActive(false);
    setAutoMessage(
      "Stopped. Any roll already in progress will finish and save.",
    );
  }
  useEffect(() => {
    if (
      !autoActive ||
      !autoRunning.current ||
      stage !== "idle" ||
      busy ||
      opening.current
    )
      return;
    if (autoRemaining <= 0) {
      setAutoActive(false);
      autoRunning.current = false;
      setAutoMessage("Auto-roll complete.");
      return;
    }
    if (!ca) {
      setAutoActive(false);
      return;
    }
    if (ca.id !== "basic" && balance < ca.price) {
      setAutoActive(false);
      setAutoMessage("Stopped — not enough Spunk Nuggets for another roll.");
      return;
    }
    const t = setTimeout(() => {
      if (mounted.current && autoRunning.current && !document.hidden)
        void open(true);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoActive, stage, autoRemaining, balance, ca?.id, ca?.price, busy]);
  async function open(isAuto = false) {
    if (!signedIn) {
      onAuth();
      return;
    }
    if (
      !ca ||
      busy ||
      opening.current ||
      (ca.id !== "basic" && balance < ca.price)
    )
      return;
    opening.current = true;
    setStage("drop");
    setReel([]);
    const fast =
        quick || matchMedia("(prefers-reduced-motion: reduce)").matches,
      started = performance.now();
    const out = await run({
      kind: "case",
      caseId: ca.id,
      ...(isAuto && batchId.current ? { batchId: batchId.current } : {}),
    });
    if (!mounted.current) return;
    if (!out) {
      opening.current = false;
      setStage("idle");
      if (autoActive) {
        autoRunning.current = false;
        setAutoActive(false);
        setAutoMessage("Auto-roll stopped after an error.");
      }
      return;
    }
    const winner = out.item ?? catalog.items.find((i) => i.id === out.itemId);
    if (!winner) {
      opening.current = false;
      setStage("idle");
      onOutcome(out);
      finishRoll(out, isAuto);
      return;
    }
    let cards: Item[] = [];
    const mystery = items.find((i) => i.mystery);
    if (ca.id === "epipen" && mystery) {
      cards = Array.from({ length: 46 }, () => hiddenMystery(mystery));
      const greg = items.find((i) => !i.mystery)!;
      cards[Math.floor(visualRandom() * 25)] = greg;
    } else
      while (cards.length < 46)
        cards.push(...shuffled(items.map(hiddenMystery)));
    cards = cards.slice(0, 46);
    cards[37] = hiddenMystery(winner);
    const begin = () => {
      setReel(cards);
      setTravel(0);
      setDuration(0);
      setStage("spin");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!mounted.current) return;
          const first =
              viewport.current?.querySelector<HTMLElement>(".reel-item"),
            step = (first?.getBoundingClientRect().width ?? 180) + 16,
            width = viewport.current?.clientWidth ?? 900;
          const ms = fast ? 380 : 4100,
            jitter = (visualRandom() - 0.5) * step * 0.45;
          setDuration(ms);
          setTravel(-(37 * step + step / 2 - 8 - width / 2 + jitter));
          if (!fast)
            for (let i = 0; i < 31; i++)
              later(() => soundRef.current(), 65 * i + 1.7 * i * i);
          later(() => {
            opening.current = false;
            setStage("idle");
            setReel([]);
            soundRef.current(true);
            if (!isAuto || winner.mystery) onOutcome(out);
            finishRoll(out, isAuto);
          }, ms + 100);
        }),
      );
    };
    later(
      begin,
      Math.max(0, (fast ? 150 : 1150) - (performance.now() - started)),
    );
  }
  if (!ca)
    return (
      <section className="case-selection">
        <div className="case-selection-heading">
          <div>
            <span className="eyebrow">PICK YOUR NEXT DISCOVERY</span>
            <h1>
              GOOD THINGS.
              <br />
              <span>QUESTIONABLE CASES.</span>
            </h1>
          </div>
          <p>
            {catalog.cases.filter((c) => c.enabled).length} cases.{" "}
            {catalog.items.length} characters.
            <br />
            Something worth collecting.
          </p>
        </div>
        <div className="case-tiles">
          {catalog.cases
            .filter((c) => c.enabled || c.id === "basic")
            .sort((a, b) => Number(b.id === "basic") - Number(a.id === "basic"))
            .map((c, n) => (
              <article
                className={
                  "case-tile " +
                  (c.id === "satchel"
                    ? "satchel-tile"
                    : c.id === "ash"
                      ? "ash-tile"
                      : c.id === "goon"
                        ? goonStyles.tile
                        : "")
                }
                key={c.id}
              >
                <div className="tile-meta">
                  <span>
                    0{n + 1} /{" "}
                    {c.id === "epipen"
                      ? "THE MYSTERY PROTOCOL"
                      : c.id === "basic"
                        ? "THE ORIGINAL"
                        : c.id === "satchel"
                          ? "SOMETHING GOT OUT"
                          : c.id === "goon"
                            ? "FOR THE GOONERS"
                            : "FRESH OUT THE SMOKE"}
                  </span>
                  <span className="case-pill">
                    MYTHIC{" "}
                    {catalog.items
                      .filter((i) => i.rarity === "MYTHIC")
                      .reduce((s, i) => s + chance(c, i.id), 0)
                      .toFixed(3)
                      .replace(/\.?0+$/, "")}
                    %
                  </span>
                </div>
                <button
                  className="crate-select"
                  onClick={() => {
                    setCaseId(c.id);
                    setExpanded(false);
                  }}
                  aria-label={"View " + c.name}
                >
                  <CustomCase
                    ash={c.id === "ash"}
                    satchel={c.id === "satchel"}
                    goon={c.id === "goon"}
                    epipen={c.id === "epipen"}
                  />
                </button>
                <div className="tile-bottom">
                  <div>
                    <h2>{c.name}</h2>
                    <p>
                      <i className="nugget" /> {c.price}{" "}
                      <span>Spunk Nuggets</span>
                    </p>
                  </div>
                  <button
                    className="small-button"
                    onClick={() => setCaseId(c.id)}
                  >
                    View case <ArrowUpRight size={18} />
                  </button>
                </div>
              </article>
            ))}
        </div>
      </section>
    );
  return (
    <>
      <div className="section-top">
        <button
          className="text-link"
          onClick={() => {
            setCaseId(null);
            stopAuto();
            setExpanded(false);
          }}
          disabled={active || busy || autoActive}
        >
          <ArrowLeft size={16} /> All cases
        </button>
        <span className="micro muted">
          {items.length} CHARACTERS · SAVED WITH EVERY OPEN
        </span>
      </div>
      <section
        className={
          "case-room focused-case " +
          (ca.id === "satchel"
            ? "satchel-room"
            : ca.id === "ash"
              ? "ash-room"
              : ca.id === "goon"
                ? goonStyles.room
                : "")
        }
      >
        <div className="case-heading">
          <div>
            <span className="eyebrow">
              {ca.id === "epipen"
                ? "THE MYSTERY PROTOCOL"
                : ca.id === "satchel"
                  ? "SOMETHING GOT OUT"
                  : ca.id === "ash"
                    ? "FRESH OUT THE SMOKE"
                    : ca.id === "goon"
                      ? "FOR THE GOONERS"
                      : "THE ORIGINAL COLLECTION"}
            </span>
            <h1>{ca.name}</h1>
          </div>
          <span className="case-pill">
            {items
              .filter((i) => i.rarity === "MYTHIC")
              .reduce((s, i) => s + chance(ca, i.id), 0)
              .toFixed(3)
              .replace(/\.?0+$/, "")}
            % MYTHIC
          </span>
        </div>
        {stage === "spin" ? (
          <div className="reel-window spinning" ref={viewport}>
            <div className="reel-centre">
              <ChevronDown />
              <div />
            </div>
            <div
              className="reel"
              style={{
                transform: `translateX(${travel}px)`,
                transition: duration
                  ? `transform ${duration}ms cubic-bezier(.12,.72,.14,1)`
                  : "none",
              }}
            >
              {reel.map((item, i) => (
                <div
                  className="reel-item"
                  key={i}
                  style={
                    { "--rarity": colors[item.rarity] } as React.CSSProperties
                  }
                >
                  <ItemArt item={item} eager />
                  <span>{item.rarity}</span>
                  <strong>{item.name}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="crate-stage">
            <CustomCase
              ash={ca.id === "ash"}
              satchel={ca.id === "satchel"}
              goon={ca.id === "goon"}
              epipen={ca.id === "epipen"}
              opening={stage === "drop"}
            />
          </div>
        )}
        <div className="case-controls">
          <div className="cost">
            <span>CASE PRICE</span>
            <strong>
              <i className="nugget" />
              {ca.price} <small>SN</small>
            </strong>
          </div>
          <button
            className="primary open-case"
            onClick={() => void open()}
            disabled={
              busy ||
              active ||
              autoActive ||
              (signedIn && ca.id !== "basic" && balance < ca.price)
            }
          >
            {active ? "Opening…" : "OPEN CASE"} <ArrowUpRight size={21} />
          </button>
          <label className="quick">
            <input
              type="checkbox"
              checked={quick}
              onChange={(e) => {
                setQuick(e.target.checked);
                localStorage.setItem("spunk-quick", String(e.target.checked));
              }}
            />{" "}
            Quick open
          </label>
        </div>
        <div className={autoStyles.panel}>
          <div className={autoStyles.header}>
            <span className={autoStyles.title}>AUTO-ROLL</span>
            <div className={autoStyles.controls}>
              <label className={autoStyles.field}>
                <span>Rolls</span>
                <input
                  className={autoStyles.input}
                  type="number"
                  min={1}
                  max={50}
                  value={autoCount}
                  disabled={autoActive}
                  onChange={(e) =>
                    setAutoCount(
                      Math.min(
                        50,
                        Math.max(1, Math.floor(Number(e.target.value)) || 1),
                      ),
                    )
                  }
                />
              </label>
              <label className={autoStyles.field}>
                <span>Stop on</span>
                <select
                  className={autoStyles.select}
                  value={autoStop}
                  disabled={autoActive}
                  onChange={(e) => setAutoStop(e.target.value as Rarity | "")}
                >
                  <option value="">Nothing</option>
                  {rarities
                    .slice(2)
                    .reverse()
                    .map((r) => (
                      <option key={r} value={r}>
                        {r}+
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className={
                  autoStyles.button +
                  " " +
                  (autoActive ? autoStyles.buttonActive : "")
                }
                onClick={autoActive ? stopAuto : startAuto}
                disabled={
                  !autoActive &&
                  (busy ||
                    active ||
                    (signedIn && ca.id !== "basic" && balance < ca.price))
                }
              >
                {autoActive
                  ? `Stop (${autoRemaining} left)`
                  : "Start Auto-Roll"}
              </button>
            </div>
          </div>
          {(autoActive || autoMessage || autoLog.length > 0) && (
            <div className={autoStyles.status}>
              <span className={autoActive ? autoStyles.statusActive : ""}>
                {autoActive
                  ? `Rolling — ${autoRemaining} left…`
                  : autoMessage || "Idle"}
              </span>
              {autoLog.length > 0 &&
                autoStartBalance.current > 0 &&
                (() => {
                  const net = balance - autoStartBalance.current;
                  return (
                    <span
                      className={
                        autoStyles.net +
                        " " +
                        (net > 0
                          ? autoStyles.netUp
                          : net < 0
                            ? autoStyles.netDown
                            : "")
                      }
                    >
                      Net {net > 0 ? "+" : ""}
                      {net.toLocaleString("en-GB")} SN
                    </span>
                  );
                })()}
            </div>
          )}
          {autoLog.length > 0 && (
            <div className={autoStyles.log}>
              {autoLog.map((entry, i) => (
                <span
                  key={i}
                  className={autoStyles.logItem}
                  style={
                    {
                      "--rarity": colors[entry.item.rarity],
                    } as React.CSSProperties
                  }
                >
                  <span className={autoStyles.dot} />
                  {entry.item.name}
                </span>
              ))}
            </div>
          )}
          {batchError && (
            <p role="alert">Batch history unavailable: {batchError}</p>
          )}
          {!!batch?.results.length && (
            <div className={autoStyles.batch}>
              <h3>Latest auto-roll batch · {batch.results.length} cards</h3>
              <p>
                {batch.results.filter((r) => r.available).length} still
                available. Cards already sold, traded or used in upgrades are
                excluded. Older inventory is kept.
              </p>
              <div className={autoStyles.batchButtons}>
                {[undefined, ...rarities].map((r) => {
                  const available = batch.results.filter(
                    (x) => x.available && (!r || x.item.rarity === r),
                  );
                  return (
                    <button
                      key={r ?? "all"}
                      className="small-button"
                      disabled={
                        autoActive || active || busy || !available.length
                      }
                      onClick={async () => {
                        const out = await run({
                          kind: "sell-batch",
                          batchId: batch.id,
                          ...(r ? { rarity: r } : {}),
                        });
                        if (out) {
                          setAutoMessage(
                            `Sold ${out.sold} batch cards for ${out.payout?.toLocaleString("en-GB")} SN.`,
                          );
                          void loadBatch(batch.id);
                        }
                      }}
                    >
                      Sell {r ?? "all"} · {available.length} ·{" "}
                      {available
                        .reduce((n, x) => n + cardValue(x.item), 0)
                        .toLocaleString("en-GB")}{" "}
                      SN
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {(ca.id === "epipen" || ca.id === "goon") && (
          <p className={goonStyles.reelNote}>
            {ca.id === "epipen"
              ? "Greg 97.6% · Each of 12 mystery cards 0.2% (2.4% combined)."
              : "Mystery items 0.008% combined. See Inside the case for every pull chance."}{" "}
            The reel is a visual showcase; its picture frequency does not
            represent the pull odds. The server rolls using the published odds.
          </p>
        )}
        {signedIn && balance < ca.price && (
          <p className="case-funds">
            {ca.id === "basic" ? (
              "Running low? Your Basic case gets a free top-up so you can keep opening."
            ) : (
              <>
                Need more Nuggets? <a href="#rewards">Claim a reward</a> or sell
                a card in Inventory.
              </>
            )}
          </p>
        )}
        <div className="case-foot">
          <LockKeyhole size={13} />
          <span>Every result is saved before the reveal.</span>
        </div>
      </section>
      <section className="contents contents-fold">
        <button
          className="contents-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <span>
            Inside the case <small>{items.length} cards</small>
          </span>
          <ChevronDown className={expanded ? "rotated" : ""} />
        </button>
        {expanded && (
          <>
            <div className="rarity-odds">
              {rarities.map((r) => (
                <span key={r} style={{ color: colors[r] }}>
                  {r}{" "}
                  <b>
                    {items
                      .filter((i) => i.rarity === r)
                      .reduce((s, i) => s + chance(ca, i.id), 0)
                      .toFixed(2)}
                    %
                  </b>
                </span>
              ))}
            </div>
            <div className="item-grid compact contents-grid">
              {items.some((i) => i.mystery) && (
                <ItemCard
                  hideValue
                  item={{
                    ...hiddenMystery(items.find((i) => i.mystery)!),
                    id: "mystery-group",
                    name: "Mystery Items",
                  }}
                  odds={items
                    .filter((i) => i.mystery)
                    .reduce((s, i) => s + chance(ca, i.id), 0)}
                >
                  <span className="micro">
                    {items.filter((i) => i.mystery).length} hidden cards
                    {ca.id === "epipen" ? " · 0.2% EACH" : ""}
                  </span>
                  <strong className="card-price">{ca.id==="epipen"?"100,000–200,000":"1,000,000"} SN</strong>
                </ItemCard>
              )}
              {items
                .filter((i) => !i.mystery)
                .sort(
                  (a, b) =>
                    rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity),
                )
                .slice(0, shownContents)
                .map((i) => (
                  <ItemCard key={i.id} item={i} odds={chance(ca, i.id)} />
                ))}
            </div>
            {items.length > shownContents && (
              <button
                className="small-button load-more"
                onClick={() => setShownContents((n) => n + 24)}
              >
                Load more · {shownContents} / {items.length}
              </button>
            )}
          </>
        )}
      </section>
    </>
  );
}
