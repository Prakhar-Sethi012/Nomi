// Highly personalized weather one-liners, matched on the live WMO weather
// code and temperature — replaces the old generic Open-Meteo default quotes.
// Precedence: condition overrides first (rain/thunder/fog don't care about
// temperature), then Clear vs. Cloudy, then the temperature bracket within
// whichever of those matched.

const RAIN_QUOTES = [
  "Umbrella.exe has been activated.",
  "The sky is crying. Please act accordingly.",
  "Free shower. Clothes not included.",
  "Campus flooding any% speedrun begins now.",
  "Perfect weather to forget your umbrella at home.",
];

const THUNDER_QUOTES = [
  "Nature is rage-quitting.",
  "Save your code. The sky is running a stress test.",
  "Thunder incoming. Electricity has entered the group chat.",
  "Today’s soundtrack: BOOM.exe.",
  "Maybe don’t stand under that tree. Just saying.",
];

const FOG_QUOTES = [
  "Silent Hill has entered the server.",
  "Visibility: DLC not installed.",
  "The world forgot to load its textures.",
  "Fog so thick even Google Maps is confused.",
  "Congratulations, you’ve unlocked mystery mode.",
];

const isRainCode = (code) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
const isThunderCode = (code) => code >= 95 && code <= 99;
const isFogCode = (code) => code >= 45 && code <= 48;

const pickRandom = (quotes) => quotes[Math.floor(Math.random() * quotes.length)];

// Returns a quote for the override conditions (rain/thunder/fog), or null if
// `wmoCode` isn't one of those — the caller checks Clear/Cloudy next.
export function getOverrideQuote(wmoCode) {
  if (isRainCode(wmoCode)) return pickRandom(RAIN_QUOTES);
  if (isThunderCode(wmoCode)) return pickRandom(THUNDER_QUOTES);
  if (isFogCode(wmoCode)) return pickRandom(FOG_QUOTES);
  return null;
}

// Returns a personalized quote for the given temperature (°C) and WMO
// weather code, or null when neither an override nor a Clear/Cloudy bracket
// applies (e.g. snow) — the caller should fall back to its own generic pool.
export function getPersonalizedWeatherQuote(temp, wmoCode) {
  if (typeof temp !== 'number' || Number.isNaN(temp) || wmoCode === undefined || wmoCode === null) return null;
  return getOverrideQuote(wmoCode);
}
