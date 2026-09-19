import { motion } from 'motion/react';
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

// Floating brush control panel for Doodle mode — lives inside the canvas's
// own relatively-positioned container so it works the same embedded or in
// Focus Mode's fullscreen portal. The first two swatches are resolved from
// the live theme (not stored as the literal "var(--color-accent)" string)
// since canvas 2D's strokeStyle can't reliably parse CSS custom properties.
function DoodleToolbar({ color, onColorChange, size, onSizeChange, texture, onTextureChange, isPanMode, onTogglePan }) {
  const m = useAppMotion();
  const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#f59e0b';
  const themeInk = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#ffffff';
  const palette = [themeAccent, themeInk, ...CURATED_PALETTE];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={m.pop}
      // 8 color swatches + size buttons + texture control + pan button, all
      // in one row, easily add up to 600px+ — wider than most phones. Without
      // a width cap this floating panel (centered via left-1/2/-translate)
      // just overflows equally off both edges with no way to scroll to
      // whatever lands outside the viewport, taking the size buttons with it
      // on mobile. max-w + overflow-x-auto keeps every control reachable.
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl px-4 py-3 max-w-[calc(100vw-2rem)] overflow-x-auto custom-scrollbar"
    >
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="visible" className="flex items-center gap-4 w-max">
        <motion.div variants={fadeUp} className="flex items-center gap-1.5">
          {palette.map((swatch) => {
            const active = color === swatch;
            return (
              <Pressable
                key={swatch}
                as="div"
                haptic="selection"
                onClick={() => onColorChange(swatch)}
                title={swatch}
                className="relative w-6 h-6 rounded-full cursor-pointer flex items-center justify-center"
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
        </motion.div>

        <motion.div variants={fadeUp} className="w-px h-8 bg-border" />

        <motion.div variants={fadeUp} className="flex items-center gap-2">
          {SIZES.map((s) => {
            const active = size === s.value;
            return (
              <Pressable
                key={s.value}
                as="div"
                haptic="selection"
                onClick={() => onSizeChange(s.value)}
                title={s.label}
                className="cursor-pointer flex items-center justify-center w-7 h-7 rounded-full"
              >
                <motion.span
                  className={`rounded-full ${active ? 'bg-accent' : 'bg-textSecondary/50'}`}
                  animate={{ scale: active ? 1.15 : 1 }}
                  transition={m.snappy}
                  style={{ width: Math.max(4, s.value * 0.9), height: Math.max(4, s.value * 0.9) }}
                />
              </Pressable>
            );
          })}
        </motion.div>

        <motion.div variants={fadeUp} className="w-px h-8 bg-border" />

        <motion.div variants={fadeUp}>
          <SegmentedControl options={TEXTURES} value={texture} onChange={onTextureChange} layoutId="doodle-texture" />
        </motion.div>

        <motion.div variants={fadeUp} className="w-px h-8 bg-border" />

        <motion.div variants={fadeUp}>
          <Pressable
            haptic="selection"
            onClick={onTogglePan}
            title="Pan canvas"
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors ${isPanMode ? 'bg-accent text-white' : 'bg-surfaceHover hover:bg-border text-textPrimary'}`}
          >
            ✋
          </Pressable>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default DoodleToolbar;
