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
  type Catalog,
  type Item,
} from "@/lib/catalog";
import type { Outcome } from "@/lib/types";
import { ItemArt, ItemCard } from "./item-card";
import { CustomCase } from "./custom-case";
import goonStyles from "./goon.module.css";
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
    [shownContents, setShownContents] = useState(24);
  const viewport = useRef<HTMLDivElement>(null),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    mounted = useRef(true),
    soundRef = useRef(sound),
    opening = useRef(false);
  soundRef.current = sound;
  useEffect(() => {
    mounted.current = true;
    setQuick(localStorage.getItem("spunk-quick") === "true");
    return () => {
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
  async function open() {
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
    const out = await run({ kind: "case", caseId: ca.id });
    if (!mounted.current) return;
    if (!out) {
      opening.current = false;
      setStage("idle");
      return;
    }
    const winner = catalog.items.find((i) => i.id === out.itemId);
    if (!winner) {
      opening.current = false;
      setStage("idle");
      onOutcome(out);
      return;
    }
    let cards: Item[] = [];
    while (cards.length < 46) cards.push(...shuffled(items));
    cards = cards.slice(0, 46);
    cards[37] = winner;
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
            onOutcome(out);
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
                    {c.id === "basic"
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
                      .toFixed(0)}
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
            setExpanded(false);
          }}
          disabled={active || busy}
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
              {ca.id === "satchel"
                ? "SOMETHING GOT OUT"
                : ca.id === "ash"
                  ? "FRESH OUT THE SMOKE"
                  : ca.id === "goon"
                    ? "FOR THE GOONERS"
                    : "THE ORIGINAL COLLECTION"}
            </span>
            <h1>{ca.name}</h1>
          </div>
          <span className="case-pill">1% MYTHIC</span>
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
            onClick={open}
            disabled={
              busy ||
              active ||
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
              {[...items]
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
