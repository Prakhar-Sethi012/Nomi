// Derives a 4-stop gradient from a single base color — used to turn each
// expense category's flat color (categoryColors in ExpensesView.jsx) into a
// richer, more attractive-looking gradient for the donut chart arcs and
// progress bars, without inventing new hues: every stop is a tint/shade of
// that same category's existing color.

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = 60 * (((g - b) / d) % 6); break;
      case g: h = 60 * ((b - r) / d + 2); break;
      default: h = 60 * ((r - g) / d + 4);
    }
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const lRatio = l / 100;
  const a = (s / 100) * Math.min(lRatio, 1 - lRatio);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = lRatio - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const clampLightness = (v) => Math.min(90, Math.max(10, v));
const clampSaturation = (v) => Math.min(100, Math.max(0, v));

// Four stops, darkest to lightest, all sharing the base hue — reads as one
// coherent color with depth/sheen rather than four unrelated colors.
export function getCategoryGradient(baseHex) {
  const { h, s, l } = rgbToHsl(hexToRgb(baseHex));
  const steps = [
    { l: l - 22, s: s + 8 },
    { l: l - 4, s },
    { l: l + 14, s: s + 4 },
    { l: l + 28, s: s - 10 },
  ];
  return steps.map((step) => hslToHex(h, clampSaturation(step.s), clampLightness(step.l)));
}
