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

function WeatherWidget() {
  const [weatherData, setWeatherData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  // Bumped every time fresh weather data lands (first load AND manual
  // refresh) so we can key the animation overlay on it and force Framer
  // Motion to replay from scratch instead of just sitting at its end state.
  const [refreshKey, setRefreshKey] = useState(0);

  const getWeatherTheme = (code) => {
    if (code === undefined) return { icon: '⏳', text: 'Loading', message: 'Looking out the window...', bg: 'from-slate-800 to-slate-900', accent: 'text-slate-400' };

    if (code === 0)
      return { icon: '☀️', text: 'Clear Sky', message: getRandomQuote('clear'), bg: 'from-amber-500/10 to-orange-900/40 border-orange-500/20', accent: 'text-orange-400' };
    if (code >= 1 && code <= 3)
      return { icon: '⛅', text: 'Partly Cloudy', message: getRandomQuote('cloudy'), bg: 'from-blue-400/10 to-slate-800/60 border-blue-400/20', accent: 'text-blue-300' };
    if (code >= 45 && code <= 48)
      return { icon: '🌫️', text: 'Foggy', message: getRandomQuote('foggy'), bg: 'from-slate-400/10 to-slate-800/60 border-slate-400/20', accent: 'text-slate-300' };
    if (code >= 51 && code <= 67)
      return { icon: '🌧️', text: 'Raining', message: getRandomQuote('raining'), bg: 'from-blue-600/20 to-slate-900/80 border-blue-500/30', accent: 'text-blue-400' };
    if (code >= 71 && code <= 77)
      return { icon: '❄️', text: 'Snowing', message: getRandomQuote('snowing'), bg: 'from-indigo-200/10 to-slate-800/60 border-indigo-200/20', accent: 'text-indigo-200' };
    if (code >= 95)
      return { icon: '⛈️', text: 'Thunderstorm', message: getRandomQuote('thunder'), bg: 'from-purple-600/20 to-slate-900/80 border-purple-500/30', accent: 'text-purple-400' };

    return { icon: '☁️', text: 'Cloudy', message: getRandomQuote('default'), bg: 'from-slate-700/20 to-slate-900/60 border-slate-600/30', accent: 'text-slate-300' };
  };

  const fetchWeather = async () => {
    setIsRefreshing(true);
    try {
      // 12.9165, 79.1325 is Vellore
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9165&longitude=79.1325&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto');
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();

      setWeatherData({
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: `${data.current.relative_humidity_2m}%`,
        location: 'Vellore, TN',
        timeUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        theme: getWeatherTheme(data.current.weather_code)
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
  const animationType = getAnimationType(currentTheme.text);

  return (
    <div className={`relative overflow-hidden px-5 py-3 rounded-xl border bg-gradient-to-br shadow-lg flex items-center justify-between gap-5 transition-all duration-700 ease-in-out ${currentTheme.bg} min-w-[280px]`}>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[90px] opacity-10 pointer-events-none select-none blur-[2px] translate-x-4">
        {currentTheme.icon}
      </div>

      <WeatherAnimationOverlay type={animationType} refreshKey={refreshKey} />

      <div className="flex items-center gap-3 relative z-10">
        <div className="text-4xl filter drop-shadow-md">
          {currentTheme.icon}
        </div>
        <div className="flex flex-col">
          <div className="flex text-white items-start leading-none">
            <span className="text-3xl font-black tracking-tighter">
              {weatherData?.temp ?? '--'}
            </span>
            <span className="text-sm font-bold text-white/50 ml-0.5 mt-0.5">°C</span>
          </div>
          <p className={`text-[11px] font-bold mt-1 uppercase tracking-wide ${currentTheme.accent}`}>
            {currentTheme.text}
          </p>
          <p className="text-[9px] text-white/60 mt-0.5 max-w-[140px] leading-tight italic">
            "{currentTheme.message}"
          </p>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10 relative z-10 hidden sm:block"></div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="flex flex-col gap-1 text-right">
          <p className="text-[10px] font-bold text-white/80 flex items-center justify-end gap-1">
            <span className="opacity-50">📍</span> {weatherData?.location || 'Detecting'}
          </p>
          <div className="flex gap-2 text-[9px] uppercase tracking-wider font-bold text-white/40 justify-end mt-0.5">
            <span>Hum: <strong className="text-white/80">{weatherData?.humidity || '--'}</strong></span>
            <span>Feel: <strong className="text-white/80">{weatherData?.feelsLike ? `${weatherData.feelsLike}°` : '--'}</strong></span>
          </div>
        </div>

        <button
          onClick={fetchWeather}
          disabled={isRefreshing}
          className="text-white/40 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-lg backdrop-blur-md transition-all disabled:opacity-50 shrink-0 shadow-inner"
        >
          <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

    </div>
  );
}

export default WeatherWidget;
