"use client";
import { useState } from "react";
import { Trophy } from "lucide-react";
import {
  rarities,
  colors,
  rarityGroups,
  cardValue,
  type Catalog,
} from "@/lib/catalog";
import type { State, Outcome, CardStack } from "@/lib/types";
import { ItemCard } from "./item-card";
export function Collection({
  state,
  catalog,
  inventoryOnly = false,
  run,
  busy,
}: {
  state: State | null;
  catalog: Catalog;
  inventoryOnly?: boolean;
  run: (body: Record<string, unknown>) => Promise<Outcome | null>;
  busy: boolean;
}) {
  const [filter, setFilter] = useState("ALL"),
    [sort, setSort] = useState("rarity"),
    [lines, setLines] = useState(false),
    [caseId, setCaseId] = useState("basic"),
    [notice, setNotice] = useState(""),
    [selling, setSelling] = useState(false),
    [visible, setVisible] = useState(24);
  const owned = new Map(
      state?.inventory.map((i) => [i.item_id, i.quantity]) ?? [],
    ),
    discovered = new Set(state?.discoveries ?? []),
    completed = new Set(
      state?.completions.map((c) => c.kind + ":" + c.key) ?? [],
    );
  const ca = catalog.cases.find((c) => c.id === caseId);
  const items = catalog.items
    .filter(
      (i) =>
        (inventoryOnly || ca?.weights.some((w) => w.itemId === i.id)) &&
        (filter === "ALL" || i.rarity === filter),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "quantity"
          ? (owned.get(b.id) ?? 0) - (owned.get(a.id) ?? 0)
          : rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity),
    );
  const stacks = items.flatMap((i) =>
    (state?.cards ?? [])
      .filter((c) => c.item_id === i.id)
      .map((c) => ({ item: i, stack: c })),
  );
  async function sell(c: CardStack) {
    if (selling || busy) return;
    setSelling(true);
    try {
      const out = await run({
        kind: "sell",
        itemId: c.item_id,
        effect: c.effect,
      });
      if (out)
        setNotice(
          "Sold one card for " +
            out.payout?.toLocaleString("en-GB") +
            " SN. Discovery kept in your collection.",
        );
    } finally {
      setSelling(false);
    }
  }
  return (
    <section className="page-section">
      <div className="page-title">
        <div>
          <span className="eyebrow">THE TROPHY ROOM</span>
          <h1>{inventoryOnly ? "YOUR INVENTORY." : "COLLECT THE CHAOS."}</h1>
          <p>
            {inventoryOnly
              ? "Every copy can be sold for Spunk Nuggets."
              : discovered.size +
                " / " +
                catalog.items.length +
                " characters discovered. Selling never erases a discovery."}
          </p>
        </div>
        <Trophy className="page-emblem" />
      </div>
      {!inventoryOnly && (
        <div className="collection-controls">
          <div className="segmented tabs">
            <button
              className={!lines ? "selected" : ""}
              onClick={() => setLines(false)}
            >
              Rarity collections
            </button>
            <button
              className={lines ? "selected" : ""}
              onClick={() => setLines(true)}
            >
              Name lines
            </button>
          </div>
          {!lines && (
            <label className="field">
              Case
              <select
                value={caseId}
                onChange={(e) => {
                  setCaseId(e.target.value);
                  setVisible(24);
                }}
              >
                {catalog.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {lines && !inventoryOnly ? (
        <div className="line-grid">
          {catalog.lines.map((l) => (
            <article className="panel" key={l.id}>
              <div className="section-top">
                <h2>{l.name}</h2>
                <strong>
                  {l.itemIds.filter((i) => discovered.has(i)).length} /{" "}
                  {l.itemIds.length}
                </strong>
              </div>
              <progress
                value={l.itemIds.filter((i) => discovered.has(i)).length}
                max={l.itemIds.length}
              />
              <p className="lime">
                {completed.has("line:" + l.id)
                  ? "REWARD AWARDED"
                  : "COMPLETE FOR +" + l.reward.toLocaleString("en-GB") + " SN"}
              </p>
              <div className="item-grid compact">
                {l.itemIds.map((id) => (
                  <ItemCard
                    key={id}
                    item={catalog.items.find((i) => i.id === id)!}
                    quantity={owned.get(id)}
                    locked={!discovered.has(id)}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          {!inventoryOnly && (
            <div className="rarity-progress">
              {rarityGroups(catalog)
                .filter((g) => g.caseId === caseId)
                .map((g) => {
                  const n = g.items.filter((i) => discovered.has(i.id)).length;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setFilter(g.rarity)}
                      style={
                        { "--rarity": colors[g.rarity] } as React.CSSProperties
                      }
                    >
                      <span>{g.rarity}</span>
                      <strong>
                        {n} <small>/ {g.items.length}</small>
                      </strong>
                      <progress value={n} max={g.items.length || 1} />
                      <span className="micro">
                        {completed.has("rarity:" + g.key)
                          ? "REWARD AWARDED"
                          : "+" +
                            catalog.settings.rarityRewards[
                              g.rarity
                            ].toLocaleString("en-GB") +
                            " SN"}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
          <div className="filters">
            <div className="filter-buttons">
              {["ALL", ...rarities].map((r) => (
                <button
                  className={filter === r ? "active" : ""}
                  key={r}
                  onClick={() => {
                    setFilter(r);
                    setVisible(24);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <label className="micro">
              Sort by{" "}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="rarity">Rarity</option>
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
              </select>
            </label>
          </div>
          {notice && (
            <p className="sale-notice" role="status">
              {notice}
            </p>
          )}
          <div className="item-grid">
            {inventoryOnly
              ? stacks.slice(0, visible).map(({ item, stack }) => (
                  <ItemCard
                    key={item.id + stack.effect}
                    item={item}
                    effect={stack.effect}
                    quantity={stack.quantity}
                  >
                    <button
                      className="sell-card"
                      disabled={busy || selling}
                      onClick={() => sell(stack)}
                    >
                      Sell one ·{" "}
                      {cardValue(item, stack.effect).toLocaleString("en-GB")} SN
                    </button>
                  </ItemCard>
                ))
              : items
                  .slice(0, visible)
                  .map((i) => (
                    <ItemCard
                      key={i.id}
                      item={i}
                      quantity={owned.get(i.id)}
                      locked={!discovered.has(i.id)}
                    />
                  ))}
          </div>
          {(inventoryOnly ? stacks.length : items.length) > visible && (
            <button
              className="small-button load-more"
              onClick={() => setVisible((n) => n + 24)}
            >
              Load more cards ·{" "}
              {Math.min(visible, inventoryOnly ? stacks.length : items.length)}{" "}
              / {inventoryOnly ? stacks.length : items.length}
            </button>
          )}
          {inventoryOnly && !stacks.length && (
            <div className="empty">
              <Trophy />
              <h2>Your next discovery starts with a case.</h2>
              <a href="#cases" className="text-link">
                Choose a case
              </a>
            </div>
          )}
        </>
      )}
    </section>
  );
}
