import Image from "next/image";
import { colors, type Item } from "@/lib/catalog";
export function ItemArt({
  item,
  large = false,
}: {
  item: Item;
  large?: boolean;
}) {
  return (
    <Image
      src={item.image}
      alt={item.name}
      width={large ? 480 : 240}
      height={large ? 480 : 240}
      sizes={
        large
          ? "(max-width: 600px) 80vw, 420px"
          : "(max-width: 600px) 45vw, 240px"
      }
      className="item-art"
    />
  );
}
export function ItemCard({
  item,
  quantity,
  odds,
  locked = false,
}: {
  item: Item;
  quantity?: number;
  odds?: number;
  locked?: boolean;
}) {
  return (
    <article
      className={"item-card " + (locked ? "locked" : "")}
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
        <span className="rarity">{item.rarity}</span>
        <h3>{item.name}</h3>
        <span className="micro">
          {odds !== undefined
            ? odds.toFixed(4) + "% chance"
            : locked
              ? "NOT COLLECTED"
              : "✓ COLLECTED"}
        </span>
      </div>
    </article>
  );
}
