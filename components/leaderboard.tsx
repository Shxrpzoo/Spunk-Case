"use client";
import { useEffect, useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import type { Leaderboards, State } from "@/lib/types";
import { api } from "@/lib/api";
import { ItemArt } from "./item-card";
export function Leaderboard({ state }: { state: State | null }) {
  const [boards, setBoards] = useState<Leaderboards | null>(null),
    [sort, setSort] = useState<keyof Leaderboards>("cards"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!state) return;
    let active = true;
    setLoading(true);
    api<Leaderboards>("leaderboard")
      .then((b) => {
        if (active) {
          setBoards(b);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [state?.player.id, state?.history?.[0]?.id]);
  async function refresh() {
    if (loading) return;
    setLoading(true);
    try {
      setBoards(await api<Leaderboards>("leaderboard"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
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
            owned, including its effect.
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
          onClick={refresh}
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
                      <strong>{r.name}</strong>
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
                              : "No cards yet"}
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
