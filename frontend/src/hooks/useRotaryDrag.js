import { useRef } from 'react';
import { useMotionValue, animate } from 'motion/react';

// Pixels of horizontal drag that move the wheel by exactly one 45° slot —
// tuned for a comfortable thumb swipe, not too twitchy or too sluggish.
const PIXELS_PER_SLOT = 70;

// A small velocity-based "fling" added on release, so a fast flick spins the
// wheel a bit further than the raw drag distance — before settling on the
// nearest slot. Kept modest; this is a nav menu, not a slot machine.
const FLING_FACTOR = 0.15;

// Drives the wheel's rotation from a horizontal pan gesture. Deliberately
// uses Motion's onPan/onPanStart/onPanEnd rather than the `drag` prop:
// `drag` physically translates whatever element it's on via its own
// transform, which would fight the per-item x/y transforms RadialNav
// already derives from `rotation` — onPan just reports gesture deltas with
// no movement side effects, which is exactly "read the drag, drive my own
// value, animate everything else off that value" instead.
export function useRotaryDrag(anglePerSlot, m) {
  const rotation = useMotionValue(0);
  const dragStartRotation = useRef(0);
  const degreesPerPixel = anglePerSlot / PIXELS_PER_SLOT;

  const onPanStart = () => {
    dragStartRotation.current = rotation.get();
  };

  const onPan = (_event, info) => {
    rotation.set(dragStartRotation.current + info.offset.x * degreesPerPixel);
  };

  // Snaps to the nearest whole slot on release — a real dial has detents,
  // it doesn't rest wherever your thumb happened to let go.
  const onPanEnd = (_event, info) => {
    const flung = rotation.get() + info.velocity.x * degreesPerPixel * FLING_FACTOR;
    const snapped = Math.round(flung / anglePerSlot) * anglePerSlot;
    animate(rotation, snapped, m.snappy);
  };

  return { rotation, onPanStart, onPan, onPanEnd };
}
