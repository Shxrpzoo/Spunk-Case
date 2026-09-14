"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Sparkles, LockKeyhole } from "lucide-react";
import {
  rarities,
  chance,
  colors,
  type Catalog,
  type Item,
} from "@/lib/catalog";
import type { Outcome } from "@/lib/types";
import { ItemArt, ItemCard } from "./item-card";
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
  const [caseId, setCaseId] = useState("basic"),
    [quick, setQuick] = useState(false),
    [spinning, setSpinning] = useState(false),
    [travel, setTravel] = useState(0),
    [duration, setDuration] = useState(0),
    [reel, setReel] = useState<Item[]>([]);
  const viewport = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setQuick(localStorage.getItem("spunk-quick") === "true");
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (spinning || !reel.length || !viewport.current) return;
    const centre = () => {
      const first = viewport.current?.querySelector<HTMLElement>(".reel-item");
      if (!first || !viewport.current) return;
      const step = first.getBoundingClientRect().width + 16;
      setDuration(0);
      setTravel(-(35 * step + step / 2 - 8 - viewport.current.clientWidth / 2));
    };
    centre();
    const observer = new ResizeObserver(centre);
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [spinning, reel]);
  const ca =
    catalog.cases.find((c) => c.id === caseId && c.enabled) ??
    catalog.cases.find((c) => c.enabled);
  const items = ca
    ? catalog.items.filter((i) => ca.weights.some((w) => w.itemId === i.id))
    : [];
  const showcase = [
    "wonkey-ash",
    "angry-ash",
    "ttg-nip-slip",
    "mini-men",
    "drag-ttg",
  ]
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is Item => !!i);
  const shown = reel.length
    ? reel
    : showcase.length
      ? showcase
      : items.slice(0, 5);
  async function open() {
    if (!signedIn) {
      onAuth();
      return;
    }
    if (!ca || busy || spinning || balance < ca.price) return;
    setSpinning(true);
    const result = await run({ kind: "case", caseId: ca.id });
    if (!result) {
      setSpinning(false);
      return;
    }
    const winner = catalog.items.find((i) => i.id === result.itemId)!;
    const cards = Array.from(
      { length: 42 },
      (_, i) =>
        items[
          (i * 7 + Math.floor(Math.random() * items.length)) % items.length
        ],
    );
    cards[35] = winner;
    setReel(cards);
    setDuration(0);
    setTravel(0);
    const fast =
      quick || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = fast ? 450 : 4200;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const first =
          viewport.current?.querySelector<HTMLElement>(".reel-item");
        const step = (first?.getBoundingClientRect().width ?? 180) + 16;
        const width = viewport.current?.clientWidth ?? 900;
        setDuration(ms);
        setTravel(-(35 * step + step / 2 - 8 - width / 2));
        sound();
      }),
    );
    timer.current = setTimeout(() => {
      setSpinning(false);
      sound(true);
      onOutcome(result);
    }, ms + 100);
  }
  if (!ca)
    return (
      <section className="panel">
        <h2>No cases are open right now.</h2>
        <p>The owner can enable cases in Admin Mode.</p>
      </section>
    );
  return (
    <>
      <div className="section-top">
        <span className="eyebrow">
          <Sparkles size={15} /> THE ORIGINAL COLLECTION
        </span>
        <span className="muted micro">{items.length} ITEMS · 6 RARITIES</span>
      </div>
      <section className="case-room">
        <div className="case-heading">
          <div>
            <p className="eyebrow">OPEN. COLLECT. GET ABSURDLY LUCKY.</p>
            <h1>
              SMALL CASE.
              <br />
              <span>BIG CHARACTERS.</span>
            </h1>
          </div>
          <div className="case-label">
            <span className="edition">01 / ORIGINALS</span>
            <strong>{ca.name}</strong>
            {catalog.cases.filter((c) => c.enabled).length > 1 && (
              <label className="micro">
                Choose case
                <select
                  value={ca.id}
                  onChange={(e) => {
                    setCaseId(e.target.value);
                    setReel([]);
                  }}
                  disabled={spinning}
                >
                  {catalog.cases
                    .filter((c) => c.enabled)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
        </div>
        <div
          className={"reel-window " + (spinning ? "spinning" : "")}
          ref={viewport}
        >
          <div className="reel-centre">
            <ChevronDown />
            <div />
          </div>
          <div
            className={"reel " + (!reel.length ? "resting" : "")}
            style={{
              transform: `translateX(${travel}px)`,
              transition: duration
                ? `transform ${duration}ms cubic-bezier(.12,.72,.14,1)`
                : "none",
            }}
          >
            {shown.map((item, i) => (
              <div
                className="reel-item"
                style={
                  { "--rarity": colors[item.rarity] } as React.CSSProperties
                }
                key={i}
              >
                <ItemArt item={item} />
                <span>{item.rarity}</span>
                <strong>{item.name}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="case-controls">
          <div className="cost">
            <span>CASE PRICE</span>
            <strong>
              <i className="nugget" />
              {ca.price.toLocaleString("en-GB")} <small>SN</small>
            </strong>
          </div>
          <button
            className="primary open-case"
            onClick={open}
            disabled={busy || spinning || (signedIn && balance < ca.price)}
          >
            {spinning ? "Opening case…" : "OPEN CASE"}
            <ArrowUpRight size={22} />
          </button>
          <label className="quick">
            <input
              type="checkbox"
              checked={quick}
              onChange={(e) => {
                setQuick(e.target.checked);
                localStorage.setItem("spunk-quick", String(e.target.checked));
              }}
            />
            Quick open
          </label>
        </div>
        {signedIn && balance < ca.price && (
          <div className="insufficient" role="status">
            <strong>NOT ENOUGH SPUNK NUGGETS</strong>
            <span>
              You need {ca.price.toLocaleString("en-GB")} SN. You have{" "}
              {balance.toLocaleString("en-GB")} SN.
            </span>
            <div>
              <a href="#rewards">Free nuggets & daily reward</a>
              <a href="#upgrade">Upgrader</a>
              <a href="#coin">Coin Flip</a>
            </div>
          </div>
        )}
        <div className="case-foot">
          <LockKeyhole size={13} />
          <span>
            {signedIn
              ? "Every result is saved before the reveal."
              : "Sign in to start with " +
                catalog.settings.startingBalance.toLocaleString("en-GB") +
                " free Spunk Nuggets."}
          </span>
          <span>100% FICTIONAL. 0% CASH VALUE.</span>
        </div>
      </section>
      <section className="contents">
        <div className="section-top">
          <h2>
            Inside the case <span>{items.length}</span>
          </h2>
          <a href="#odds" className="text-link">
            Every item. Every chance. <ChevronDown size={15} />
          </a>
        </div>
        <div className="rarity-odds" id="odds">
          {(
            [
              "COMMON",
              "UNCOMMON",
              "RARE",
              "EPIC",
              "LEGENDARY",
              "MYTHIC",
            ] as const
          ).map((r) => (
            <span key={r} style={{ color: colors[r] }}>
              {r}{" "}
              <b>
                {items
                  .filter((i) => i.rarity === r)
                  .reduce((sum, i) => sum + chance(ca, i.id), 0)
                  .toFixed(2)}
                %
              </b>
            </span>
          ))}
        </div>
        <div className="item-grid">
          {[...items]
            .sort(
              (a, b) =>
                rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity) ||
                chance(ca, a.id) - chance(ca, b.id),
            )
            .map((item) => (
              <ItemCard key={item.id} item={item} odds={chance(ca, item.id)} />
            ))}
        </div>
      </section>
    </>
  );
}
