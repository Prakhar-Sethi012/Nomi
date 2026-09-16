import React, { useState, useEffect } from 'react';
import { WeatherAnimationOverlay } from './ui/WeatherAnimations';

// Maps the widget's already-computed theme label to which localized
// animation should play over the card — kept separate from getWeatherTheme
// so the visual effect and the theme colors/copy can evolve independently.
const getAnimationType = (themeText) => {
  if (themeText === 'Raining') return 'rainy';
  if (themeText === 'Partly Cloudy' || themeText === 'Cloudy') return 'cloudy';
  if (themeText === 'Clear Sky') return 'sunny';
  return null;
};

// 🔥 105 Randomized Developer Weather Quotes (15 per condition)
const WEATHER_QUOTES = {
  clear: [
    "Clear skies. Go touch some grass.", "Sun's out, bugs out.", "Brightness set to 100%.",
    "Light mode activated by nature.", "Perfect weather for a kernel panic.", "Soak in the UV rays.",
    "Time to compile outside.", "Vellore heat hitting hard.", "Don't forget to hydrate.",
    "No umbrella needed today.", "Nature's high-res display.", "Clear skies, clear mind.",
    "Sunny with a chance of productive.", "Bask in the glory of a successful build.", "No clouds, no excuses."
  ],
  cloudy: [
    "Cloudy. Perfect dark-mode weather.", "Partly cloudy, mostly coding.", "Clouds in the sky, head in the cloud.",
    "A bit gray, like my terminal.", "No screen glare today.", "Cloudy with a chance of syntax errors.",
    "Looks like an AWS outage out there.", "Sun is taking a quick break.", "Diffuse lighting for better focus.",
    "Cozy enough to stay inside.", "The sky is rendering...", "Gray skies, colorful code.",
    "Sweater weather approaching.", "Ideal conditions for a coding marathon.", "Nature's blue light filter."
  ],
  foggy: [
    "Foggy. Silent Hill vibes outside.", "Render distance set to low.", "Visibility zero, like my future.",
    "Is this real life or a horror game?", "Foggy brain, foggy weather.", "Server connection lost to the sky.",
    "Nature is buffering.", "Can't see the bugs if you can't see anything.", "Mystery awaits in the fog.",
    "Who turned down the opacity?", "A perfect day for debugging.", "The world hasn't fully loaded yet.",
    "Walking through the cloud architecture.", "Caution: Low visibility ahead.", "Lost in the mist and the matrix."
  ],
  raining: [
    "It's raining. Don't melt out there.", "Raindrops keep falling on my code.", "Perfect excuse to cancel plans.",
    "Lofi beats and rain sounds.", "Nature is crying over your code.", "Time to stay in and build.",
    "Rainy days are for side projects.", "Grab a coffee, it's pouring.", "Washing away the spaghetti code.",
    "Let it rain, I'm indoors.", "Pitter-patter goes the keyboard.", "Sky is leaking memory.",
    "Rainy weather, 100% productivity.", "Water cooling for the earth.", "Stay dry, stay coding."
  ],
  snowing: [
    "Snow in Vellore? The simulation is breaking.", "Winter is coming.", "Ice cold algorithms.",
    "Let it snow, let it compile.", "Whiteout conditions.", "Frostbite on the keyboard.",
    "Nature's freezer.", "Snowflakes falling like exceptions.", "Too cold to function.",
    "Hibernation mode activated.", "Snowy days and hot cocoa.", "Chilling with some Python.",
    "Ice ice baby.", "Frozen state.", "Snowball fight pending."
  ],
  thunder: [
    "Thunderstorm. Code like a hacker.", "Nature's bass drop.", "Thor is angry.",
    "Power surge imminent.", "Electrifying atmosphere.", "Stormy weather, stormy code.",
    "Lightning fast execution.", "Flash of inspiration.", "Boom! There goes the power.",
    "Save your work, quick!", "Dramatic coding session.", "Nature is compiling with errors.",
    "Thunder rolls, keyboard clicks.", "Epic soundtrack provided by the sky.", "High voltage outside."
  ],
  default: [
    "Atmosphere looks ambiguous.", "Weather API is confused.", "Look out a window to confirm.",
    "Unknown weather condition.", "404 Weather not found.", "Nature is unpredictable.",
    "Just another day in paradise.", "Weather data parsing error.", "Check the sky manually.",
    "Schrödinger's weather.", "Undefined atmospheric behavior.", "Null pointer in the sky.",
    "Weather is what you make it.", "It is what it is.", "Expect the unexpected."
  ]
};

