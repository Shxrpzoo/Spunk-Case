"use client";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { rarities, colors, type Catalog } from "@/lib/catalog";
import type { State } from "@/lib/types";
import { ItemCard } from "./item-card";
export function Collection({
  state,
  catalog,
  inventoryOnly = false,
}: {
  state: State | null;
  catalog: Catalog;
  inventoryOnly?: boolean;
}) {
  const [filter, setFilter] = useState("ALL"),
    [sort, setSort] = useState("rarity"),
    [lines, setLines] = useState(false);
  const owned = new Map(
    state?.inventory.map((i) => [i.item_id, i.quantity]) ?? [],
  );
  const completed = new Set(
    state?.completions.map((c) => c.kind + ":" + c.key) ?? [],
  );
  const items = catalog.items
    .filter(
      (i) =>
        (!inventoryOnly || owned.has(i.id)) &&
        (filter === "ALL" || i.rarity === filter),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "quantity"
          ? (owned.get(b.id) ?? 0) - (owned.get(a.id) ?? 0)
          : rarities.indexOf(b.rarity) - rarities.indexOf(a.rarity),
    );
  return (
    <section className="page-section">
      <div className="page-title">
        <div>
          <span className="eyebrow">THE TROPHY ROOM</span>
          <h1>{inventoryOnly ? "YOUR INVENTORY." : "COLLECT THE CHAOS."}</h1>
          <p>
            {owned.size} / {catalog.items.length} unique characters collected.
          </p>
        </div>
        <Trophy className="page-emblem" />
      </div>
      {!inventoryOnly && (
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
      )}
      {lines && !inventoryOnly ? (
        <div className="line-grid">
          {catalog.lines.map((l) => {
            const n = l.itemIds.filter((i) => owned.has(i)).length;
            return (
              <article className="panel" key={l.id}>
                <div className="section-top">
                  <h2>{l.name}</h2>
                  <strong>
                    {n} / {l.itemIds.length}
                  </strong>
                </div>
                <progress value={n} max={l.itemIds.length} />
                <p className="lime">
                  {completed.has("line:" + l.id)
                    ? "✓ REWARD AWARDED"
                    : "COMPLETE FOR +" +
                      l.reward.toLocaleString("en-GB") +
                      " SN"}
                </p>
                <div className="item-grid compact">
                  {l.itemIds.map((id) => {
                    const item = catalog.items.find((i) => i.id === id)!;
                    return (
                      <ItemCard
                        key={id}
                        item={item}
                        quantity={owned.get(id)}
                        locked={!owned.has(id)}
                      />
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <>
          {!inventoryOnly && (
            <div className="rarity-progress">
              {rarities.map((r) => {
                const group = catalog.items.filter((i) => i.rarity === r),
                  n = group.filter((i) => owned.has(i.id)).length;
                return (
                  <button
                    key={r}
                    onClick={() => setFilter(r)}
                    style={{ "--rarity": colors[r] } as React.CSSProperties}
                  >
                    <span>{r}</span>
                    <strong>
                      {n} <small>/ {group.length}</small>
                    </strong>
                    <progress value={n} max={group.length || 1} />
                    <span className="micro">
                      {completed.has("rarity:" + r)
                        ? "✓ REWARD AWARDED"
                        : "+" +
                          catalog.settings.rarityRewards[r].toLocaleString(
                            "en-GB",
                          ) +
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
                  onClick={() => setFilter(r)}
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
          <div className="item-grid">
            {items.map((i) => (
              <ItemCard
                key={i.id}
                item={i}
                quantity={owned.get(i.id)}
                locked={!owned.has(i.id)}
              />
            ))}
          </div>
          {!items.length && (
            <div className="empty">
              <Trophy />
              <h2>Your next discovery starts with a case.</h2>
              <p>
                Owned stickers will appear here, safely saved to your player.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
