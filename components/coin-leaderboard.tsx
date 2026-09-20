"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CoinStats, State, CoinStatsEntry } from "@/lib/types";
import styles from "./coin.module.css";
const number = (n: number) => n.toLocaleString("en-GB");
const ranks: {
  key: keyof Pick<CoinStatsEntry, "wagered" | "biggest_wager" | "won" | "lost">;
  label: string;
}[] = [
  { key: "wagered", label: "Total wagered" },
  { key: "biggest_wager", label: "Highest single wager" },
  { key: "won", label: "Most won" },
  { key: "lost", label: "Most lost" },
];
export function CoinLeaderboard({
  state,
  paused,
  resultId,
}: {
  state: State | null;
  paused: boolean;
  resultId?: string;
}) {
  const [data, setData] = useState<CoinStats | null>(null),
    [error, setError] = useState(""),
    [sort, setSort] = useState<(typeof ranks)[number]["key"]>("wagered");
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const playerId = state?.player.id;
  useEffect(() => {
    if (!playerId) {
      setData(null);
      return;
    }
    if (paused) return;
    let active = true,
      inflight = false;
    async function load() {
      if (inflight || document.hidden || pausedRef.current) return;
      inflight = true;
      try {
        const next = await api<CoinStats>("coin-stats");
        if (active && !pausedRef.current) {
          setData(next);
          setError("");
        }
      } catch {
        if (active)
          setError("Live results are temporarily unavailable. Retrying…");
      } finally {
        inflight = false;
      }
    }
    void load();
    const timer = setInterval(load, 15000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [playerId, paused, resultId]);
  const players = [...(data?.players ?? [])]
    .sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name))
    .slice(0, 100);
  const winners = [...(data?.players ?? [])]
    .filter((p) => p.wins > 0)
    .sort((a, b) => b.won - a.won || a.name.localeCompare(b.name))
    .slice(0, 5);
  return (
    <section className={styles.board} aria-labelledby="coin-board-title">
      <div className="section-top">
        <div>
          <span className="eyebrow">EVERY FLIP LEAVES A MARK</span>
          <h2 id="coin-board-title">THE COIN FLOOR.</h2>
        </div>
        <span className={styles.live}>
          {paused ? "FLIP IN PROGRESS" : "● LIVE RESULTS"}
        </span>
      </div>
      {!state ? (
        <p className="empty">
          Sign in to see recent flips and the coin leaderboard.
        </p>
      ) : (
        <>
          {error && (
            <p role="status" className="muted">
              {error}
            </p>
          )}
          {!data && !error && <p className="muted">Loading the coin floor…</p>}
          {data && (
            <>
              <div className={styles.totals}>
                {[
                  ["TOTAL COIN FLIPS", data.totals.flips],
                  ["SPUNK NUGGETS WAGERED", data.totals.wagered],
                  ["TOTAL WON", data.totals.won],
                  ["TOTAL LOST", data.totals.lost],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{number(Number(value))}</strong>
                  </article>
                ))}
              </div>
              <div className={styles.panels}>
                <article className={styles.panel}>
                  <div className="section-top">
                    <h3>Fresh from the reel</h3>
                    <span className="micro muted">RECENT FLIPS</span>
                  </div>
                  <div className={styles.feed}>
                    {data.recent.length ? (
                      data.recent.map((f) => (
                        <div className={styles.feedRow} key={f.id}>
                          <span
                            className={f.won ? styles.winIcon : styles.lossIcon}
                          >
                            {f.won ? "✦" : "↘"}
                          </span>
                          <div>
                            <strong>{f.name}</strong>
                            <small>
                              {number(f.wager)} SN wager ·{" "}
                              {new Date(f.created_at).toLocaleTimeString(
                                "en-GB",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </small>
                          </div>
                          <b className={f.won ? styles.win : styles.loss}>
                            {f.net > 0 ? "+" : ""}
                            {number(f.net)}
                            <small>SN {f.won ? "WON" : "LOST"}</small>
                          </b>
                        </div>
                      ))
                    ) : (
                      <p className="empty small">
                        The first flip starts the feed.
                      </p>
                    )}
                  </div>
                </article>
                <article className={styles.panel}>
                  <div className="section-top">
                    <h3>Most Won</h3>
                    <span className="micro muted">WINNING FLIPS</span>
                  </div>
                  <div className={styles.feed}>
                    {winners.length ? (
                      winners.map((p, i) => (
                        <div className={styles.feedRow} key={p.id}>
                          <span className={styles.rank}>{i + 1}</span>
                          <div>
                            <strong>{p.name}</strong>
                            <small>
                              {p.wins} wins · {p.flips} flips
                            </small>
                          </div>
                          <b className={styles.win}>
                            {number(p.won)}
                            <small>SN WON</small>
                          </b>
                        </div>
                      ))
                    ) : (
                      <p className="empty small">The podium is waiting.</p>
                    )}
                  </div>
                  <p className={styles.note}>
                    Won shows profit from winning flips. Returned stakes are
                    excluded.
                  </p>
                </article>
              </div>
              <div className={styles.tableHeading}>
                <h3>Coin flip leaderboard</h3>
                <div className="segmented">
                  {ranks.map((r) => (
                    <button
                      key={r.key}
                      className={sort === r.key ? "selected" : ""}
                      onClick={() => setSort(r.key)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Flips</th>
                      <th>Total wagered</th>
                      <th>Highest wager</th>
                      <th>Won</th>
                      <th>Lost</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr
                        key={p.id}
                        className={p.id === playerId ? styles.you : ""}
                      >
                        <td>{i + 1}</td>
                        <td>
                          <strong>{p.name}</strong>
                          {p.id === playerId && (
                            <small className={styles.youLabel}>YOU</small>
                          )}
                        </td>
                        <td>{number(p.flips)}</td>
                        <td>{number(p.wagered)}</td>
                        <td>{number(p.biggest_wager)}</td>
                        <td className={styles.win}>{number(p.won)}</td>
                        <td className={styles.loss}>{number(p.lost)}</td>
                        <td>
                          {p.net > 0 ? "+" : ""}
                          {number(p.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!players.length && (
                  <p className="empty small">No flips recorded yet.</p>
                )}
              </div>
              <p className={styles.note}>
                All amounts are Spunk Nuggets. Rankings include saved flips from
                before this update. Net = won − lost.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
