/**
 * The curtain that parts when you arrive at the menu, then stays.
 *
 * The panels do not leave — they sweep most of the way out and settle as
 * gathered fabric down each edge, held by a silk tieback with a tassel. So the
 * menu reads as a stage the whole time you are on it, not just for a second.
 *
 * Deliberately has no JavaScript at all. It is a server component and the
 * motion is a CSS animation with `forwards` fill, so the panels open whether or
 * not any script runs. A JS-driven version that failed to load would leave the
 * whole menu sitting behind two opaque panels, which is not a risk worth taking
 * for a flourish.
 *
 * The container never takes pointer events, so neither the reveal nor the
 * hanging fabric can swallow a click. It sits below the recipe drawer in the
 * stacking order, so opening a recipe covers the curtain rather than the
 * reverse.
 *
 * Under prefers-reduced-motion it is not displayed at all.
 */
export default function MenuCurtain({ word }: { word: string }) {
  return (
    <div className="curtain" aria-hidden="true">
      <span className="curtain__half curtain__half--l">
        <span className="curtain__tie" />
        <span className="curtain__tassel" />
      </span>
      <span className="curtain__half curtain__half--r">
        <span className="curtain__tie" />
        <span className="curtain__tassel" />
      </span>
      {/* Swagged fabric in all four corners, finishing the proscenium so the
          left and right panels read as one frame rather than two loose sheets. */}
      <span className="curtain__corner curtain__corner--tl" />
      <span className="curtain__corner curtain__corner--tr" />
      <span className="curtain__corner curtain__corner--bl" />
      <span className="curtain__corner curtain__corner--br" />

      <span className="curtain__word tamil">{word}</span>
    </div>
  );
}
