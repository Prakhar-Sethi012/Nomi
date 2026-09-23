import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Pressable from './Pressable';
import SegmentedControl from './SegmentedControl';
import { useAppMotion } from '../../hooks/useAppMotion';
import { fadeUp, staggerParent } from '../../motion/variants';

const TEXTURES = [
  { value: 'pen', label: '🖊️' },
  { value: 'marker', label: '🖍️' },
  { value: 'pencil', label: '✏️' },
];

const SIZES = [
  { value: 2, label: 'S' },
  { value: 5, label: 'M' },
  { value: 10, label: 'L' },
  { value: 18, label: 'XL' },
];

const CURATED_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

// Same shape as the shared fadeUp variant, but with x pinned at -50% so the
// horizontally-centered popover doesn't hit the same transform-clobbering
// issue as the bar itself (see the note on the outer motion.div below).
const popoverVariants = {
  hidden: { opacity: 0, y: 8, x: '-50%' },
  visible: { opacity: 1, y: 0, x: '-50%' },
  exit: { opacity: 0, y: -8, x: '-50%' },
};

// Floating brush control panel for Doodle mode — lives inside the canvas's
// own relatively-positioned container so it works the same embedded or in
// Focus Mode's fullscreen portal. The first two swatches are resolved from
// the live theme (not stored as the literal "var(--color-accent)" string)
// since canvas 2D's strokeStyle can't reliably parse CSS custom properties.
//
// Color and size used to render as two long inline rows (8 swatches + 4
// sizes) sitting directly in the bar — cluttered on a phone-width screen and
// most of it isn't in-use most of the time. Both now collapse behind a
// single trigger that shows the current value and pops the options open
// above the bar on demand.
function DoodleToolbar({ color, onColorChange, size, onSizeChange, texture, onTextureChange, isEraser, onToggleEraser, isPanMode, onTogglePan }) {
  const m = useAppMotion();
  const containerRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(null); // null | 'color' | 'size'
  const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#f59e0b';
  const themeInk = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#ffffff';
  const palette = [themeAccent, themeInk, ...CURATED_PALETTE];

  // "Tap the canvas to auto-collapse" doesn't need any wiring from the
  // canvas itself — a pointerdown anywhere outside this whole control
  // (which includes the canvas, since it's a sibling) is exactly that.
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openMenu]);

  const toggleMenu = (menu) => setOpenMenu((prev) => (prev === menu ? null : menu));

  return (
    <motion.div
      ref={containerRef}
      // Centering has to go through Framer's own x motion value, not a
      // Tailwind -translate-x-1/2 class: Framer composes x/y/scale into one
      // inline `transform`, which fully replaces (not merges with) whatever
      // transform a CSS class set, silently cancelling the horizontal
      // centering the moment the mount animation resolves.
      initial={{ opacity: 0, y: 24, scale: 0.9, x: '-50%' }}
      animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
      transition={m.pop}
      className="absolute bottom-4 left-1/2 z-20"
    >
      <AnimatePresence>
        {openMenu && (
          <motion.div
            key={openMenu}
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={m.pop}
            className="absolute bottom-full left-1/2 mb-2 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2 max-w-[calc(100vw-2rem)] overflow-x-auto custom-scrollbar"
          >
            {openMenu === 'color' && palette.map((swatch) => {
              const active = color === swatch;
              return (
                <Pressable
                  key={swatch}
                  as="div"
                  haptic="selection"
                  onClick={() => { onColorChange(swatch); setOpenMenu(null); }}
                  title={swatch}
                  className="relative w-7 h-7 rounded-full cursor-pointer flex items-center justify-center shrink-0"
                >
                  {active && (
                    <motion.span
                      layoutId="doodle-swatch-ring"
                      className="absolute inset-[-3px] rounded-full border-2 border-textPrimary"
                      transition={m.gentle}
                    />
                  )}
                  <span className="w-full h-full rounded-full" style={{ background: swatch }} />
                </Pressable>
              );
            })}

            {openMenu === 'size' && SIZES.map((s) => {
              const active = size === s.value;
              return (
                <Pressable
                  key={s.value}
                  as="div"
                  haptic="selection"
                  onClick={() => { onSizeChange(s.value); setOpenMenu(null); }}
                  title={s.label}
                  className="cursor-pointer flex flex-col items-center justify-center gap-1 w-9 h-9 rounded-lg shrink-0"
                >
                  <motion.span
                    className={`rounded-full ${active ? 'bg-accent' : 'bg-textSecondary/50'}`}
                    animate={{ scale: active ? 1.15 : 1 }}
                    transition={m.snappy}
                    style={{ width: Math.max(4, s.value * 0.9), height: Math.max(4, s.value * 0.9) }}
                  />
                  <span className={`text-[9px] font-bold ${active ? 'text-accent' : 'text-textSecondary'}`}>{s.label}</span>
                </Pressable>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl px-3 py-2 max-w-[calc(100vw-2rem)] overflow-x-auto custom-scrollbar">
        <motion.div variants={staggerParent(0.06)} initial="hidden" animate="visible" className="flex items-center gap-2 w-max">
          <motion.div variants={fadeUp} className={isEraser ? 'opacity-40 pointer-events-none' : ''}>
            <Pressable
              haptic="selection"
              onClick={() => toggleMenu('color')}
              title="Color"
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${openMenu === 'color' ? 'border-textPrimary' : 'border-transparent'}`}
            >
              <span className="w-5 h-5 rounded-full block" style={{ background: color }} />
            </Pressable>
          </motion.div>

          <motion.div variants={fadeUp} className="w-px h-7 bg-border" />

          <motion.div variants={fadeUp}>
            <Pressable
              haptic="selection"
              onClick={() => toggleMenu('size')}
              title="Brush size"
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${openMenu === 'size' ? 'border-textPrimary bg-surfaceHover' : 'border-transparent'}`}
            >
              <span className="rounded-full bg-textPrimary" style={{ width: Math.max(4, size * 0.9), height: Math.max(4, size * 0.9) }} />
            </Pressable>
          </motion.div>

          <motion.div variants={fadeUp} className="w-px h-7 bg-border" />

          <motion.div variants={fadeUp} className={isEraser ? 'opacity-40 pointer-events-none' : ''}>
            <SegmentedControl options={TEXTURES} value={texture} onChange={(v) => { onTextureChange(v); setOpenMenu(null); }} layoutId="doodle-texture" />
          </motion.div>

          <motion.div variants={fadeUp} className="w-px h-7 bg-border" />

          <motion.div variants={fadeUp}>
            <Pressable
              haptic="selection"
              onClick={onToggleEraser}
              title="Eraser"
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${isEraser ? 'bg-accent text-white' : 'bg-surfaceHover hover:bg-border text-textPrimary'}`}
            >
              🧽
            </Pressable>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Pressable
              haptic="selection"
              onClick={onTogglePan}
              title="Pan canvas"
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${isPanMode ? 'bg-accent text-white' : 'bg-surfaceHover hover:bg-border text-textPrimary'}`}
            >
              ✋
            </Pressable>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default DoodleToolbar;
