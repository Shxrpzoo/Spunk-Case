import Image from "next/image";
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
export function CardEffect({ effect = "RAW" }: { effect?: Effect }) {
  if (effect === "RAW" || effect === "NONE") return null;
  return (
    <div
      className={"effect-overlay effect-" + effect.toLowerCase()}
      aria-hidden="true"
    >
      {effect === "SPUNK" && (
        <>
          <div className="glue-edge" />
          {[0, 1, 2, 3, 4].map((n) => (
            <i
              className="glue-drop"
              key={n}
              style={{
                left: 12 + n * 19 + "%",
                animationDelay: n * 0.53 + "s",
              }}
            />
          ))}
        </>
      )}
      {effect === "POO" && (
        <>
          <span className="poo-badge">💩</span>
          <div className="stink-cloud" />
          {[0, 1, 2].map((n) => (
            <i
              className="fly"
              key={n}
              style={{ animationDelay: -n * 1.3 + "s" }}
            >
              🪰
            </i>
          ))}
        </>
      )}
      {effect === "SMEGMA" && (
        <>
          <div className="cheese-halo" />
          <div className="cheese-orbit">
            {[0, 1, 2, 3].map((n) => (
              <span
                key={n}
                style={{ "--orbit": n * 90 + "deg" } as React.CSSProperties}
              >
                🧀
              </span>
            ))}
          </div>
          <div className="cheese-sparkles">✦ · ✧ · ✦</div>
        </>
      )}
    </div>
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
        (locked ? "locked " : "") +
        "card-" +
        effect.toLowerCase()
      }
      style={{ "--rarity": colors[item.rarity] } as React.CSSProperties}
    >
      <div className="card-art">
        <ItemArt item={item} />
        <CardEffect effect={effect} />
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
            ? odds.toFixed(3) + "% chance"
            : effect === "NONE"
              ? "UNMODIFIED · UPGRADE USED"
              : effect !== "RAW"
                ? effect + " EFFECT"
                : locked
                  ? "NOT DISCOVERED"
                  : "ORIGINAL"}
        </span>
        {odds === undefined && !locked && (
          <strong className="card-price">
            {cardValue(item, effect).toLocaleString("en-GB")} SN
          </strong>
        )}
        {children}
      </div>
    </article>
  );
}
