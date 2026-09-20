import Image from "next/image";
import { CardEffect } from "./card-effect";
export { CardEffect } from "./card-effect";
import styles from "./visuals.module.css";
import { colors, cardValue, type Item, type Effect } from "@/lib/catalog";
export function ItemArt({
  item,
  large = false,
  eager = false,
}: {
  item: Item;
  large?: boolean;
  eager?: boolean;
}) {
  return (
    <Image
      src={item.image}
      alt={item.name}
      width={large ? 480 : 240}
      height={large ? 480 : 240}
      sizes={
        large ? "(max-width:600px) 80vw,420px" : "(max-width:600px) 45vw,240px"
      }
      loading={eager ? "eager" : "lazy"}
      unoptimized={item.image.endsWith(".webp")}
      className="item-art"
    />
  );
}
export function ItemCard({
  item,
  quantity,
  odds,
  locked = false,
  effect = "RAW",
  children,
}: {
  item: Item;
  quantity?: number;
  odds?: number;
  locked?: boolean;
  effect?: Effect;
  children?: React.ReactNode;
}) {
  return (
    <article
      className={
        "item-card " +
        styles.card +
        " " +
        (locked ? "locked " : "") +
        "card-" +
        effect.toLowerCase()
      }
      style={{ "--rarity": colors[item.rarity] } as React.CSSProperties}
    >
      <div className="card-art">
        <ItemArt item={item} />
        {locked && <span className="locked-mark">?</span>}
        {quantity !== undefined && quantity > 0 && (
          <span className="quantity">×{quantity}</span>
        )}
      </div>
      <div className="item-meta">
        <span className="rarity">{item.mystery ? "MYSTERY" : item.rarity}</span>
        <h3>{item.name}</h3>
        <span className="micro">
          {odds !== undefined
            ? odds.toFixed(3) + "% chance"
            : effect === "NONE"
              ? "UNMODIFIED · UPGRADE USED"
              : effect !== "RAW"
                ? effect + " EFFECT"
                : locked
                  ? "NOT DISCOVERED"
                  : "ORIGINAL"}
        </span>
        {!locked && (
          <strong className="card-price">
            {cardValue(item, effect).toLocaleString("en-GB")} SN
          </strong>
        )}
        {children}
      </div>
      {!locked && <CardEffect effect={effect} />}
    </article>
  );
}
