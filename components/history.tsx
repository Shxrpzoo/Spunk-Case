"use client";
import { useState } from "react";
import type { State } from "@/lib/types";
export function HistoryView({ state }: { state: State | null }) {
  const [filter, setFilter] = useState("all");
  const rows =
    state?.history.filter(
      (h) =>
        filter === "all" ||
        (filter === "rewards" && ["daily", "free", "admin"].includes(h.kind)) ||
        h.kind === filter,
    ) ?? [];
  return (
    <section className="page-section">
      <span className="eyebrow">EVERY LITTLE WIN</span>
      <h1>YOUR TRACK RECORD.</h1>
      <div className="filters filter-buttons">
        {["all", "case", "upgrade", "coin", "rewards"].map((f) => (
          <button
            key={f}
            className={f === filter ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? "ALL ACTIVITY"
              : f === "case"
                ? "CASE OPENINGS"
                : f.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="muted">
        Your latest 100 events. The full transaction ledger stays saved.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Game</th>
              <th>Result</th>
              <th>Net nuggets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.created_at).toLocaleString()}</td>
                <td>{h.kind.toUpperCase()}</td>
                <td>
                  {h.kind === "case"
                    ? (state?.catalog.items.find(
                        (i) => i.id === h.detail.itemId,
                      )?.name ?? "Item collected")
                    : h.kind === "upgrade" || h.kind === "coin"
                      ? `${h.detail.won ? "WIN" : "LOSS"} · ${h.detail.face ?? String(h.detail.multiplier) + "×"} · Wager ${h.detail.wager} · Return ${h.detail.payout}`
                      : String(h.detail.action ?? "Reward claimed")}
                  {h.detail.duplicate ? " · Duplicate" : ""}
                  {Array.isArray(h.detail.rewards) &&
                    h.detail.rewards.length > 0 && (
                      <small className="history-rewards">
                        {(
                          h.detail.rewards as {
                            label: string;
                            amount: number;
                          }[]
                        )
                          .map(
                            (r) =>
                              `${r.label} +${r.amount.toLocaleString("en-GB")}`,
                          )
                          .join(" · ")}
                      </small>
                    )}
                </td>
                <td className={h.amount >= 0 ? "lime" : "loss-text"}>
                  {h.amount > 0 ? "+" : ""}
                  {h.amount.toLocaleString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="empty">Your saved activity will appear here.</p>
        )}
      </div>
    </section>
  );
}