const getRandomQuote = (type) => {
  const quotes = WEATHER_QUOTES[type] || WEATHER_QUOTES.default;
  return quotes[Math.floor(Math.random() * quotes.length)];
};

// Used only when the browser can't/won't provide a real location (permission
// denied, no geolocation support, timed out) — VIT Vellore campus.
const FALLBACK_COORDS = { latitude: 12.9165, longitude: 79.1325 };
const FALLBACK_LABEL = 'Vellore, TN';

// Wraps the callback-style Geolocation API in a promise. `enableHighAccuracy`
// + a short `maximumAge` favor a fresh GPS fix over a stale/coarse
// network-triangulated one, since the whole point of asking is accuracy.
const getCurrentCoords = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Geolocation not supported'));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    (err) => reject(err),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 5 * 60 * 1000 }
  );
});

// Free, key-less, CORS-friendly reverse geocoder — turns raw coordinates into
// a "City, Region" label. Returns null on any failure so the caller can fall
// back to plain coordinates rather than showing a broken location string.
const reverseGeocode = async (latitude, longitude) => {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
    if (!res.ok) return null;
    const data = await res.json();
    const city = data.city || data.locality;
    const region = data.principalSubdivisionCode?.split('-')[1] || data.principalSubdivision;
    if (city && region && city !== region) return `${city}, ${region}`;
    return city || region || null;
  } catch {
    return null;
  }
};

// Weather conditions no longer carry their own hardcoded palette (a fixed
// amber/blue/purple regardless of theme) — each maps to one of the app's own
// themed tokens instead, so the card automatically repaints itself whenever
// the user switches theme.
const TONE_TEXT = {
  accent: 'text-accent',
  secondary: 'text-textSecondary',
  danger: 'text-danger',
};

const TONE_VAR = {
  accent: 'var(--color-accent)',
  secondary: 'var(--color-text-secondary)',
  danger: 'var(--color-danger)',
};

