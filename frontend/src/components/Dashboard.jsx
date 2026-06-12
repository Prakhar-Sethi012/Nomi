import React from 'react';
import TasksWidget from './TasksWidget';
import TimetableWidget from './TimetableWidget';
import ExpensesWidget from './ExpensesWidget';
import PortfolioWidget from './PortfolioWidget'; // NEW IMPORT
import WeatherWidget from './WeatherWidget';

function Dashboard({ profile }) {
  return (
    <div className="w-full max-w-6xl pb-10"> {/* Added padding bottom (pb-10) for scrolling */}
      {/* Header Bar */}
      <header className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {profile.name.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm">VIT Command Center • Reg: {profile.reg_no}</p>
        </div>
        {/* NEW WEATHER WIDGET PLACEMENT */}
        <div className="hidden md:block">
          <WeatherWidget />
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-orange-500">🔥 Day {profile.current_streak}</div>
          <p className="text-slate-400 text-sm">Current Streak</p>
        </div>
      </header>

      {/* TOP ROW: Daily Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TimetableWidget />
        <TasksWidget />
        <ExpensesWidget />
      </div>

      {/* BOTTOM ROW: The Developer Showcase */}
      <PortfolioWidget />

    </div>
  );
}

export default Dashboard;