"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { chance, type Catalog } from "@/lib/catalog";
import type { State } from "@/lib/types";
type Overview = {
  players: {
    id: string;
    name: string;
    balance: number;
    items: number;
    openings: number;
    daily_at: string | null;
    free_at: string | null;
  }[];
  stats: Record<string, number>;
  popular: { name: string } | null;
  rarest: { name: string } | null;
  audit: { id: string; action: string; created_at: string; detail: unknown }[];
  catalog: Catalog;
  version: number;
};
export function AdminPanel() {
  const pending = useRef<Record<string, unknown> | null>(null),
    locked = useRef(false);
  const [data, setData] = useState<Overview | null>(null),
    [tab, setTab] = useState("players"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [config, setConfig] = useState(""),
    [inspect, setInspect] = useState<{
      state: State;
      ledger: unknown[];
    } | null>(null),
    [action, setAction] = useState("add");
  async function load() {
    try {
      const d = await api<Overview>("admin/state");
      setData(d);
      setConfig(JSON.stringify(d.catalog, null, 2));
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function mutate(body: Record<string, unknown>) {
    if (locked.current) return;
    if (pending.current && body.action !== "retry") {
      setError(
        "The last change needs recovery. Use Retry saved request before another change.",
      );
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const request = pending.current ?? { ...body, key: crypto.randomUUID() };
    pending.current = request;
    try {
      await api("admin/mutate", request);
      pending.current = null;
      await load();
      setInspect(null);
      setMessage("Changes saved.");
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status < 500) pending.current = null;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="admin-shell">
      <a className="text-link" href="/">
        <ArrowLeft size={16} /> Back to the cases
      </a>
      <div className="page-title">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={15} /> OWNER ACCESS
          </span>
          <h1>CONTROL ROOM.</h1>
        </div>
        {data && (
          <button
            className="small-button"
            onClick={async () => {
              try {
                await api("admin/logout", {});
                setData(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Sign out of admin
          </button>
        )}
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {message && (
        <p className="lime" role="status">
          {message}
        </p>
      )}
      {pending.current && (
        <button
          className="small-button"
          disabled={busy}
          onClick={() => void mutate({ action: "retry" })}
        >
          Retry saved request
        </button>
      )}
      {!data ? (
        <form
          className="panel admin-login"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("admin/auth", {
                password: new FormData(e.currentTarget).get("password"),
              });
              await load();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Admin sign in</h2>
          <p>Separate access for the owner.</p>
          <label>
            Admin password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Checking…" : "Unlock Admin Mode"}
          </button>
        </form>
      ) : (
        <>
          <div className="admin-stats">
            {Object.entries(data.stats).map(([k, v]) => (
              <article className="panel" key={k}>
                <span>{k.replaceAll("_", " ").toUpperCase()}</span>
                <strong>{Number(v).toLocaleString("en-GB")}</strong>
              </article>
            ))}
          </div>
          <p className="muted">
            Most found: {data.popular?.name ?? "None yet"} · Rarest found at
            current odds: {data.rarest?.name ?? "None yet"}
          </p>
          <div className="segmented tabs">
            {["players", "catalog", "audit"].map((t) => (
              <button
                key={t}
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {t === "catalog"
                  ? "Cases, items & rewards"
                  : t === "audit"
                    ? "Audit trail"
                    : "Players"}
              </button>
            ))}
          </div>
          {tab === "players" && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Nuggets</th>
                      <th>Items</th>
                      <th>Cases</th>
                      <th>Last daily / free claim</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.players.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{Number(p.balance).toLocaleString("en-GB")}</td>
                        <td>{p.items}</td>
                        <td>{p.openings}</td>
                        <td>
                          {p.daily_at
                            ? new Date(p.daily_at).toLocaleString()
                            : "Never"}
                          <br />
                          {p.free_at
                            ? new Date(p.free_at).toLocaleString()
                            : "Never"}
                        </td>
                        <td>
                          <button
                            className="small-button"
                            onClick={async () => {
                              try {
                                setInspect(
                                  await api("admin/player?id=" + p.id),
                                );
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            }}
                          >
                            View history
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.players.length && (
                  <p className="empty">
                    No players yet. Share the invite code with your friends.
                  </p>
                )}
              </div>
              <form
                className="panel admin-actions"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void mutate({
                    action,
                    playerId: f.get("playerId"),
                    amount: Number(f.get("amount") ?? 0),
                    itemId: f.get("itemId") ?? undefined,
                    confirmation: f.get("confirmation") ?? undefined,
                    ...(action === "reset-passcode"
                      ? { passcode: f.get("passcode") }
                      : {}),
                  });
                }}
              >
                <h2>Player management</h2>
                <div className="form-grid">
                  <label>
                    Player
                    <select name="playerId" required>
                      {data.players.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Action
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                    >
                      {[
                        ["add", "Add nuggets"],
                        ["remove", "Remove nuggets"],
                        ["set", "Set balance"],
                        ["give-item", "Give one item"],
                        ["remove-item", "Remove one item"],
                        ["reset-daily", "Reset daily cooldown"],
                        ["reset-collection", "Reset collection"],
                        ["reset-player", "Reset player"],
                        ["reset-passcode", "Reset passcode"],
                      ].map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {["add", "remove", "set"].includes(action) && (
                    <label>
                      Amount
                      <input
                        name="amount"
                        type="number"
                        min={0}
                        max={100000000}
                        step={1}
                        required
                        defaultValue={500}
                      />
                    </label>
                  )}
                  {action.includes("item") && (
                    <label>
                      Item
                      <select name="itemId">
                        {data.catalog.items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {["reset-player", "reset-collection"].includes(action) && (
                    <label>
                      Type RESET to confirm
                      <input name="confirmation" required pattern="RESET" />
                      <span className="micro">
                        History and previously awarded completion records are
                        kept.
                      </span>
                    </label>
                  )}
                  {action === "reset-passcode" && (
                    <label>
                      New player passcode
                      <input
                        name="passcode"
                        type="password"
                        minLength={6}
                        maxLength={128}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                  )}
                </div>
                <button
                  className="primary"
                  disabled={busy || !data.players.length}
                >
                  Apply change
                </button>
              </form>
              {inspect && (
                <section className="panel">
                  <h2>{inspect.state.player.name}: saved records</h2>
                  <details open>
                    <summary>Inventory & game history</summary>
                    <pre>
                      {JSON.stringify(
                        {
                          inventory: inspect.state.inventory,
                          completions: inspect.state.completions,
                          history: inspect.state.history,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                  <details>
                    <summary>Currency ledger · latest 500 entries</summary>
                    <pre>{JSON.stringify(inspect.ledger, null, 2)}</pre>
                  </details>
                </section>
              )}
            </>
          )}
          {tab === "catalog" && (
            <section className="panel">
              <h2>Game configuration</h2>
              <p>
                Edit cases, item image paths and rarities, weighted
                probabilities, name lines, rewards, and upgrade chances below.
              </p>
              <p className="muted">
                Each case normalizes its positive weights to 100%. Keep existing
                IDs to protect saved collections; disable unwanted cases. Add
                image files under public/assets/items in GitHub before changing
                paths.
              </p>
              <details>
                <summary>Current effective probabilities</summary>
                {data.catalog.cases.map((c) => (
                  <div key={c.id}>
                    <h3>
                      {c.name} · {c.price} SN ·{" "}
                      {c.enabled ? "Enabled" : "Disabled"}
                    </h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Rarity</th>
                            <th>Weight</th>
                            <th>Chance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.weights.map((w) => (
                            <tr key={w.itemId}>
                              <td>
                                {
                                  data.catalog.items.find(
                                    (i) => i.id === w.itemId,
                                  )?.name
                                }
                              </td>
                              <td>
                                {
                                  data.catalog.items.find(
                                    (i) => i.id === w.itemId,
                                  )?.rarity
                                }
                              </td>
                              <td>{w.weight}</td>
                              <td>{chance(c, w.itemId).toFixed(6)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </details>
              <label>
                Configuration JSON
                <textarea
                  className="config-editor"
                  spellCheck={false}
                  value={config}
                  onChange={(e) => setConfig(e.target.value)}
                />
              </label>
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  try {
                    void mutate({
                      action: "catalog",
                      catalog: JSON.parse(config),
                      version: data.version,
                    });
                  } catch {
                    setError("Configuration must be valid JSON.");
                  }
                }}
              >
                Validate & save configuration
              </button>
              <button
                className="small-button"
                disabled={busy}
                onClick={() => setConfig(JSON.stringify(data.catalog, null, 2))}
              >
                Discard unsaved edits
              </button>
            </section>
          )}
          {tab === "audit" && (
            <section className="panel">
              <h2>Admin audit trail</h2>
              {data.audit.map((a) => (
                <details key={a.id}>
                  <summary>
                    {new Date(a.created_at).toLocaleString()} · {a.action}
                  </summary>
                  <pre>{JSON.stringify(a.detail, null, 2)}</pre>
                </details>
              ))}
              {!data.audit.length && <p>No admin changes yet.</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