function WeatherWidget() {
  const [weatherData, setWeatherData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  // Bumped every time fresh weather data lands (first load AND manual
  // refresh) so we can key the animation overlay on it and force Framer
  // Motion to replay from scratch instead of just sitting at its end state.
  const [refreshKey, setRefreshKey] = useState(0);

  // Below this much rain/snow in the current 15-minute sample, treat it as
  // noise rather than actual weather. 0.3mm/15min (~1.2mm/hr) is the point
  // most people would actually call "it's raining" — Open-Meteo's model has
  // been observed reporting a drizzle weather_code (53) alongside amounts as
  // low as 0.2mm, which is imperceptible mist, not real rain on the ground.
  const RAIN_MM_THRESHOLD = 0.3;
  const SNOW_CM_THRESHOLD = 0.3;

  const getWeatherTheme = (current) => {
    if (!current) return { icon: '⏳', text: 'Loading', message: 'Looking out the window...', tone: 'secondary' };

    const code = current.weather_code;
    const rainMm = (current.rain ?? 0) + (current.showers ?? 0);
    const snowCm = current.snowfall ?? 0;

    if (code === 0)
      return { icon: '☀️', text: 'Clear Sky', message: getRandomQuote('clear'), tone: 'accent' };
    if (code >= 45 && code <= 48)
      return { icon: '🌫️', text: 'Foggy', message: getRandomQuote('foggy'), tone: 'secondary' };

    // 51-67 is drizzle/rain/freezing-rain, 80-82 is rain showers — but the
    // code alone is a noisy signal for "is it actually raining right now".
    // Cross-check against the real measured amount before calling it Raining.
    const isRainCode = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    if (isRainCode && rainMm >= RAIN_MM_THRESHOLD)
      return { icon: '🌧️', text: 'Raining', message: getRandomQuote('raining'), tone: 'accent' };

    const isSnowCode = (code >= 71 && code <= 77) || code === 85 || code === 86;
    if (isSnowCode && snowCm >= SNOW_CM_THRESHOLD)
      return { icon: '❄️', text: 'Snowing', message: getRandomQuote('snowing'), tone: 'accent' };

    if (code >= 95)
      return { icon: '⛈️', text: 'Thunderstorm', message: getRandomQuote('thunder'), tone: 'danger' };

    if (code >= 1 && code <= 3)
      return { icon: '⛅', text: 'Partly Cloudy', message: getRandomQuote('cloudy'), tone: 'secondary' };

    return { icon: '☁️', text: 'Cloudy', message: getRandomQuote('default'), tone: 'secondary' };
  };

  const fetchWeather = async () => {
    setIsRefreshing(true);
    try {
      let coords = FALLBACK_COORDS;
      let usedGPS = false;
      try {
        coords = await getCurrentCoords();
        usedGPS = true;
      } catch {
        // Permission denied, unsupported, or timed out — silently keep
        // reporting for the campus fallback instead of surfacing an error.
      }

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,rain,showers,snowfall&timezone=auto`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();

      const location = usedGPS
        ? (await reverseGeocode(coords.latitude, coords.longitude)) || `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`
        : FALLBACK_LABEL;

      setWeatherData({
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: `${data.current.relative_humidity_2m}%`,
        location,
        timeUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        theme: getWeatherTheme(data.current)
      });
    } catch (error) {
      console.error("Failed to fetch live weather", error);
      setWeatherData({
        temp: '--', feelsLike: '--', humidity: '--%', location: 'Offline', timeUpdated: 'Error',
        theme: getWeatherTheme(undefined)
      });
    } finally {
      setIsRefreshing(false);
      setRefreshKey((k) => k + 1);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const currentTheme = weatherData?.theme || getWeatherTheme(undefined);
  const toneClass = TONE_TEXT[currentTheme.tone] || TONE_TEXT.secondary;
  const toneVar = TONE_VAR[currentTheme.tone] || TONE_VAR.secondary;
  const animationType = getAnimationType(currentTheme.text);

  return (
    <div
      className="relative overflow-hidden px-5 py-3 rounded-xl border border-border shadow-lg flex items-center justify-between gap-5 transition-all duration-700 ease-in-out min-w-[280px]"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${toneVar} 14%, var(--color-surface)) 0%, var(--color-surface) 65%)` }}
    >

      <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[90px] opacity-10 pointer-events-none select-none blur-[2px] translate-x-4">
        {currentTheme.icon}
      </div>

      <WeatherAnimationOverlay type={animationType} refreshKey={refreshKey} color={toneVar} />

      <div className="flex items-center gap-3 relative z-10">
        <div className="text-4xl filter drop-shadow-md">
          {currentTheme.icon}
        </div>
        <div className="flex flex-col">
          <div className="flex text-textPrimary items-start leading-none">
            <span className="text-3xl font-black tracking-tighter">
              {weatherData?.temp ?? '--'}
            </span>
            <span className="text-sm font-bold text-textSecondary ml-0.5 mt-0.5">°C</span>
          </div>
          <p className={`text-[11px] font-bold mt-1 uppercase tracking-wide ${toneClass}`}>
            {currentTheme.text}
          </p>
          <p className="text-[9px] text-textSecondary mt-0.5 max-w-[140px] leading-tight italic opacity-80">
            "{currentTheme.message}"
          </p>
        </div>
      </div>

      <div className="w-px h-10 bg-border relative z-10 hidden sm:block"></div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="flex flex-col gap-1 text-right">
          <p className="text-[10px] font-bold text-textPrimary flex items-center justify-end gap-1">
            <span className="opacity-50">📍</span> {weatherData?.location || 'Detecting'}
          </p>
          <div className="flex gap-2 text-[9px] uppercase tracking-wider font-bold text-textSecondary justify-end mt-0.5">
            <span>Hum: <strong className="text-textPrimary">{weatherData?.humidity || '--'}</strong></span>
            <span>Feel: <strong className="text-textPrimary">{weatherData?.feelsLike ? `${weatherData.feelsLike}°` : '--'}</strong></span>
          </div>
        </div>

        <button
          onClick={fetchWeather}
          disabled={isRefreshing}
          className="text-textSecondary hover:text-textPrimary bg-background/50 hover:bg-surfaceHover border border-border p-2 rounded-lg backdrop-blur-md transition-all disabled:opacity-50 shrink-0 shadow-inner"
        >
          <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

    </div>
  );
}

export default WeatherWidget;
