// Personalized weather one-liners — checked before falling back to the
// generic developer-humor quotes in WeatherWidget.jsx.
//
// Each rule matches on a `condition` key (the same strings WeatherWidget
// already uses: 'clear', 'cloudy', 'foggy', 'raining', 'snowing', 'thunder',
// 'default') and/or a temperature bracket via `minTemp`/`maxTemp` (°C,
// inclusive on both ends). Leave either bound out to leave that side
// unbounded. Rules are checked in order and the FIRST match wins, so put
// more specific brackets before broader ones.
//
// Fill in real lines for the placeholders below whenever you're ready —
// nothing else needs to change, getPersonalizedMessage() picks them up
// automatically.
export const PERSONALIZED_WEATHER_MESSAGES = [
  {
    id: 'scorching-clear',
    condition: 'clear',
    minTemp: 35,
    messages: [
      'PLACEHOLDER_SCORCHING_CLEAR_1',
      'PLACEHOLDER_SCORCHING_CLEAR_2',
    ],
  },
  {
    id: 'cool-clear',
    condition: 'clear',
    maxTemp: 25,
    messages: [
      'PLACEHOLDER_COOL_CLEAR_1',
      'PLACEHOLDER_COOL_CLEAR_2',
    ],
  },
  {
    id: 'hot-rain',
    condition: 'raining',
    minTemp: 30,
    messages: [
      'PLACEHOLDER_HOT_RAIN_1',
      'PLACEHOLDER_HOT_RAIN_2',
    ],
  },
  {
    id: 'cool-rain',
    condition: 'raining',
    maxTemp: 25,
    messages: [
      'PLACEHOLDER_COOL_RAIN_1',
      'PLACEHOLDER_COOL_RAIN_2',
    ],
  },
];

// Returns one random personalized message for the given condition/temp, or
// null if no rule matches — the caller should fall back to the generic
// quotes in that case.
export function getPersonalizedMessage(conditionKey, temp) {
  const rule = PERSONALIZED_WEATHER_MESSAGES.find((r) => {
    if (r.condition && r.condition !== conditionKey) return false;
    if (r.minTemp !== undefined && !(temp >= r.minTemp)) return false;
    if (r.maxTemp !== undefined && !(temp <= r.maxTemp)) return false;
    return true;
  });
  if (!rule || rule.messages.length === 0) return null;
  return rule.messages[Math.floor(Math.random() * rule.messages.length)];
}
