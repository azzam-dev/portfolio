import { useState } from "react";

export interface Layer {
  id: string;
  label: string;
  note: string;
}

interface Props {
  layers: Layer[];
  dir: "rtl" | "ltr";
}

/**
 * The Surface / Under the Hood diagram. Layers stagger in on mount (CSS
 * animation, skipped under prefers-reduced-motion via global.css) and each
 * one expands on click to show the reasoning behind it. Only one layer is
 * open at a time — the point is a focused read, not a wall of text.
 */
export default function LayerReveal({ layers, dir }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div dir={dir} className="flex flex-col gap-2">
      {layers.map((layer, i) => {
        const isOpen = openId === layer.id;
        return (
          <div
            key={layer.id}
            style={{ animationDelay: `${i * 70}ms` }}
            className="layer-reveal-item rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : layer.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start"
            >
              <span className="flex items-center gap-3">
                <span className="mono text-xs text-[var(--text-muted)] w-5 text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{layer.label}</span>
              </span>
              <span
                className="text-[var(--text-muted)] transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-sm text-[var(--text-muted)] leading-relaxed">
                  {layer.note}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        .layer-reveal-item {
          animation: layer-reveal-in var(--duration-slow, 400ms) var(--ease-out, ease-out) both;
        }
        @keyframes layer-reveal-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .layer-reveal-item { animation: none; }
        }
      `}</style>
    </div>
  );
}
