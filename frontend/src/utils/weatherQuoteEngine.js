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

// Clear / Sunny (WMO 0-1) — heat scale.
const CLEAR_45_PLUS = [
  "The sun has chosen violence today.",
  "Congratulations, you’re now being air-fried.",
  "Outside is basically a preheated oven.",
  "Touch grass? Bro, the grass is already cooked.",
  "Your sunscreen just resigned.",
];
const CLEAR_38_44 = [
  "Step outside and immediately question your life choices.",
  "Hydrate like your GPA depends on it.",
  "The sun is doing overtime.",
  "Today’s forecast: 90% sweat, 10% regret.",
  "AC isn’t a luxury anymore. It’s infrastructure.",
];
const CLEAR_30_37 = [
  "Warm enough to make your phone overheat too.",
  "Sunny outside, sweaty inside.",
  "The sun said: no jackets allowed.",
  "Perfect weather for doing absolutely nothing outdoors.",
  "Your fan deserves employee of the month.",
];
const CLEAR_20_29 = [
  "Okay, this weather is actually showing off.",
  "Go outside. The weather has earned it.",
  "Nature finally understood the assignment.",
  "Touch grass. Today it’s actually pleasant.",
  "10/10 weather. Zero complaints detected.",
];
const CLEAR_10_19 = [
  "Hoodie weather has officially entered the chat.",
  "Cold enough to justify cancelling plans.",
  "Perfect temperature for becoming one with your blanket.",
  "The sun is out, but emotionally it’s winter.",
  "Grab a hoodie and pretend you’re in a Netflix series.",
];

// Cloudy / Overcast (WMO 2-3) — humidity scale.
const CLOUDY_38_PLUS = [
  "No sunlight, still somehow getting cooked.",
  "The clouds are hiding the sun but forgot to turn off the heat.",
  "Cloudy outside, sauna inside.",
  "The sky said 'shade,' the humidity said 'SIKE.'",
  "Weather.exe has stopped responding.",
];
const CLOUDY_30_37 = [
  "Cloudy and sticky. Nature’s personal hug.",
  "Your hair has officially lost the battle.",
  "Humidity: 100. Dignity: loading…",
  "Feels like the air is giving you a wet handshake.",
  "Not raining. Just aggressively moist.",
];
const CLOUDY_20_29 = [
  "Clouds, breeze, peace. Somebody cooked.",
  "The sky is wearing its comfy clothes today.",
  "Perfect weather for pretending you’re productive.",
  "10/10. Would recommend going outside.",
  "The weather equivalent of a perfectly made bed.",
];
const CLOUDY_10_19 = [
  "Cold, grey, and absolutely not getting out of bed.",
  "The sky looks as tired as you feel.",
  "Perfect weather to disappear under a blanket.",
  "Today’s productivity has been postponed indefinitely.",
  "Cloudy enough to make even your alarm give up.",
];

const isRainCode = (code) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
const isThunderCode = (code) => code >= 95 && code <= 99;
const isFogCode = (code) => code >= 45 && code <= 48;
const isClearCode = (code) => code === 0 || code === 1;
const isCloudyCode = (code) => code === 2 || code === 3;

const pickRandom = (quotes) => quotes[Math.floor(Math.random() * quotes.length)];

// Below 10°C isn't covered by the given brackets (rare in Vellore) — the
// coldest defined bracket is the closest honest fallback rather than
// inventing a new bracket that wasn't specified.
const bracketFor = (temp, brackets) => {
  if (temp >= 45) return brackets.plus45;
  if (temp >= 38) return brackets.from38;
  if (temp >= 30) return brackets.from30;
  if (temp >= 20) return brackets.from20;
  return brackets.from10;
};

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

  const override = getOverrideQuote(wmoCode);
  if (override) return override;

  if (isClearCode(wmoCode)) {
    return pickRandom(bracketFor(temp, {
      plus45: CLEAR_45_PLUS, from38: CLEAR_38_44, from30: CLEAR_30_37, from20: CLEAR_20_29, from10: CLEAR_10_19,
    }));
  }

  if (isCloudyCode(wmoCode)) {
    // Cloudy has no separate ">=45" bracket in the spec — 38°C+ covers it.
    return pickRandom(bracketFor(temp, {
      plus45: CLOUDY_38_PLUS, from38: CLOUDY_38_PLUS, from30: CLOUDY_30_37, from20: CLOUDY_20_29, from10: CLOUDY_10_19,
    }));
  }

  return null;
}
