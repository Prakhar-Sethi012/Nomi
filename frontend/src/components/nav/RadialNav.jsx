import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { useRadialLayout } from '../../utils/radialLayout';
import { useRotaryDrag } from '../../hooks/useRotaryDrag';
import { useAppMotion } from '../../hooks/useAppMotion';
import { haptics } from '../../utils/haptics';

const ANGLE_PER_SLOT = 45;
const RADIUS = 115;
const ITEM_SIZE = 48;
const FAB_SIZE = 64;
const DRAG_SURFACE_SIZE = (RADIUS + ITEM_SIZE) * 2;
const RING_R = RADIUS - 5; // 5px inset so the stroke doesn't clip at the viewBox edge
const RING_SIZE = RADIUS * 2;

// Curved label geometry — this is a *separate*, much smaller arc than the
// big wheel-radius guide ring above: it hugs just outside each icon's own
// boundary, not the orbit path. Same for every item, so it's one constant
// path string reused by all of them rather than recomputed per instance.
const ICON_RADIUS = ITEM_SIZE / 2;
const LABEL_PAD = 22; // clearance around the icon box for the curved text
const LABEL_ARC_R = ICON_RADIUS + 7;
const LABEL_BOX = ITEM_SIZE + LABEL_PAD * 2;
const LABEL_CENTER = LABEL_PAD + ICON_RADIUS;
// A semicircle arcing over the TOP of the icon (sweep-flag 0), left point to
// right point. Text laid along this — left to right, un-flipped — renders
// with each glyph's baseline hugging the curve and its cap-height pointing
// away from the icon: exactly "letters arch over the top, bottoms point
// inward toward the icon" with no manual per-character rotation at all.
const LABEL_CURVE_D = `M ${LABEL_CENTER - LABEL_ARC_R} ${LABEL_CENTER} A ${LABEL_ARC_R} ${LABEL_ARC_R} 0 0 0 ${LABEL_CENTER + LABEL_ARC_R} ${LABEL_CENTER}`;

// Dashboard and Profile are pinned entirely outside the wheel, as plain
// fixed-position corner buttons (see App.jsx) — reached often enough that a
// two-step "open wheel, find icon" flow was too much friction. Timetable
// used to get the same treatment but rides the wheel now, same as
// everything else here.
const NAV_ITEMS = [
  { id: 'expenses', label: 'Finance', icon: '💰' },
  { id: 'radar', label: 'Radar', icon: '📡' },
  { id: 'scratchpad', label: 'Scratchpad', icon: '📝' },
  { id: 'strategy', label: 'Strategy', icon: '🔮' },
  { id: 'links', label: 'Directory', icon: '🔗' },
  { id: 'closeFriends', label: 'Close Friends', icon: '💾' },
  { id: 'timetable', label: 'Timetable', icon: '🗓️' },
  { id: 'logout', label: 'Logout', icon: '🚪', isDanger: true },
];

// One arc item. A separate component (not an inline callback inside a
// .map()) so its useTransform/useMotionValue calls sit at the top level of
// a function component, same as any other hook — calling hooks inside a
// .map() callback works at runtime for a fixed-length array like this one,
// but still trips the rules-of-hooks lint rule, which can't see that the
// array length never changes.
function RadialNavItem({ item, index, rotation, layout, isOpen, isActive, m, onNavigate }) {
  // A local 0→1 "how open am I" value, separate from the shared `rotation`,
  // so each item can spring open with its own staggered delay (a fan-out
  // reveal) instead of every icon appearing in lockstep.
  const progress = useMotionValue(isOpen ? 1 : 0);

  useEffect(() => {
    const controls = animate(progress, isOpen ? 1 : 0, {
      ...m.pop,
      delay: m.reduced ? 0 : isOpen ? index * 0.03 : 0,
    });
    return controls.stop;
  }, [isOpen, index, m, progress]);

  const x = useTransform([rotation, progress], ([r, p]) => layout.getPosition(index, r).x * p);
  const y = useTransform([rotation, progress], ([r, p]) => layout.getPosition(index, r).y * p);
  const opacity = useTransform([rotation, progress], ([r, p]) => layout.getPosition(index, r).opacity * p);
  const scale = useTransform([rotation, progress], ([r, p]) => layout.getPosition(index, r).scale * (0.5 + 0.5 * p));
  // A collapsed/edge-faded icon must never be tappable just because it's
  // still technically mounted — otherwise the *first* item in DOM order
  // (or whichever one ends up on top during the brief fan-out animation)
  // can silently eat a tap meant for the FAB while everything is still
  // stacked at opacity 0. Recomputed off the same opacity transform rather
  // than a fixed threshold on `isOpen`, so it tracks the real edge-fade too.
  const pointerEvents = useTransform(opacity, (o) => (o > 0.05 ? 'auto' : 'none'));
  const pathId = `radial-label-curve-${item.id}`;

  return (
    <div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, marginLeft: -ITEM_SIZE / 2, marginTop: -ITEM_SIZE / 2 }}
    >
      {/* Icon + curved label move together as one rigid unit, so the label
          never needs its own per-frame rotation math — it just inherits
          whatever x/y/scale the icon already has. */}
      <motion.div style={{ x, y, opacity, scale, pointerEvents }} className="absolute inset-0">
        <svg
          viewBox={`0 0 ${LABEL_BOX} ${LABEL_BOX}`}
          style={{ position: 'absolute', left: -LABEL_PAD, top: -LABEL_PAD, width: LABEL_BOX, height: LABEL_BOX }}
          className={`pointer-events-none ${item.isDanger ? 'text-danger' : 'text-textSecondary'}`}
          aria-hidden="true"
        >
          <path id={pathId} d={LABEL_CURVE_D} fill="none" />
          <text fill="currentColor" style={{ fontSize: 9, fontWeight: 700 }}>
            <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
              {item.label}
            </textPath>
          </text>
        </svg>

        <button
          type="button"
          onClick={() => onNavigate(item)}
          aria-label={item.label}
          title={item.label}
          className={`absolute inset-0 rounded-full flex items-center justify-center text-xl shadow-lg border-2 transition-colors ${
            item.isDanger
              ? 'bg-background border-danger text-danger'
              : isActive
                ? 'bg-accent border-accentHover text-white'
                : 'bg-background border-accent text-textPrimary'
          }`}
        >
          {item.icon}
        </button>
      </motion.div>
    </div>
  );
}

