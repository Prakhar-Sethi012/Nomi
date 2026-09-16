import Pressable from './Pressable';

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
function DoodleToolbar({ color, onColorChange, size, onSizeChange }) {
  const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#f59e0b';
  const themeInk = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#ffffff';
  const palette = [themeAccent, themeInk, ...CURATED_PALETTE];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        {palette.map((swatch) => (
          <Pressable
            key={swatch}
            as="div"
            haptic="selection"
            onClick={() => onColorChange(swatch)}
            title={swatch}
            className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all ${color === swatch ? 'border-textPrimary scale-110' : 'border-border/50'}`}
            style={{ background: swatch }}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-border" />

      <div className="flex items-center gap-2">
        {SIZES.map((s) => (
          <Pressable
            key={s.value}
            as="div"
            haptic="selection"
            onClick={() => onSizeChange(s.value)}
            title={s.label}
            className="cursor-pointer flex items-center justify-center w-7 h-7 rounded-full"
          >
            <span
              className={`rounded-full transition-all ${size === s.value ? 'bg-accent' : 'bg-textSecondary/50'}`}
              style={{ width: Math.max(4, s.value * 0.9), height: Math.max(4, s.value * 0.9) }}
            />
          </Pressable>
        ))}
      </div>
    </div>
  );
}

export default DoodleToolbar;
