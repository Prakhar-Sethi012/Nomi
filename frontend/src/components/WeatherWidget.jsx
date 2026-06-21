import React, { useState, useEffect } from 'react';

function WeatherWidget() {
  const [weatherData, setWeatherData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  // DYNAMIC THEME ENGINE
  const getWeatherTheme = (code) => {
    if (code === undefined) return { icon: '⏳', text: 'Loading', bg: 'from-slate-800 to-slate-900', accent: 'text-slate-400' };
    
    if (code === 0) 
      return { icon: '☀️', text: 'Clear Sky', bg: 'from-amber-500/10 to-orange-900/40 border-orange-500/20', accent: 'text-orange-400' };
    if (code >= 1 && code <= 3) 
      return { icon: '⛅', text: 'Partly Cloudy', bg: 'from-blue-400/10 to-slate-800/60 border-blue-400/20', accent: 'text-blue-300' };
    if (code >= 45 && code <= 48) 
      return { icon: '🌫️', text: 'Foggy', bg: 'from-slate-400/10 to-slate-800/60 border-slate-400/20', accent: 'text-slate-300' };
    if (code >= 51 && code <= 67) 
      return { icon: '🌧️', text: 'Raining', bg: 'from-blue-600/20 to-slate-900/80 border-blue-500/30', accent: 'text-blue-400' };
    if (code >= 71 && code <= 77) 
      return { icon: '❄️', text: 'Snowing', bg: 'from-indigo-200/10 to-slate-800/60 border-indigo-200/20', accent: 'text-indigo-200' };
    if (code >= 95) 
      return { icon: '⛈️', text: 'Thunderstorm', bg: 'from-purple-600/20 to-slate-900/80 border-purple-500/30', accent: 'text-purple-400' };
    
    return { icon: '☁️', text: 'Cloudy', bg: 'from-slate-700/20 to-slate-900/60 border-slate-600/30', accent: 'text-slate-300' };
  };

  const fetchWeather = async () => {
    setIsRefreshing(true);
    try {
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
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const currentTheme = weatherData?.theme || getWeatherTheme(undefined);

  return (
    <div className={`relative overflow-hidden px-5 py-3 rounded-xl border bg-gradient-to-br shadow-lg flex items-center justify-between gap-5 transition-all duration-700 ease-in-out ${currentTheme.bg}`}>
      
      {/* Background Watermark Icon */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[90px] opacity-10 pointer-events-none select-none blur-[2px] translate-x-4">
        {currentTheme.icon}
      </div>

      {/* LEFT: Icon & Temp */}
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
        </div>
      </div>

      {/* DIVIDER */}
      <div className="w-px h-10 bg-white/10 relative z-10 hidden sm:block"></div>

      {/* RIGHT: Stats & Action */}
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

        {/* Refresh Button */}
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