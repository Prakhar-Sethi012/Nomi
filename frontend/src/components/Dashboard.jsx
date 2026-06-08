import React from 'react';
import TasksWidget from './TasksWidget';
import TimetableWidget from './TimetableWidget'; 
import ExpensesWidget from './ExpensesWidget';// NEW IMPORT

function Dashboard({ profile }) {
  return (
    <div className="w-full max-w-6xl">
      {/* Header Bar */}
      <header className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {profile.name.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm">VIT Command Center • Reg: {profile.reg_no}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-orange-500">🔥 Day {profile.current_streak}</div>
          <p className="text-slate-400 text-sm">Current Streak</p>
        </div>
      </header>

      {/* Grid for Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Box 1: NEW LIVE TIMETABLE WIDGET */}
        <TimetableWidget />

        {/* Box 2: Tasks Widget */}
        <TasksWidget />

        {/* Box 3: Expenses */}
        <ExpensesWidget />
        
        
      </div>
    </div>
  );
}

export default Dashboard;