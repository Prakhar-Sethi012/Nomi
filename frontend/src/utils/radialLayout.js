import { useMemo } from 'react';

// Pure trigonometry for arranging items along a semi-circular arc — no
// React/Motion dependencies, so this is easy to reason about (and unit test)
// in isolation from the drag physics (useRotaryDrag) and the component that
// wires it all together (RadialNav).
//
// Angle convention: 0° points right, 90° points straight up, 180° points
// left. Screen y grows downward, so "up" is -sin, not +sin.
export function polarToCartesian(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: radius * Math.cos(rad),
    y: -radius * Math.sin(rad),
  };
}

// Wraps a continuous index difference into (-itemCount/2, itemCount/2] —
// the shortest signed "distance", in item-slots, between two positions on a
// virtual ring of `itemCount` equally-spaced items. This is deliberately
// independent of the 45°-per-slot *display* spacing used below: the display
// spacing only has to divide a 180° arc into 5 visible slots, while the
// item count can be anything (10 items don't tile evenly into 45° steps
// around a real 360° circle — 360/45 = 8 — but they don't need to, since
// items past the visible window are just faded out, never actually drawn
// at collidable angles around a literal full circle).
export function wrapIndexDelta(delta, itemCount) {
  return delta - itemCount * Math.round(delta / itemCount);
}

// Computes screen position + visibility for one item, given the wheel's
// current rotation (in degrees). `rotation / anglePerSlot` is "which item
// index is currently centered at the top of the arc" — a continuous value,
// so dragging slides items smoothly rather than snapping between them.
function getItemPosition(index, rotationDeg, { itemCount, anglePerSlot, radius, maxVisibleOffset }) {
  const centerIndex = rotationDeg / anglePerSlot;
  const offset = wrapIndexDelta(index - centerIndex, itemCount);
  const angleDeg = 90 + offset * anglePerSlot;
  const { x, y } = polarToCartesian(angleDeg, radius);

  // Full opacity for the center 3 slots (offset -1..1); fades linearly
  // across the outer 2 (offset 1..2) so the 5th item never just pops in —
  // it rotates into visibility exactly as the user's drag brings it past
  // the edge. Anything past maxVisibleOffset is fully transparent.
  const absOffset = Math.abs(offset);
  const opacity = absOffset <= 1.5
    ? 1
    : Math.max(0, 1 - (absOffset - 1.5) / (maxVisibleOffset - 1.5));
  const scale = 0.7 + 0.3 * opacity;

  return { x, y, opacity, scale, offset };
}

// Bundles the arc's static config (item count, spacing, radius) and returns
// a `getPosition(index, rotationDeg)` calculator bound to it — the one place
// both the static layout and RadialNav's per-frame transforms agree on.
export function useRadialLayout(itemCount, { anglePerSlot = 45, radius = 115, maxVisibleOffset = 2.5 } = {}) {
  return useMemo(() => {
    const config = { itemCount, anglePerSlot, radius, maxVisibleOffset };
    return {
      anglePerSlot,
      items: Array.from({ length: itemCount }, (_, index) => ({ index })),
      getPosition: (index, rotationDeg) => getItemPosition(index, rotationDeg, config),
    };
  }, [itemCount, anglePerSlot, radius, maxVisibleOffset]);
}
