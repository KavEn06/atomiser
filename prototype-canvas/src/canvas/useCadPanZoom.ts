import { useEffect, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';

// Zoom range — wider than React Flow's defaults so you can pull back for an
// overview and push in on detail, CAD-style.
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

// React Flow makes wheel behaviour a static, either/or choice: `panOnScroll`
// (trackpad two-finger swipe pans, but a mouse wheel also pans) OR wheel-zoom
// (great for a mouse, but a trackpad swipe then zooms instead of panning).
// CAD apps give you both at once, so we take over the wheel and route by
// gesture. Drag-to-pan (incl. the middle mouse button) stays on React Flow.

type WheelLike = Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode'>;

/**
 * Best-effort "is this a physical mouse wheel?" classifier. A trackpad
 * two-finger swipe streams many small, often fractional pixel deltas and
 * frequently carries a horizontal component; a mouse wheel emits sparse,
 * large, purely-vertical notches (and in Firefox, line/page delta modes).
 * Heuristic — tune the threshold if a given device feels off.
 */
export function isMouseWheel(e: WheelLike): boolean {
  if (e.deltaMode !== 0) return true; // line/page mode → mouse wheel
  if (e.deltaX !== 0) return false; // horizontal component → trackpad
  return Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Only pan/zoom when the wheel happens over the canvas itself, not over a
// floating panel (toolbar, zoom controls) that may want its own scroll.
const overFloatingUI = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest('.react-flow__panel, .react-flow__controls');

export function useCadPanZoom(ref: RefObject<HTMLElement | null>) {
  const rf = useReactFlow();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (overFloatingUI(e.target)) return;
      e.preventDefault(); // stop the page/browser from scrolling or zooming

      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { x, y, zoom } = rf.getViewport();

      // ctrlKey is set by the browser for a trackpad pinch (and for an explicit
      // ctrl/⌘ + wheel); a plain mouse wheel means zoom too. Everything else —
      // a trackpad two-finger swipe — pans.
      if (e.ctrlKey || isMouseWheel(e)) {
        // Pinch deltas arrive small-and-often; wheel notches arrive large-and-
        // sparse. Different gains keep both feeling ~linear.
        const gain = e.ctrlKey ? 0.01 : 0.0015;
        const next = clamp(zoom * Math.exp(-e.deltaY * gain), MIN_ZOOM, MAX_ZOOM);
        // Keep the flow point under the cursor pinned as zoom changes.
        const fx = (px - x) / zoom;
        const fy = (py - y) / zoom;
        rf.setViewport({ x: px - fx * next, y: py - fy * next, zoom: next });
      } else {
        rf.setViewport({ x: x - e.deltaX, y: y - e.deltaY, zoom });
      }
    };

    // Passive listeners can't preventDefault, so register non-passively.
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [rf, ref]);
}
