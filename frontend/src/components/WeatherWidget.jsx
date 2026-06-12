import React, { useState, useEffect } from 'react';

function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/weather/');
        if (response.ok) {
          const data = await response.json();
          setWeather(data);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      }
    };
    
    fetchWeather();
    // Auto-refresh the weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000); 
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <div className="text-xs text-red-400 bg-slate-800 p-2 rounded">API Offline</div>;
  }

  if (!weather) {
    return <div className="text-xs text-slate-400 animate-pulse bg-slate-800 p-2 rounded">Syncing Satellite...</div>;
  }

  // WMO Weather interpretation codes
  const isClear = weather.weathercode <= 3;
  const icon = isClear ? (weather.is_day ? '☀️' : '🌙') : '☁️';
  const condition = isClear ? 'Clear' : 'Overcast';

  return (
    <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700 shadow-inner">
      <div className="text-2xl drop-shadow-md">{icon}</div>
      <div>
        <p className="text-white font-bold text-sm">{weather.temperature}°C</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Vellore • {condition}</p>
      </div>
    </div>
  );
}

export default WeatherWidget;