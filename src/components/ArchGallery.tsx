"use client";

import { useState, type CSSProperties } from "react";

/* Fanned photo arch. Cards sit in a shallow arc, centre-forward, and the one
 * under the cursor straightens, lifts and scales up.
 *
 * Ported from the 21st.dev ArchGallery. The geometry is unchanged — it was
 * already almost all inline style objects, which are framework-agnostic. Only
 * the three Tailwind utility classes on the shell and the image needed
 * replacing, since this project has no Tailwind.
 *
 * Two things added for this site: the cards carry a caption, and they sit on a
 * cream ground with the photograph multiplied into it. The cake photography is
 * shot on white, and against this section's near-black that reads as cut-out
 * rectangles; multiplying drops the studio background into the card instead.
 * Same treatment as .mitem__thumb, same reasoning.
 */

export type ArchItem = {
  src: string;
  alt?: string;
  /** Printed under the photo. Omit for an uncaptioned deck. */
  label?: string;
};

type ArchGalleryProps = {
  items: ArchItem[];
  /** Card width in px. @default 180 */
  cardWidth?: number;
  /** Card height in px. @default 240 */
  cardHeight?: number;
  /** Border radius in px. @default 18 */
  cornerRadius?: number;
  className?: string;
};

const ROTATE_STEP = 6;
const Y_STEP = 18;
const OVERLAP = 0.58;
const HOVER_SCALE = 1.08;
const HOVER_LIFT = 16;

export function ArchGallery({
  items,
  cardWidth = 180,
  cardHeight = 240,
  cornerRadius = 18,
  className = "",
}: ArchGalleryProps) {
  const total = items.length;
  const mid = (total - 1) / 2;
  const [hovered, setHovered] = useState<number | null>(null);

  if (!total) return null;

  const stageWidth =
    cardWidth + Math.abs(mid) * 2 * cardWidth * OVERLAP + cardWidth * 0.2;
  const stageHeight = cardHeight + Math.abs(mid) * Y_STEP + 48;

  return (
    <div
      className={["arch", className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Cakes we bake"
    >
      <div className="arch__stage" style={{ width: stageWidth, height: stageHeight }}>
        {items.map((entry, index) => {
          const offset = index - mid;
          const rotate = offset * ROTATE_STEP;
          const translateY = Math.abs(offset) * Y_STEP;
          const translateX = offset * cardWidth * OVERLAP;
          const baseZ = total - Math.abs(offset);
          const isHovered = hovered === index;

          const cardStyle: CSSProperties = {
            position: "absolute",
            left: "50%",
            top: "50%",
            width: cardWidth,
            height: cardHeight,
            marginLeft: -cardWidth / 2,
            marginTop: -cardHeight / 2,
            borderRadius: cornerRadius,
            transformOrigin: "center center",
            transform: isHovered
              ? `translate(${translateX}px, ${translateY - HOVER_LIFT}px) rotate(0deg) scale(${HOVER_SCALE})`
              : `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(1)`,
            zIndex: isHovered ? total + 1 : baseZ,
          };

          return (
            <div
              key={`${entry.src}-${index}`}
              className={`arch__card${isHovered ? " is-up" : ""}`}
              style={cardStyle}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              aria-label={entry.alt || entry.label || `Photo ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.src} alt="" draggable={false} />
              {entry.label ? <span className="arch__label">{entry.label}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ArchGallery;
