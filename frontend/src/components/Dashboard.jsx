import React, { useState, useEffect } from 'react';
import TasksWidget from './TasksWidget';
import TimetableWidget from './TimetableWidget';
import ExpensesWidget from './ExpensesWidget';
import PortfolioWidget from './PortfolioWidget';
import WeatherWidget from './WeatherWidget'; // 1. Don't forget the import!

function Dashboard({ profile }) {
  // Live Calendar Engine
  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // Dynamic Streak Engine
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const savedStreak = localStorage.getItem('cc_streak') || 0;
    setStreak(parseInt(savedStreak));

    const handleStreakUpdate = () => setStreak(parseInt(localStorage.getItem('cc_streak')));
    window.addEventListener('streak-updated', handleStreakUpdate);
    return () => window.removeEventListener('streak-updated', handleStreakUpdate);
  }, []);

  return (
    <div className="w-full max-w-6xl pb-10">
      {/* Header Bar */}
      <header className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg">
        
        {/* LEFT: Greeting & Calendar */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {profile.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-sm font-medium">{dateString}</span>
            <span className="text-slate-500 text-sm">• VIT Command Center</span>
          </div>
        </div>
        
        {/* MIDDLE: Weather Satellite (RESTORED!) */}
        <div className="hidden md:block">
          <WeatherWidget />
        </div>

        {/* RIGHT: Gamification Streak */}
        <div className="text-right">
          <div className="text-3xl font-black text-orange-500">🔥 Day {streak}</div>
          <p className="text-slate-400 text-sm">Current Streak</p>
        </div>
      </header>

      {/* Grid for Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TimetableWidget />
        <TasksWidget />
        <ExpensesWidget />
      </div>

      {/* The Developer Showcase */}
      <PortfolioWidget />
    </div>
  );
}

export default Dashboard;