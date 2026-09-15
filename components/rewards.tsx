"use client";
import { Gift, Timer, Zap } from "lucide-react";
import type { State } from "@/lib/types";
import type { Settings } from "@/lib/catalog";
const fmt = (n: number) => n.toLocaleString("en-GB");
export function countdown(
  last: string | null | undefined,
  period: number,
  now: number,
) {
  const sec = Math.max(
    0,
    Math.ceil(((last ? new Date(last).getTime() : 0) + period - now) / 1000),
  );
  return {
    sec,
    text: [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
      .map((n) => String(n).padStart(2, "0"))
      .join(":"),
  };
}
export function Rewards({
  state,
  settings,
  now,
  busy,
  onClaim,
}: {
  state: State | null;
  settings: Settings;
  now: number;
  busy: boolean;
  onClaim: (kind: "daily" | "free") => void;
}) {
  const daily = countdown(state?.player.daily_at, 86400000, now),
    free = countdown(state?.player.free_at, 300000, now);
  const today = new Date(now).toISOString().slice(0, 10),
    claimed = state?.player.first_case_day?.slice(0, 10) === today;
  return (
    <section className="rewards" id="rewards" aria-label="Free Spunk Nuggets">
      {[
        {
          kind: "daily" as const,
          title: "Daily reward",
          amount: settings.dailyReward,
          clock: daily,
          icon: Gift,
          sub: "A little something, every 24 hours.",
        },
        {
          kind: "free" as const,
          title: "Free nuggets",
          amount: settings.freeReward,
          clock: free,
          icon: Timer,
          sub: "Your next case is only 5 minutes away.",
        },
      ].map((r) => (
        <article className="reward-card" key={r.kind}>
          <div className="reward-icon">
            <r.icon size={23} />
          </div>
          <div>
            <h3>{r.title}</h3>
            <strong>
              +{fmt(r.amount)} <span>SN</span>
            </strong>
            <p>{r.sub}</p>
          </div>
          <button
            className="small-button"
            disabled={busy || (!!state && r.clock.sec > 0)}
            onClick={() => onClaim(r.kind)}
          >
            {state && r.clock.sec > 0 ? r.clock.text : "Claim"}
          </button>
        </article>
      ))}
      <article className="reward-card bonus">
        <div className="reward-icon">
          <Zap size={23} />
        </div>
        <div>
          <h3>First case bonus</h3>
          <strong>
            +{fmt(settings.firstCaseReward)} <span>SN</span>
          </strong>
          <p>
            {claimed
              ? "Collected. See you tomorrow."
              : "Automatically added with your first case."}
          </p>
        </div>
        <span className="micro">
          {claimed ? "✓ CLAIMED" : "RESETS 00:00 UTC"}
        </span>
      </article>
    </section>
  );
}
