"use client";
import { useEffect, useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import type { Leaderboards, State } from "@/lib/types";
import { api } from "@/lib/api";
import { ItemArt } from "./item-card";
export function Leaderboard({
  state,
  onPlayer,
}: {
  state: State | null;
  onPlayer?: (p: { id: string; name: string }) => void;
}) {
  const [boards, setBoards] = useState<Leaderboards | null>(null),
    [sort, setSort] = useState<keyof Leaderboards>("cards"),
    [refreshKey, setRefreshKey] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!state?.player.id) {
      setBoards(null);
      return;
    }
    let active = true;
    let inFlight = false;
    async function load() {
      if (inFlight || document.hidden) return;
      inFlight = true;
      setLoading(true);
      try {
        const current = await api<Leaderboards>("leaderboard");
        if (active) {
          setBoards(current);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }
    // Refresh for other players' sales/losses and invalidate stale requests
    // whenever our inventory snapshot changes.
    void load();
    const poll = window.setInterval(load, 10000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [state?.player.id, state?.serverTime, refreshKey, sort]);
  const labels = {
      cards: "Highest value card",
      nuggets: "Most Spunk Nuggets",
      cases: "Most cases opened",
    },
    rows = boards?.[sort] ?? [];
  return (
    <section className="page-section">
      <div className="page-title">
        <div>
          <span className="eyebrow">WHO IS RUNNING THE COLLECTION?</span>
          <h1>THE LEADERBOARD.</h1>
          <p>
            Top 100 players. Highest card means the most valuable copy currently
            owned, including its effect. Updates every 10 seconds while visible.
          </p>
        </div>
        <Trophy className="page-emblem" />
      </div>
      <div className="leaderboard-controls">
        <div className="segmented tabs">
          {(Object.keys(labels) as (keyof Leaderboards)[]).map((k) => (
            <button
              key={k}
              className={sort === k ? "selected" : ""}
              onClick={() => setSort(k)}
            >
              {labels[k]}
            </button>
          ))}
        </div>
        <button
          className="text-link"
          disabled={!state || loading}
          onClick={() => setRefreshKey((key) => key + 1)}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      {!state ? (
        <p className="empty">Sign in to see the leaderboards.</p>
      ) : error ? (
        <p role="alert" className="error-banner">
          {error}
        </p>
      ) : loading && !boards ? (
        <p className="empty">Loading the standings…</p>
      ) : (
        <div className="table-wrap leaderboard-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Highest value card</th>
                <th>Spunk Nuggets</th>
                <th>Cases opened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => {
                const item = state.catalog.items.find(
                  (i) => i.id === r.item_id,
                );
                return (
                  <tr
                    key={r.id}
                    className={r.id === state.player.id ? "your-rank" : ""}
                  >
                    <td>
                      <span className={"rank rank-" + (index + 1)}>
                        {index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}
                      </span>
                    </td>
                    <td>
                      {r.id !== state.player.id && onPlayer ? (
                        <button
                          className="text-link"
                          onClick={() => onPlayer({ id: r.id, name: r.name })}
                        >
                          {r.name} ↗
                        </button>
                      ) : (
                        <strong>{r.name}</strong>
                      )}
                      {r.id === state.player.id && (
                        <small className="you-tag">YOU</small>
                      )}
                    </td>
                    <td>
                      <div className="leader-card">
                        {item && <ItemArt item={item} />}
                        <div>
                          <strong>
                            {r.card_value.toLocaleString("en-GB")} SN
                          </strong>
                          <small>
                            {item
                              ? item.name +
                                " · " +
                                (r.effect === "RAW"
                                  ? "Original"
                                  : r.effect === "NONE"
                                    ? "Unmodified"
                                    : r.effect)
                              : "No cards owned"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className={sort === "nuggets" ? "lime" : ""}>
                      {r.balance.toLocaleString("en-GB")}
                    </td>
                    <td className={sort === "cases" ? "lime" : ""}>
                      {r.cases.toLocaleString("en-GB")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <p className="empty">The first player takes the lead.</p>
          )}
        </div>
      )}
    </section>
  );
}
