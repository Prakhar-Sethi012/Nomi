import React, { useState, useEffect } from 'react';
import TasksWidget from './TasksWidget';
import ExpensesWidget from './ExpensesWidget';
import PortfolioWidget from './PortfolioWidget';
import WeatherWidget from './WeatherWidget';
import DashboardAttendance from './DashboardAttendance';

function Dashboard() {
  // Application State
  const [profile, setProfile] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Setup Form State
  const [setupForm, setSetupForm] = useState({ name: '', reg_no: '', app_pin: '' });

  // CGPA Engine State
  const [isEditingCgpa, setIsEditingCgpa] = useState(false);
  const [tempCgpa, setTempCgpa] = useState("0.00");

  // Live Calendar Engine
  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // ==========================================
  // 1. FETCH PROFILE OR TRIGGER SETUP
  // ==========================================
  const fetchProfile = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/profile/');
      if (res.status === 404) {
        // Backend says no profile exists yet! Show setup screen.
        setNeedsSetup(true);
      } else if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setTempCgpa(data.cgpa ? data.cgpa.toFixed(2) : "0.00");
      }
    } catch (err) {
      console.error("Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ==========================================
  // 2. HANDLE FIRST-TIME SETUP
  // ==========================================
  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupForm)
      });
      if (res.ok) {
        const newProfile = await res.json();
        setProfile(newProfile);
        setTempCgpa(newProfile.cgpa ? newProfile.cgpa.toFixed(2) : "0.00");
        setNeedsSetup(false); // Unlock dashboard!
      }
    } catch (err) {
      console.error("Setup failed");
    }
  };

  // ==========================================
  // 3. HANDLE CGPA SEMESTER UPDATE
  // ==========================================
  const handleCgpaSave = async (e) => {
    e.preventDefault();
    let val = parseFloat(tempCgpa);
    if (isNaN(val)) val = 0.00;
    if (val > 10) val = 10.00;
    if (val < 0) val = 0.00;
    
    try {
      // Send the new CGPA to PostgreSQL
      const res = await fetch('http://127.0.0.1:8000/profile/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cgpa: val })
      });
      
      if (res.ok) {
        const updatedData = await res.json();
        setProfile(updatedData);
        setTempCgpa(updatedData.cgpa.toFixed(2));
        setIsEditingCgpa(false); // Close inline editor
      }
    } catch (err) {
      console.error("Failed to update CGPA");
    }
  };

  // ==========================================
  // UI RENDERERS
  // ==========================================
  if (isLoading) {
    return <div className="text-slate-400 p-10 animate-pulse font-mono">Initializing Command Center...</div>;
  }

  // 🛑 IF DATABASE IS EMPTY: Show Setup Screen
  if (needsSetup) {
    return (
      <div className="w-full max-w-md mx-auto mt-20 bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl">
        <h2 className="text-2xl font-black text-white mb-2">Initialize Profile</h2>
        <p className="text-sm text-slate-400 mb-6">Create your master record to unlock the Command Center.</p>
        
        <form onSubmit={handleSetupSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">Display Name</label>
            <input required type="text" value={setupForm.name} onChange={e => setSetupForm({...setupForm, name: e.target.value})} className="w-full p-2 bg-slate-900 rounded text-sm text-white border border-slate-700 outline-none focus:border-indigo-500 mt-1" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">Registration Number</label>
            <input required type="text" value={setupForm.reg_no} onChange={e => setSetupForm({...setupForm, reg_no: e.target.value.toUpperCase()})} className="w-full p-2 bg-slate-900 rounded text-sm text-white border border-slate-700 outline-none focus:border-indigo-500 mt-1 uppercase" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">Security PIN (4 Digits)</label>
            <input required type="password" maxLength="4" value={setupForm.app_pin} onChange={e => setSetupForm({...setupForm, app_pin: e.target.value})} className="w-full p-2 bg-slate-900 rounded text-sm text-white border border-slate-700 outline-none focus:border-indigo-500 mt-1 tracking-[0.5em]" />
          </div>
          <button type="submit" className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors">
            Deploy Command Center
          </button>
        </form>
      </div>
    );
  }

  // ✅ IF PROFILE EXISTS: Render Restored Dashboard
  return (
    <div className="w-full max-w-6xl pb-10">
      {/* Header Bar */}
      <header className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg">
        
        {/* LEFT: Student Profile & Stats */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {profile.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-400 text-sm font-medium">{dateString}</span>
            <span className="text-slate-500 text-sm">• VIT Command Center</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-600 shadow-inner">
              Reg: {profile.reg_no}
            </span>

            {/* RESTORED: INLINE CGPA EDITOR */}
            {isEditingCgpa ? (
              <form onSubmit={handleCgpaSave} className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={tempCgpa}
                  onChange={(e) => setTempCgpa(e.target.value)}
                  className="w-16 p-1 bg-slate-900 rounded text-xs text-white border border-slate-600 focus:border-blue-500 outline-none"
                  autoFocus
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1 rounded transition-colors font-bold">Save</button>
              </form>
            ) : (
              <div
                onClick={() => { setIsEditingCgpa(true); setTempCgpa(profile.cgpa ? profile.cgpa.toFixed(2) : "0.00"); }}
                className="text-xs bg-slate-900 text-blue-400 px-3 py-1.5 rounded border border-blue-900/50 cursor-pointer hover:bg-slate-800 hover:border-blue-500 transition-all flex items-center gap-1.5 group shadow-inner"
                title="Click to update CGPA"
              >
                <span>CGPA: <strong className="text-white text-[13px]">{profile.cgpa ? profile.cgpa.toFixed(2) : "0.00"}</strong></span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
              </div>
            )}
          </div>
        </div>
        
        {/* MIDDLE: Weather Satellite */}
        <div className="hidden md:block">
          <WeatherWidget />
        </div>

        {/* RIGHT: Gamification Streak */}
        <div className="text-right">
          <div className="text-3xl font-black text-orange-500">🔥 Day {profile.current_streak}</div>
          <p className="text-slate-400 text-sm mt-1">Current Streak</p>
        </div>
      </header>

      {/* Grid for Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardAttendance />
        <TasksWidget />
        <ExpensesWidget />
        
      </div>
      <PortfolioWidget />
    </div>
  );
}

export default Dashboard;