import React, { useState, useEffect } from 'react';

function WeatherWidget() {
  const [weatherData, setWeatherData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  // 1. THE ISOLATED FETCH FUNCTION
// 1. THE LIVE API FETCH FUNCTION
  const fetchWeather = async () => {
    setIsRefreshing(true); 
    
    try {
      // Open-Meteo API pulling live data for VIT Vellore coordinates
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=12.9165&longitude=79.1325&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto');
      
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();

      // Open-Meteo uses WMO codes for weather conditions. We translate them to English here:
      const getWeatherCondition = (code) => {
        if (code === 0) return 'Clear Sky ☀️';
        if (code >= 1 && code <= 3) return 'Partly Cloudy ⛅';
        if (code >= 45 && code <= 48) return 'Foggy 🌫️';
        if (code >= 51 && code <= 67) return 'Raining 🌧️';
        if (code >= 95) return 'Thunderstorm ⛈️';
        return 'Cloudy ☁️';
      };

      const liveUpdate = {
        temp: Math.round(data.current.temperature_2m),
        condition: getWeatherCondition(data.current.weather_code),
        humidity: `${data.current.relative_humidity_2m}%`,
        location: 'Vellore, TN',
        timeUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setWeatherData(liveUpdate);
    } catch (error) {
      console.error("Failed to fetch live weather", error);
      // Fallback state if you are offline
      setWeatherData({
        temp: '--', condition: 'Offline', humidity: '--%', location: 'Connection Lost', timeUpdated: 'Error'
      });
    } finally {
      setIsRefreshing(false); 
    }
  };

  // 2. FETCH ON INITIAL MOUNT
  useEffect(() => {
    fetchWeather();
  }, []); // The empty array ensures this only runs once when the dashboard loads

  return (
    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full relative overflow-hidden">
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🌤️ Local Weather
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {weatherData ? weatherData.location : 'Detecting...'}
          </p>
        </div>
        
        {/* 3. THE MAGIC BUTTON */}
        <button 
          onClick={fetchWeather} // This is the key! No full page reload, just triggering the function.
          disabled={isRefreshing}
          className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh Weather"
        >
          <svg 
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center relative z-10">
        {isRefreshing && !weatherData ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            Syncing radar...
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <span className="text-4xl font-black text-white leading-none tracking-tighter">
                {weatherData?.temp}°<span className="text-2xl text-slate-500">C</span>
              </span>
              <p className="text-sm font-bold text-indigo-300 mt-1">{weatherData?.condition}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Humidity</p>
              <p className="text-sm text-slate-300">{weatherData?.humidity}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center relative z-10">
        <span className="text-[9px] text-slate-500 uppercase tracking-widest">
          Last Updated
        </span>
        <span className="text-[10px] font-mono text-slate-400">
          {weatherData?.timeUpdated}
        </span>
      </div>

    </div>
  );
}

export default WeatherWidget;