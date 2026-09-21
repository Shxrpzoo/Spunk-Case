"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  ArrowLeftRight,
  Swords,
  Coins,
  X,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { cardValue, type Item } from "@/lib/catalog";
import type { State, Outcome, CardStack } from "@/lib/types";
import {
  stackKey,
  type Trade,
  type TradeSide,
  type TradeInventory,
  type TradeInbox,
  type NotificationInbox,
} from "@/lib/trading";
import { BATTLE_FEE, type Battle, type BattleInbox } from "@/lib/battles";
import { useModalFocus } from "@/lib/use-modal-focus";
import { ItemCard } from "./item-card";
import { CustomCase } from "./custom-case";
import styles from "./social.module.css";
export type SocialPage = "trading" | "battles" | "notifications";
export type Target = { id: string; name: string };
type Run = (body: Record<string, unknown>) => Promise<Outcome | null>;
const fmt = (n: number) => n.toLocaleString("en-GB");
const empty = (): TradeSide => ({ nuggets: 0, cards: [] });
export function NotificationBell({
  playerId,
  onOpen,
  version,
}: {
  playerId: string;
  onOpen: () => void;
  version: string;
}) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const r = await api<NotificationInbox>("notifications");
        if (active) setUnread(r.unread);
      } catch {}
    };
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [playerId, version]);
  return (
    <button
      className={"icon-button " + styles.bell}
      onClick={onOpen}
      aria-label={`Notifications, ${unread} unread`}
    >
      <Bell size={20} />
      {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
    </button>
  );
}
function SidePicker({
  title,
  inventory,
  side,
  setSide,
}: {
  title: string;
  inventory: TradeInventory;
  side: TradeSide;
  setSide: (s: TradeSide) => void;
}) {
  const [search, setSearch] = useState("");
  const count = side.cards.reduce((n, c) => n + c.quantity, 0);
  return (
    <section className={styles.picker}>
      <h3>
        {title} <small>{count}/5 cards</small>
      </h3>
      <label>
        Spunk Nuggets{" "}
        <input
          type="number"
          min={0}
          max={inventory.player.balance}
          step={1}
          value={side.nuggets}
          onChange={(e) =>
            setSide({ ...side, nuggets: Number(e.target.value) })
          }
        />
        <small>{fmt(inventory.player.balance)} SN available</small>
      </label>
      <input
        aria-label={title + " search"}
        placeholder="Search cards or effects…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={styles.pickGrid}>
        {inventory.cards
          .filter((c) => {
            const item = inventory.items.find((i) => i.id === c.item_id);
            return (
              item &&
              (item.name + " " + c.effect)
                .toLowerCase()
                .includes(search.toLowerCase())
            );
          })
          .map((c) => {
            const item = inventory.items.find((i) => i.id === c.item_id)!,
              key = stackKey(c),
              selected =
                side.cards.find((x) => stackKey(x) === key)?.quantity ?? 0;
            return (
              <div key={key} className={selected ? styles.selected : ""}>
                <ItemCard item={item} effect={c.effect} quantity={c.quantity} />
                <label>
                  Copies{" "}
                  <select
                    aria-label={
                      title + " " + item.name + " " + c.effect + " copies"
                    }
                    value={selected}
                    onChange={(e) => {
                      const quantity = Number(e.target.value);
                      setSide({
                        ...side,
                        cards: [
                          ...side.cards.filter((x) => stackKey(x) !== key),
                          ...(quantity ? [{ ...c, quantity }] : []),
                        ],
                      });
                    }}
                  >
                    {Array.from(
                      {
                        length: Math.min(c.quantity, 5 - count + selected) + 1,
                      },
                      (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            );
          })}
        {!inventory.cards.length && <p>No cards currently owned.</p>}
      </div>
    </section>
  );
}
function SidePreview({
  title,
  side,
  items,
}: {
  title: string;
  side: TradeSide;
  items: Item[];
}) {
  return (
    <section>
      <h3>{title}</h3>
      <strong className="lime">{fmt(side.nuggets)} SN</strong>
      <div className={styles.previewCards}>
        {side.cards.map((c) => {
          const item = items.find((i) => i.id === c.item_id);
          return item ? (
            <ItemCard
              key={stackKey(c)}
              item={item}
              effect={c.effect}
              quantity={c.quantity}
            />
          ) : (
            <p key={stackKey(c)}>Unavailable card</p>
          );
        })}
      </div>
      {!side.cards.length && <p>No cards</p>}
    </section>
  );
}
export function SocialRoom({
  state,
  page,
  target,
  setTarget,
  navigate,
  run,
  busy,
}: {
  state: State;
  page?: SocialPage;
  target: Target | null;
  setTarget: (t: Target | null) => void;
  navigate: (p: SocialPage) => void;
  run: Run;
  busy: boolean;
}) {
  const [mode, setMode] = useState<"menu" | "trade" | "gift" | "battle">(
      "menu",
    ),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [pageNo, setPageNo] = useState(0),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<TradeInbox | null>(null),
    [battles, setBattles] = useState<BattleInbox | null>(null),
    [notices, setNotices] = useState<NotificationInbox | null>(null),
    [inventory, setInventory] = useState<TradeInventory | null>(null);
  const [give, setGive] = useState<TradeSide>(empty),
    [receive, setReceive] = useState<TradeSide>(empty),
    [gift, setGift] = useState("100"),
    [counter, setCounter] = useState<Trade | null>(null),
    [detail, setDetail] = useState<{ trade: Trade; items: Item[] } | null>(
      null,
    ),
    [battle, setBattle] = useState<Battle | null>(null),
    [battleMode, setBattleMode] = useState<"normal" | "crazy">("normal"),
    [caseIds, setCaseIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const localLock = useRef(false);
  const pendingCounter = useRef<Trade|null>(null);
  const close = () => {
    if (busy || sending) return;
    setTarget(null);
    setDetail(null);
    setBattle(null);
    setCounter(null);
    setError("");
  };
  useModalFocus(!!target || !!detail || !!battle, close);
  useEffect(() => {
    setPageNo(0);
    setError("");
  }, [page]);
  useEffect(() => {
    const t=pendingCounter.current;pendingCounter.current=null;
    setMode(t?"trade":"menu");
    setInventory(null);
    setGive(t?(t.party_a===state.player.id?t.proposal.a:t.proposal.b):empty());
    setReceive(t?(t.party_a===state.player.id?t.proposal.b:t.proposal.a):empty());
    setGift("100");
    setCaseIds([]);
    setCounter(t);
    setError("");
  }, [target?.id]);
  useEffect(() => {
    if (!target) return;
    let alive = true;
    void api<TradeInventory>(
      "trade-inventory?id=" + encodeURIComponent(target.id),
    )
      .then((r) => {
        if (alive) setInventory(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [target?.id, state.serverTime]);
  useEffect(() => {
    if (!page) return;
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      setLoading(true);
      try {
        if (page === "trading") {
          const r = await api<TradeInbox>("trades?page=" + pageNo);
          if (alive) setTrades(r);
        }
        if (page === "battles") {
          const r = await api<BattleInbox>("battles?page=" + pageNo);
          if (alive) setBattles(r);
        }
        if (page === "notifications") {
          const r = await api<NotificationInbox>(
            "notifications?page=" + pageNo,
          );
          if (alive) setNotices(r);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [page, pageNo, version, state.player.id]);
  async function act(
    body: Record<string, unknown>,
    after?: (out: Outcome) => Promise<void> | void,
  ) {
    if (localLock.current || busy) return;
    localLock.current = true;
    setSending(true);
    setError("");
    try {
      const out = await run(body);
      if (out) {
        setVersion((v) => v + 1);
        await after?.(out);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      localLock.current = false;
      setSending(false);
    }
  }
  async function openTrade(id: string) {
    try {
      setDetail(await api("trade?id=" + encodeURIComponent(id)));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function openBattle(id: string) {
    try {
      setBattle(await api("battle?id=" + encodeURIComponent(id)));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const disabled = busy || sending,
    ownInventory: TradeInventory = {
      player: state.player,
      cards: state.cards,
      items: state.catalog.items,
    };
  const title =
    page === "trading"
      ? "THE TRADING DESK."
      : page === "battles"
        ? "CASE BATTLES."
        : "YOUR NOTIFICATIONS.";
  return (
    <>
      {page && (
        <section className="page-section">
          <div className="page-title">
            <div>
              <span className="eyebrow">PLAY TOGETHER</span>
              <h1>{title}</h1>
              <p>
                {page === "trading"
                  ? "Swap up to five cards per side, with Spunk Nuggets. Offers stay open until answered — there is no expiry."
                  : page === "battles"
                    ? "One million SN each. One to five cases. Every card Epic or better. Normal: highest total wins. Crazy: lowest total wins."
                    : "Trade offers, battle challenges and gifts, saved in one place."}
              </p>
            </div>
          </div>
          <div className={styles.toolbar}>
            <button
              className="small-button"
              onClick={() => {
                location.hash = "leaderboard";
              }}
            >
              Find a player
            </button>
            <button
              className="text-link"
              disabled={loading || disabled}
              onClick={() => setVersion((v) => v + 1)}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
            {page === "notifications" &&
              !!notices?.notifications.some((n) => !n.read_at) && (
                <button
                  className="text-link"
                  onClick={async () => {
                    try {
                      await api("notifications/read", {
                        ids: notices.notifications.map((n) => n.id),
                      });
                      setVersion((v) => v + 1);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Mark this page read
                </button>
              )}
          </div>
          {message && (
            <p className={styles.success} role="status">
              {message}
            </p>
          )}
          {error && !target && !detail && !battle && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <div className={styles.inbox}>
            {page === "trading" &&
              trades?.trades.map((t) => (
                <button
                  key={t.id}
                  className={styles.inboxRow}
                  onClick={() => void openTrade(t.id)}
                >
                  <ArrowLeftRight />
                  <span>
                    <strong>
                      {t.party_a === state.player.id ? t.b_name : t.a_name}
                    </strong>
                    <small>
                      {t.status === "pending"
                        ? t.awaiting_id === state.player.id
                          ? "Your response needed"
                          : "Waiting for their response"
                        : t.status}{" "}
                      · Offer {t.revision}
                    </small>
                  </span>
                  <span>{new Date(t.updated_at).toLocaleString("en-GB")}</span>
                </button>
              ))}
            {page === "battles" &&
              battles?.battles.map((b) => (
                <button
                  key={b.id}
                  className={styles.inboxRow}
                  onClick={() => void openBattle(b.id)}
                >
                  <Swords />
                  <span>
                    <strong>
                      {b.challenger_id === state.player.id
                        ? b.opponent_name
                        : b.challenger_name}
                    </strong>
                    <small>
                      {b.mode.toUpperCase()} · {b.cases.length} rounds ·{" "}
                      {b.status === "pending"
                        ? b.opponent_id === state.player.id
                          ? "Your response needed"
                          : "Waiting for opponent"
                        : b.status}
                    </small>
                  </span>
                  <span>{fmt(b.entry_fee)} SN</span>
                </button>
              ))}
            {page === "notifications" &&
              notices?.notifications.map((n) => (
                <button
                  key={n.id}
                  className={
                    styles.inboxRow + " " + (!n.read_at ? styles.unread : "")
                  }
                  onClick={async () => {
                    try {
                      await api("notifications/read", { ids: [n.id] });
                      setVersion((v) => v + 1);
                      if (n.trade_id) await openTrade(n.trade_id);
                      else if (n.battle_id) await openBattle(n.battle_id);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Bell />
                  <span>
                    <strong>{n.title}</strong>
                    <small>
                      {new Date(n.created_at).toLocaleString("en-GB")}
                    </small>
                  </span>
                  {!n.read_at && <i className={styles.dot} />}
                </button>
              ))}
            {!loading &&
              ((page === "trading" && trades?.total === 0) ||
                (page === "battles" && battles?.total === 0) ||
                (page === "notifications" &&
                  notices?.notifications.length === 0)) && (
                <p className="empty">
                  Nothing here yet. Choose a player on the leaderboard to get
                  started.
                </p>
              )}
            {loading && <p className="micro">Refreshing…</p>}
          </div>
          <div className={styles.toolbar}>
            <button
              className="small-button"
              disabled={pageNo === 0}
              onClick={() => setPageNo((n) => n - 1)}
            >
              Previous
            </button>
            <span>Page {pageNo + 1}</span>
            <button
              className="small-button"
              disabled={
                page === "trading"
                  ? (pageNo + 1) * 30 >= (trades?.total ?? 0)
                  : page === "battles"
                    ? (pageNo + 1) * 20 >= (battles?.total ?? 0)
                    : (notices?.notifications.length ?? 0) < 30
              }
              onClick={() => setPageNo((n) => n + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}
      {(target || detail || battle) && (
        <div className="modal-backdrop">
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="social-title"
          >
            <button
              className={"icon-button " + styles.close}
              disabled={disabled}
              onClick={close}
              aria-label="Close"
            >
              <X />
            </button>
            {error && (
              <p className="error-banner" role="alert">
                {error}
              </p>
            )}
            {target && (
              <>
                <span className="eyebrow">PLAYER ACTIONS</span>
                <h2 id="social-title">{target.name}</h2>
                {mode === "menu" ? (
                  <div className={styles.actions}>
                    <button onClick={() => setMode("trade")}>
                      <ArrowLeftRight />
                      <strong>Offer a trade</strong>
                      <span>Cards + Spunk Nuggets</span>
                    </button>
                    <button onClick={() => setMode("gift")}>
                      <Coins />
                      <strong>Send Nuggets</strong>
                      <span>A gift straight to their balance</span>
                    </button>
                    <button onClick={() => setMode("battle")}>
                      <Swords />
                      <strong>Challenge to battle</strong>
                      <span>Normal or Crazy · 1,000,000 SN each</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="text-link"
                      disabled={disabled}
                      onClick={() => setMode("menu")}
                    >
                      ← Player actions
                    </button>
                    {mode === "trade" && (
                      <>
                        <h3>
                          {counter ? "Make a counteroffer" : "Build your offer"}
                        </h3>
                        <p>
                          Cards remain usable until acceptance. Both inventories
                          and balances are checked again when the offer is
                          accepted.
                        </p>
                        {inventory ? (
                          <>
                            <div className={styles.twoColumns}>
                              <SidePicker
                                title="You give"
                                inventory={ownInventory}
                                side={give}
                                setSide={setGive}
                              />
                              <SidePicker
                                title="You request"
                                inventory={inventory}
                                side={receive}
                                setSide={setReceive}
                              />
                            </div>
                            <button
                              className="primary full"
                              disabled={disabled}
                              onClick={() =>
                                void act(
                                  {
                                    kind: "social",
                                    ...(counter
                                      ? {
                                          action: "counter",
                                          tradeId: counter.id,
                                          revision: counter.revision,
                                        }
                                      : {
                                          action: "offer",
                                          recipientId: target.id,
                                        }),
                                    give,
                                    receive,
                                  },
                                  () => {
                                    setTarget(null);
                                    setCounter(null);
                                    setMessage(
                                      "Offer sent. It stays open until answered.",
                                    );
                                    navigate("trading");
                                  },
                                )
                              }
                            >
                              {counter
                                ? "Send counteroffer"
                                : "Send trade offer"}
                            </button>
                          </>
                        ) : (
                          <p>Loading current inventory…</p>
                        )}
                      </>
                    )}
                    {mode === "gift" && (
                      <div className={styles.gift}>
                        <label>
                          Spunk Nuggets to send
                          <input
                            type="number"
                            min={1}
                            max={state.player.balance}
                            step={1}
                            value={gift}
                            onChange={(e) => setGift(e.target.value)}
                          />
                        </label>
                        <p>
                          Your balance: {fmt(state.player.balance)} SN. Gifts
                          transfer immediately.
                        </p>
                        <button
                          className="primary"
                          disabled={
                            disabled ||
                            !Number.isSafeInteger(Number(gift)) ||
                            Number(gift) < 1 ||
                            Number(gift) > state.player.balance
                          }
                          onClick={() =>
                            void act(
                              {
                                kind: "social",
                                action: "gift",
                                recipientId: target.id,
                                amount: Number(gift),
                              },
                              () => {
                                setTarget(null);
                                setMessage("Spunk Nuggets sent and saved.");
                                navigate("trading");
                              },
                            )
                          }
                        >
                          Send {fmt(Number(gift) || 0)} SN to {target.name}
                        </button>
                      </div>
                    )}
                    {mode === "battle" && (
                      <>
                        <h3>Build a battle</h3>
                        <div className="segmented">
                          <button
                            className={
                              battleMode === "normal" ? "selected" : ""
                            }
                            onClick={() => setBattleMode("normal")}
                          >
                            Normal · Highest wins
                          </button>
                          <button
                            className={battleMode === "crazy" ? "selected" : ""}
                            onClick={() => setBattleMode("crazy")}
                          >
                            Crazy · Lowest wins
                          </button>
                        </div>
                        <p>
                          <b>1,000,000 SN per player</b> covers all selected
                          cases. Epic+ only, with original odds reweighted among
                          eligible cards. A decline refunds you. On a tie, you
                          each keep your own cards; entry fees stay spent.
                        </p>
                        <div className={styles.caseChoices}>
                          {state.catalog.cases
                            .filter((c) => c.enabled)
                            .map((c) => (
                              <button
                                key={c.id}
                                disabled={caseIds.length === 5 || disabled}
                                onClick={() => setCaseIds((v) => [...v, c.id])}
                              >
                                <CustomCase
                                  ash={c.id === "ash"}
                                  satchel={c.id === "satchel"}
                                  goon={c.id === "goon"}
                                  epipen={c.id === "epipen"}
                                />
                                <strong>{c.name}</strong>
                                <small>Add round +</small>
                              </button>
                            ))}
                        </div>
                        <div className={styles.roundChips}>
                          {caseIds.map((id, n) => (
                            <button
                              key={n}
                              disabled={disabled}
                              onClick={() =>
                                setCaseIds((v) => v.filter((_, i) => i !== n))
                              }
                            >
                              {n + 1}.{" "}
                              {
                                state.catalog.cases.find((c) => c.id === id)
                                  ?.name
                              }{" "}
                              ×
                            </button>
                          ))}
                        </div>
                        <p>
                          {caseIds.length}/5 rounds. Your cards roll now and
                          stay held until the battle is answered.
                        </p>
                        <button
                          className="primary full"
                          disabled={
                            disabled ||
                            !caseIds.length ||
                            state.player.balance < BATTLE_FEE
                          }
                          onClick={() =>
                            void act(
                              {
                                kind: "battle",
                                action: "create",
                                opponentId: target.id,
                                mode: battleMode,
                                caseIds,
                              },
                              async (out) => {
                                setTarget(null);
                                navigate("battles");
                                await openBattle(out.battleId!);
                              },
                            )
                          }
                        >
                          Pay 1,000,000 SN & send challenge
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {detail && !target && (
              <>
                <span className="eyebrow">
                  TRADE OFFER {detail.trade.revision} ·{" "}
                  {detail.trade.status.toUpperCase()}
                </span>
                <h2 id="social-title">
                  {detail.trade.a_name} ↔ {detail.trade.b_name}
                </h2>
                <div className={styles.twoColumns}>
                  <SidePreview
                    title="You give"
                    side={
                      detail.trade.party_a === state.player.id
                        ? detail.trade.proposal.a
                        : detail.trade.proposal.b
                    }
                    items={detail.items}
                  />
                  <SidePreview
                    title="You receive"
                    side={
                      detail.trade.party_a === state.player.id
                        ? detail.trade.proposal.b
                        : detail.trade.proposal.a
                    }
                    items={detail.items}
                  />
                </div>
                {detail.trade.status === "pending" &&
                  (detail.trade.awaiting_id === state.player.id ? (
                    <div className={styles.toolbar}>
                      <button
                        className="primary"
                        disabled={disabled}
                        onClick={() =>
                          void act(
                            {
                              kind: "social",
                              action: "accept",
                              tradeId: detail.trade.id,
                              revision: detail.trade.revision,
                            },
                            async () => {
                              await openTrade(detail.trade.id);
                              setMessage(
                                "Trade accepted. Cards and Nuggets transferred.",
                              );
                            },
                          )
                        }
                      >
                        Accept trade
                      </button>
                      <button
                        className="small-button"
                        disabled={disabled}
                        onClick={() => {
                          const t = detail.trade;
                          pendingCounter.current=t;
                          setTarget({
                            id:
                              t.party_a === state.player.id
                                ? t.party_b
                                : t.party_a,
                            name:
                              t.party_a === state.player.id
                                ? t.b_name
                                : t.a_name,
                          });
                          setDetail(null);
                        }}
                      >
                        Request more / counteroffer
                      </button>
                      <button
                        className="text-link"
                        disabled={disabled}
                        onClick={() =>
                          void act(
                            {
                              kind: "social",
                              action: "decline",
                              tradeId: detail.trade.id,
                              revision: detail.trade.revision,
                            },
                            () => openTrade(detail.trade.id),
                          )
                        }
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <p>Waiting for their response. This offer has no expiry.</p>
                  ))}
              </>
            )}
            {battle && !target && (
              <BattleView
                key={battle.id + ":" + battle.status}
                battle={battle}
                playerId={state.player.id}
                balance={state.player.balance}
                disabled={disabled}
                respond={(action) =>
                  void act(
                    { kind: "battle", action, battleId: battle.id },
                    () => openBattle(battle.id),
                  )
                }
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}
function BattleView({
  battle: b,
  playerId,
  balance,
  disabled,
  respond,
}: {
  battle: Battle;
  playerId: string;
  balance: number;
  disabled: boolean;
  respond: (action: "accept" | "decline") => void;
}) {
  const n = b.cases.length,
    [step, setStep] = useState(0);
  const done = step >= n * 2 + 1;
  useEffect(() => {
    if (b.status !== "completed" || done) return;
    const t = setTimeout(
      () => setStep((v) => v + 1),
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 1100,
    );
    return () => clearTimeout(t);
  }, [b.status, step, done]);
  const renderCards = (cards: Item[] | null, revealed: number) => (
    <div className={styles.battleCards}>
      {b.cases.map((c, i) => (
        <div key={i} className={styles.battleCard}>
          {cards && i < revealed ? (
            <ItemCard item={cards[i]} />
          ) : (
            <div
              className={styles.hiddenCard}
              aria-label={"Hidden card " + (i + 1)}
            >
              <span>?</span>
              <small>EPIC OR BETTER</small>
            </div>
          )}
          <small>
            ROUND {i + 1} · {c.name}
          </small>
        </div>
      ))}
    </div>
  );
  return (
    <>
      <span className="eyebrow">
        {b.mode.toUpperCase()} BATTLE · {n} ROUNDS
      </span>
      <h2 id="social-title">
        {b.challenger_name} vs {b.opponent_name}
      </h2>
      {b.status === "declined" ? (
        <p>
          Battle declined. The sender’s 1,000,000 SN entry was refunded. No
          cards were awarded.
        </p>
      ) : (
        <>
          <div className={styles.dealer}>
            <h3>{b.challenger_name} · Challenger</h3>
            {renderCards(
              b.challenger_cards,
              b.status === "pending" ? n : Math.max(0, step - n),
            )}
            {((b.status === "pending" && b.challenger_id === playerId) ||
              done) && <p>Total: {fmt(b.challenger_total ?? 0)} SN</p>}
          </div>
          {b.status === "pending" ? (
            <>
              <p>
                {b.challenger_id === playerId
                  ? "Your rolls are saved and held. The opponent cannot see these cards until accepting."
                  : "The challenger’s rolls are locked in and hidden. Accept to roll your cards, then reveal theirs."}
              </p>
              {b.opponent_id === playerId ? (
                <div className={styles.toolbar}>
                  <button
                    className="primary"
                    disabled={disabled || balance < b.entry_fee}
                    onClick={() => respond("accept")}
                  >
                    Pay {fmt(b.entry_fee)} SN & battle
                  </button>
                  <button
                    className="small-button"
                    disabled={disabled}
                    onClick={() => respond("decline")}
                  >
                    Decline & refund sender
                  </button>
                </div>
              ) : (
                <p>
                  Waiting for your opponent. This challenge does not expire.
                </p>
              )}
              <p className="micro">
                {b.mode === "crazy" ? "LOWEST" : "HIGHEST"} TOTAL WINS ALL CARDS
                · TIE: EACH KEEPS THEIR OWN · ENTRY FEES SPENT ON ACCEPTANCE
              </p>
            </>
          ) : (
            <>
              <h3>{b.opponent_name} · Opponent</h3>
              {renderCards(b.opponent_cards, Math.min(n, step))}
              {done ? (
                <div
                  className={
                    styles.result +
                    " " +
                    (b.winner_id === playerId ? styles.win : "")
                  }
                  role="status"
                >
                  <span>
                    {b.tie
                      ? "IT’S A TIE"
                      : b.winner_id === playerId
                        ? "YOU WON THE BATTLE!"
                        : "YOU LOST THE BATTLE"}
                  </span>
                  <p>
                    {b.tie
                      ? "You each kept your own cards."
                      : b.winner_id === playerId
                        ? `All ${n * 2} cards are saved in your inventory.`
                        : "The winner received every card."}
                  </p>
                  <strong>
                    {fmt(b.challenger_total ?? 0)} vs{" "}
                    {fmt(b.opponent_total ?? 0)} SN
                  </strong>
                  <p>
                    {b.mode === "crazy" ? "Lowest" : "Highest"} total wins.
                    Entry fees were spent.
                  </p>
                </div>
              ) : (
                <div className={styles.toolbar}>
                  <p role="status">
                    {step < n
                      ? "Rolling the opponent’s cards…"
                      : "Revealing the challenger’s cards…"}
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setStep(n * 2 + 1)}
                  >
                    Skip reveal
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