// Replaces BottomTabBar + MoreSheet with a central FAB that expands into a
// semi-circular dial: drag left/right to rotate through the destinations,
// tap a visible icon to navigate. Home and Profile are pinned separately, as
// plain fixed-position corner buttons outside this wheel entirely — see
// App.jsx. Mobile only, same `md:hidden` split as the bar it replaces.
function RadialNav({ activeTab, onSelect, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const m = useAppMotion();
  const layout = useRadialLayout(NAV_ITEMS.length, { anglePerSlot: ANGLE_PER_SLOT, radius: RADIUS });
  const { rotation, onPanStart, onPan, onPanEnd } = useRotaryDrag(ANGLE_PER_SLOT, m);

  const toggleOpen = () => {
    haptics.tap();
    setIsOpen((prevOpen) => {
      const opening = !prevOpen;
      if (opening) {
        // Spin the currently active tab to the top of the arc, so opening
        // the dial always shows you where you already are.
        const activeIndex = NAV_ITEMS.findIndex((item) => item.id === activeTab);
        if (activeIndex >= 0) animate(rotation, activeIndex * ANGLE_PER_SLOT, m.gentle);
      }
      return opening;
    });
  };

  const handleNavigate = (item) => {
    haptics.selection();
    setIsOpen(false);
    if (item.id === 'logout') onLogout();
    else onSelect(item.id);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="radial-backdrop"
            className="md:hidden fixed inset-0 z-30 bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={m.base}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="md:hidden fixed bottom-4 inset-x-0 z-30 flex items-center justify-center"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative" style={{ width: FAB_SIZE, height: FAB_SIZE }}>

          {/* Guide ring: a static "track" the icons visually slide along.
              Deliberately doesn't rotate with the wheel — a fixed rail with
              icons moving along it reads more like a real track than one
              where the rail itself also spins. Purely decorative, so it
              sits behind everything else and never intercepts a touch. */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                key="radial-guide-ring"
                className="absolute pointer-events-none"
                style={{
                  width: RING_SIZE,
                  height: RING_SIZE,
                  left: '50%',
                  top: '50%',
                  marginLeft: -RING_SIZE / 2,
                  marginTop: -RING_SIZE / 2,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={m.base}
              >
                <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="w-full h-full overflow-visible" aria-hidden="true">
                  <path
                    d={`M ${RADIUS - RING_R} ${RADIUS} A ${RING_R} ${RING_R} 0 0 0 ${RADIUS + RING_R} ${RADIUS}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 7"
                    strokeLinecap="round"
                    className="text-border"
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drag surface: sits behind the FAB/icons in stacking order, so
              taps on them still win hit-testing, but any touch landing on
              the empty arc space (or the FAB/icons themselves, since pan
              and click aren't mutually exclusive) rotates the wheel. It's
              sized to the arc, not the screen, so it can't intercept
              scroll/pull-to-refresh gestures anywhere else on the page. */}
          {isOpen && (
            <motion.div
              className="absolute rounded-full touch-none"
              style={{
                width: DRAG_SURFACE_SIZE,
                height: DRAG_SURFACE_SIZE,
                left: '50%',
                top: '50%',
                marginLeft: -DRAG_SURFACE_SIZE / 2,
                marginTop: -DRAG_SURFACE_SIZE / 2,
              }}
              onPanStart={onPanStart}
              onPan={onPan}
              onPanEnd={onPanEnd}
              onClick={() => setIsOpen(false)}
            />
          )}

          {NAV_ITEMS.map((item, index) => (
            <RadialNavItem
              key={item.id}
              item={item}
              index={index}
              rotation={rotation}
              layout={layout}
              isOpen={isOpen}
              isActive={item.id === activeTab}
              m={m}
              onNavigate={handleNavigate}
            />
          ))}

          <motion.button
            type="button"
            onClick={toggleOpen}
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={m.snappy}
            whileTap={{ scale: 0.92 }}
            className="absolute inset-0 rounded-full bg-background text-textPrimary text-3xl font-bold shadow-2xl border-2 border-accent flex items-center justify-center z-10"
          >
            +
          </motion.button>
        </div>
      </div>
    </>
  );
}

export default RadialNav;
