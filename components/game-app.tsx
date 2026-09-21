"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Layers,
  Backpack,
  ArrowUpRight,
  Coins,
  History,
  Volume2,
  VolumeX,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { seedCatalog, colors, cardValue } from "@/lib/catalog";
import type { State, Outcome } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { AuthDialog } from "./auth-dialog";
import { Leaderboard } from "./leaderboard";
import { CaseRoom } from "./case-room";
import { Collection } from "./collection";
import { Rewards } from "./rewards";
import { MysteryReveal } from "./mystery-reveal";
import { Minigame } from "./minigames";
import { HistoryView } from "./history";
import { ItemArt } from "./item-card";
import { useModalFocus } from "@/lib/use-modal-focus";
import {
  SocialRoom,
  NotificationBell,
  type SocialPage,
  type Target,
} from "./social-room";
type Page =
  | SocialPage
  | "home"
  | "cases"
  | "collection"
  | "inventory"
  | "upgrade"
  | "coin"
  | "history"
  | "leaderboard";
const nav: { id: Page; label: string; icon: typeof Box }[] = [
  { id: "home", label: "Home", icon: Box },
  { id: "cases", label: "Cases", icon: Box },
  { id: "collection", label: "Collection", icon: Layers },
  { id: "inventory", label: "Inventory", icon: Backpack },
  { id: "upgrade", label: "Upgrader", icon: ArrowUpRight },
  { id: "coin", label: "Coin Flip", icon: Coins },
  { id: "leaderboard", label: "Leaderboard", icon: Layers },
  { id: "trading", label: "Trading", icon: ArrowUpRight },
  { id: "battles", label: "Battles", icon: Box },
  { id: "notifications", label: "Notifications", icon: History },
  { id: "history", label: "History", icon: History },
];
export function GameApp() {
  const [target, setTarget] = useState<Target | null>(null);
  const [page, setPage] = useState<Page>("home"),
    [state, setState] = useState<State | null>(null),
    [auth, setAuth] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sync, setSync] = useState("Connecting…"),
    [menu, setMenu] = useState(false),
    [muted, setMuted] = useState(true),
    [outcome, setOutcome] = useState<Outcome | null>(null),
    [toast, setToast] = useState(""),
    [now, setNow] = useState(Date.now());
  const clock = useRef({ server: Date.now(), mono: 0 }),
    lock = useRef(false),
    pending = useRef<Record<string, unknown> | null>(null),
    stateRef = useRef<State | null>(null),
    audio = useRef<AudioContext | null>(null),
    revision = useRef(0),
    refreshSequence = useRef(0),
    coinHold = useRef(false),
    heldCoin = useRef<Outcome | null>(null);
  useModalFocus(auth || !!outcome, () => {
    setAuth(false);
    setOutcome(null);
  });
  const catalog = state?.catalog ?? seedCatalog;
  const refresh = useCallback(async () => {
    const version = revision.current,
      sequence = ++refreshSequence.current;
    try {
      const s = await api<State>("state");
      if (
        coinHold.current ||
        version !== revision.current ||
        sequence !== refreshSequence.current
      )
        return null;
      stateRef.current = s;
      setState(s);
      clock.current = {
        server: new Date(s.serverTime).getTime(),
        mono: performance.now(),
      };
      setSync("Progress saved");
      return s;
    } catch (e) {
      if (
        coinHold.current ||
        version !== revision.current ||
        sequence !== refreshSequence.current
      )
        return null;
      if (e instanceof ApiError && e.status === 401) {
        stateRef.current = null;
        setState(null);
        setSync("Sign in to save your collection");
      } else {
        setSync("Connection unavailable");
        setError((e as Error).message);
      }
      return null;
    }
  }, []);
  useEffect(() => {
    clock.current.mono = performance.now();
    setMuted(localStorage.getItem("spunk-muted") !== "false");
    const saved = sessionStorage.getItem("spunk-pending");
    if (saved) {
      try {
        pending.current = JSON.parse(saved);
        setError(
          "A previous request needs checking. Use Reconnect & recover to retrieve its saved result.",
        );
      } catch {
        sessionStorage.removeItem("spunk-pending");
      }
    }
    void refresh();
    const tick = setInterval(
      () =>
        setNow(clock.current.server + performance.now() - clock.current.mono),
      1000,
    );
    const poll = setInterval(() => {
      if (!document.hidden && !lock.current) void refresh();
    }, 30000);
    const focus = () => {
      if (!lock.current) void refresh();
    };
    const hash = () => {
      const id = location.hash.slice(1);
      if (nav.some((n) => n.id === id)) setPage(id as Page);
    };
    hash();
    window.addEventListener("hashchange", hash);
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener("focus", focus);
      window.removeEventListener("hashchange", hash);
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const sound = (win = false) => {
    if (muted) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      const ctx = audio.current;
      for (let i = 0; i < (win ? 3 : 1); i++) {
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.type = win ? "sine" : "triangle";
        oscillator.frequency.value = (win ? 440 : 980) * [1, 1.25, 1.5][i];
        gain.gain.setValueAtTime(0.025, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.08 + (win ? 0.2 : 0.025),
        );
        oscillator.start(ctx.currentTime + i * 0.08);
        oscillator.stop(ctx.currentTime + i * 0.08 + (win ? 0.21 : 0.03));
      }
    } catch {}
  };
  const finishCoin = useCallback(() => {
    const out = heldCoin.current;
    if (!out) return;
    heldCoin.current = null;
    coinHold.current = false;
    if (stateRef.current) {
      const updated = {
        ...stateRef.current,
        player: { ...stateRef.current.player, balance: out.balance },
      };
      stateRef.current = updated;
      setState(updated);
    }
    lock.current = false;
    setBusy(false);
    void refresh();
  }, [refresh]);
  async function run(body: Record<string, unknown>): Promise<Outcome | null> {
    if (!stateRef.current) {
      setAuth(true);
      return null;
    }
    if (lock.current) return null;
    if (pending.current) {
      setError("Recover your previous request before starting another game.");
      return null;
    }
    lock.current = true;
    revision.current++;
    coinHold.current = body.kind === "coin";
    setBusy(true);
    setError("");
    const request = {
      ...body,
      key: crypto.randomUUID(),
      playerId: stateRef.current.player.id,
    };
    pending.current = request;
    sessionStorage.setItem("spunk-pending", JSON.stringify(request));
    try {
      const out = await api<Outcome>(
        body.kind === "social"
          ? "social"
          : body.kind === "battle"
            ? "battle"
            : "play",
        request,
      );
      pending.current = null;
      sessionStorage.removeItem("spunk-pending");
      if (body.kind === "coin") {
        heldCoin.current = out;
        return out;
      }
      if (stateRef.current) {
        const updated = {
          ...stateRef.current,
          player: { ...stateRef.current.player, balance: out.balance },
        };
        stateRef.current = updated;
        setState(updated);
      }
      void refresh();
      return out;
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status < 500) {
        pending.current = null;
        sessionStorage.removeItem("spunk-pending");
      }
      return null;
    } finally {
      if (!heldCoin.current) {
        coinHold.current = false;
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function recover() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const s = await refresh();
      if (!s) {
        setAuth(true);
        return;
      }
      if (pending.current) {
        if (pending.current.playerId !== s.player.id) {
          setError(
            "Sign in to the player who started the pending action to recover it.",
          );
          return;
        }
        const out = await api<Outcome>(
          pending.current.kind === "social"
            ? "social"
            : pending.current.kind === "battle"
              ? "battle"
              : "play",
          pending.current,
        );
        pending.current = null;
        sessionStorage.removeItem("spunk-pending");
        await refresh();
        if (out.kind === "case") setOutcome(out);
        else
          setToast(
            "Recovered saved result: " +
              (out.won === undefined
                ? "action completed"
                : out.won
                  ? "WIN"
                  : "LOSS") +
              ". Balance " +
              out.balance.toLocaleString("en-GB") +
              " SN.",
          );
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status < 500) {
        pending.current = null;
        sessionStorage.removeItem("spunk-pending");
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const navigate = (id: Page) => {
    if (busy) return;
    setPage(id);
    setMenu(false);
    location.hash = id;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const wonItem =
    outcome?.item ??
    (outcome?.itemId
      ? catalog.items.find((i) => i.id === outcome.itemId)
      : null);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => navigate("home")}>
          <span className="brand-mark glue-logo">
            S<span>✦</span>
          </span>
          <span>
            SPUNK<span className="brand-second">CASES</span>
          </span>
        </a>
        <div className="balance-block">
          <span>SPUNK NUGGET BALANCE</span>
          <strong>
            <i className="nugget" />
            {state ? state.player.balance.toLocaleString("en-GB") : "—"}{" "}
            <small>SN</small>
          </strong>
        </div>
        <button
          className="icon-button sound"
          onClick={() => {
            setMuted(!muted);
            localStorage.setItem("spunk-muted", String(!muted));
          }}
          aria-label={muted ? "Enable sound" : "Mute sound"}
        >
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
        {state ? (
          <div className="profile">
            <NotificationBell
              playerId={state.player.id}
              version={state.serverTime}
              onOpen={() => navigate("notifications")}
            />
            <span className="avatar">
              {state.player.name.slice(0, 1).toUpperCase()}
            </span>
            <span>{state.player.name}</span>
            <button
              className="icon-button"
              disabled={busy}
              aria-label="Sign out"
              onClick={async () => {
                try {
                  revision.current++;
                  await api("logout", {});
                  setState(null);
                  setTarget(null);
                  stateRef.current = null;
                  setSync("Signed out — your progress is saved");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            className="small-button sign-in"
            onClick={() => setAuth(true)}
          >
            Sign in <ArrowUpRight size={16} />
          </button>
        )}
        <button
          className="icon-button mobile-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Menu />
        </button>
      </header>
      <nav
        className={"navigation " + (menu ? "expanded" : "")}
        aria-label="Main navigation"
      >
        {nav.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            disabled={busy}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={17} />
            {n.label}
          </button>
        ))}
        <a
          className="free-link"
          href="#rewards"
          onClick={() => setPage("home")}
        >
          <span>✦</span> FREE NUGGETS
        </a>
      </nav>
      <main>
        <div className="status-bar">
          <span>
            <ShieldCheck size={14} />
            {sync}
          </span>
          <button className="text-link" onClick={recover} disabled={busy}>
            <RefreshCw size={13} /> Reconnect & recover
          </button>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            <p>{error}</p>
            <button onClick={recover} disabled={busy}>
              Reconnect & recover
            </button>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {(page === "home" || page === "cases") && (
          <>
            <CaseRoom
              key={state?.player.id ?? "guest"}
              balance={state?.player.balance ?? 0}
              catalog={catalog}
              run={run}
              busy={busy}
              signedIn={!!state}
              onAuth={() => setAuth(true)}
              sound={sound}
              onOutcome={setOutcome}
            />
            <Rewards
              state={state}
              settings={catalog.settings}
              now={now}
              busy={busy}
              onClaim={async (kind) => {
                const result = await run({ kind });
                if (result)
                  setToast(
                    "Claimed +" +
                      result.rewards
                        .reduce((s, r) => s + r.amount, 0)
                        .toLocaleString("en-GB") +
                      " Spunk Nuggets. Saved!",
                  );
              }}
            />
            <section className="recent-wins">
              <div className="section-top">
                <h2>Fresh from the reel</h2>
                <span className="micro muted">RECENT DISCOVERIES</span>
              </div>
              {state?.recent.length ? (
                <div className="recent-feed">
                  {state.recent.map((w, i) => {
                    const item = catalog.items.find((x) => x.id === w.item_id);
                    return (
                      item && (
                        <article
                          key={i}
                          style={
                            {
                              "--rarity": colors[item.rarity],
                            } as React.CSSProperties
                          }
                        >
                          <ItemArt item={item} />
                          <div>
                            <span>{w.name} found</span>
                            <strong>{item.name}</strong>
                            <small style={{ color: colors[item.rarity] }}>
                              {item.rarity}
                            </small>
                          </div>
                        </article>
                      )
                    );
                  })}
                </div>
              ) : (
                <p className="empty small">
                  {state
                    ? "The reel is quiet. Be the first to make a discovery."
                    : "Sign in to see what your friends have found."}
                </p>
              )}
            </section>
          </>
        )}
        {(page === "collection" || page === "inventory") && (
          <Collection
            state={state}
            catalog={catalog}
            run={run}
            busy={busy}
            inventoryOnly={page === "inventory"}
          />
        )}
        {(page === "upgrade" || page === "coin") && (
          <Minigame
            key={page}
            kind={page}
            onLanded={finishCoin}
            state={state}
            catalog={catalog}
            settings={catalog.settings}
            run={run}
            busy={busy}
            signedIn={!!state}
            onAuth={() => setAuth(true)}
            sound={sound}
          />
        )}
        {page === "leaderboard" && (
          <Leaderboard state={state} onPlayer={setTarget} />
        )}
        {state && (
          <SocialRoom
            key={state.player.id}
            state={state}
            page={
              page === "trading" ||
              page === "battles" ||
              page === "notifications"
                ? page
                : undefined
            }
            target={target}
            setTarget={setTarget}
            navigate={navigate}
            run={run}
            busy={busy}
          />
        )}
        {!state &&
          (page === "trading" ||
            page === "battles" ||
            page === "notifications") && (
            <p className="empty">
              Sign in to trade, battle and view notifications.
            </p>
          )}
        {page === "history" && <HistoryView state={state} />}
      </main>
      <footer>
        <a href="#home" className="footer-brand">
          SPUNK CASES<span>✦</span>
        </a>
        <a href="/admin">
          Admin Mode <ArrowUpRight size={14} />
        </a>
      </footer>
      {auth && (
        <AuthDialog
          onClose={() => setAuth(false)}
          onSuccess={() => {
            setAuth(false);
            void refresh();
          }}
        />
      )}
      {outcome && wonItem?.mystery && (
        <MysteryReveal
          key={outcome.id}
          item={wonItem}
          onClose={() => setOutcome(null)}
        />
      )}
      {outcome && wonItem && !wonItem.mystery && (
        <div className="modal-backdrop">
          <section
            className={"reveal-modal " + wonItem.rarity.toLowerCase()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reveal-title"
            style={
              { "--rarity": colors[wonItem.rarity] } as React.CSSProperties
            }
          >
            <span className="eyebrow">
              {outcome.duplicate ? "DUPLICATE!" : "NEW ITEM DISCOVERED!"}
            </span>
            <div className="reveal-art">
              <ItemArt item={wonItem} large />
            </div>
            <span className="rarity">{wonItem.rarity}</span>
            <h2 id="reveal-title">{wonItem.name}</h2>
            <p>{cardValue(wonItem).toLocaleString("en-GB")} SN card value</p>
            <div className="reveal-rewards">
              {outcome.rewards.map((r, i) => (
                <div key={i}>
                  <span>{r.label}</span>
                  <strong>+{r.amount.toLocaleString("en-GB")} SN</strong>
                </div>
              ))}
            </div>
            <p className="micro">✓ SAVED TO YOUR COLLECTION</p>
            <button
              className="primary full"
              autoFocus
              onClick={() => setOutcome(null)}
            >
              Collect item <ArrowUpRight size={18} />
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={19} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
