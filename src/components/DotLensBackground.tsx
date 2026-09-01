import { useEffect, useState } from "react";

import DotLens from "./DotLens";

/**
 * Theme bridge for DotLens. The shader parses plain hex/rgb strings and has no
 * idea what a CSS variable is, so the palette has to be resolved to literal
 * values here and handed down as props. DotLens re-reads its props every frame,
 * so a new palette lands on the very next one without remounting the context.
 */

interface Palette {
  background: string;
  baseColor: string;
  accentColor: string;
}

/* Mirrors the light tokens in global.css. Only ever used during the build's
   static render, where there is no document to read the real values from. */
const SSR_PALETTE: Palette = {
  background: "#FAFAF9",
  baseColor: "#C9C9C5",
  accentColor: "#1B47C4",
};

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    background: token("--bg", SSR_PALETTE.background),
    /* --field-dot, not --text-muted: the field is decoration and has to stay
       quiet even as the text tokens get pushed for contrast. */
    baseColor: token("--field-dot", SSR_PALETTE.baseColor),
    accentColor: token("--accent", SSR_PALETTE.accentColor),
  };
}

export default function DotLensBackground() {
  /* Lazy initialiser rather than an effect-only read: on the client's first
     render the document already exists, so the field never paints one frame in
     the wrong palette before correcting itself. */
  const [palette, setPalette] = useState<Palette>(() =>
    typeof document === "undefined" ? SSR_PALETTE : readPalette(),
  );

  useEffect(() => {
    const sync = () => setPalette(readPalette());
    sync();

    /* Two independent ways the palette moves: the toggle writes data-theme on
       <html>, and the OS preference shifts it without touching any attribute. */
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
    };
  }, []);

  return (
    <DotLens
      background={palette.background}
      baseColor={palette.baseColor}
      accentColor={palette.accentColor}
      density={32}
      dotSize={48}
      reach={7}
      minSize={9}
      speed={65}
      hover={100}
      style={{
        /* Fixed, not absolute: the field backs the whole page, and an absolute
           one would stretch the canvas to the full document height — several
           times the pixels to shade every frame, for a stretch that is off
           screen anyway. Pinned to the viewport it stays one screen wide and
           the content scrolls over it. */
        position: "fixed",
        inset: 0,
        zIndex: -1,
        /* DotLens floors itself at 1200x800 for its Framer host; here it fills
           a section that is routinely narrower than that on a phone. */
        minWidth: 0,
        minHeight: 0,
        /* The prop above feeds the shader; this keeps the DOM box itself on the
           CSS variable, so the pre-hydration paint is already the right colour
           and never flashes light behind a dark page. */
        background: "var(--bg)",
      }}
    />
  );
}
