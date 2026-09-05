import React, { useState, useEffect } from 'react';
import TasksWidget from './TasksWidget';
import ExpensesWidget from './ExpensesWidget';
import PortfolioWidget from './PortfolioWidget';
import WeatherWidget from './WeatherWidget';
import DashboardAttendance from './DashboardAttendance';
import DailyQuote from './DailyQuote'; 
import ThemeToggle from './ThemeToggle';
import { api } from '../services/api'; 
import NextClassWidget from './NextClassWidget';

function Dashboard({ profile, setProfile, setActiveTab }) {
  const [isEditingCgpa, setIsEditingCgpa] = useState(false);
  const [tempCgpa, setTempCgpa] = useState(profile?.cgpa ? profile.cgpa.toFixed(2) : "0.00");

  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // 🔥 NEW: Auto-Sync Profile on Mount
  // If you changed Ghost Mode in Radar, this pulls the fresh data the second you open the Dashboard!
  useEffect(() => {
    const syncProfile = async () => {
      try {
        const freshProfile = await api.getProfile();
        setProfile(freshProfile);
      } catch (err) {
        console.error("Failed to background sync profile", err);
      }
    };
    syncProfile();
  }, [setProfile]);

  const handleCgpaSave = async (e) => {
    e.preventDefault();
    let val = parseFloat(tempCgpa);
    if (isNaN(val)) val = 0.00;
    if (val > 10) val = 10.00;
    if (val < 0) val = 0.00;
    
    try {
      const updatedData = await api.updateProfile({ cgpa: val });
      setProfile(updatedData); 
      setTempCgpa(updatedData.cgpa.toFixed(2));
      setIsEditingCgpa(false);
    } catch (err) {
      console.error("Failed to update CGPA", err);
    }
  };

  const handleGhostModeToggle = async () => {
    // Optimistic UI update for snappy feel
    const newGhostState = !profile.is_ghost;
    setProfile({ ...profile, is_ghost: newGhostState });

    try {
      // Assuming you have an updateProfile or toggleGhostMode endpoint. 
      // Using updateProfile is the standard way based on your schemas!
      const updatedProfile = await api.updateProfile({ is_ghost: newGhostState });
      setProfile(updatedProfile);
    } catch (err) {
      console.error("Failed to toggle Ghost Mode", err);
      // Revert if it fails
      setProfile({ ...profile, is_ghost: !newGhostState });
      alert("Failed to toggle Ghost Mode. Check connection.");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-10 animate-fade-in flex flex-col h-full">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface p-6 rounded-xl border border-border mb-6 shadow-lg gap-4 shrink-0 transition-colors duration-300">
        
        {/* COLUMN 1 (LEFT) */}
        <div className="flex-1 w-full">
          <h1 className="text-2xl font-bold text-textPrimary mb-1">Welcome back, {profile?.name?.split(' ')[0]}</h1>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent text-sm font-medium">{dateString}</span>
            <span className="text-textSecondary text-sm hidden sm:inline">• VIT Command Center</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-surfaceHover text-textSecondary px-3 py-1.5 rounded border border-border shadow-inner transition-colors duration-300">
              Reg: {profile?.reg_no}
            </span>

            {isEditingCgpa ? (
              <form onSubmit={handleCgpaSave} className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={tempCgpa}
                  onChange={(e) => setTempCgpa(e.target.value)}
                  className="w-16 p-1 bg-background rounded text-xs text-textPrimary border border-border focus:border-accent outline-none transition-colors duration-300"
                  autoFocus
                />
                <button type="submit" className="bg-accent hover:bg-accentHover text-white text-[10px] px-2 py-1 rounded font-bold shadow">Save</button>
              </form>
            ) : (
              <div
                onClick={() => { setIsEditingCgpa(true); setTempCgpa(profile?.cgpa ? profile.cgpa.toFixed(2) : "0.00"); }}
                className="text-xs bg-background text-accent px-3 py-1.5 rounded border border-accent/30 cursor-pointer hover:bg-surfaceHover hover:border-accent transition-all flex items-center gap-1.5 group shadow-inner"
                title="Click to update CGPA"
              >
                <span>CGPA: <strong className="text-textPrimary text-[13px]">{profile?.cgpa ? profile.cgpa.toFixed(2) : "0.00"}</strong></span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
              </div>
            )}
          </div>
        </div>
        
        {/* COLUMN 2 (CENTER) */}
        <div className="flex-1 hidden md:flex justify-center">
          <WeatherWidget />
        </div>

        {/* COLUMN 3 (RIGHT) */}
        <div className="flex-1 w-full flex flex-wrap justify-start md:justify-end shrink-0 gap-4 items-center">
          
          <button 
            onClick={handleGhostModeToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-sm ${
              profile?.is_ghost 
                ? 'bg-danger text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                : 'bg-background border border-border text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
            }`}
            title={profile?.is_ghost ? "Your timetable is hidden from friends" : "Your timetable is visible to friends"}
          >
            {profile?.is_ghost ? '👻 Ghost: ON' : '👁️ Ghost: OFF'}
          </button>

          <ThemeToggle />

          <div className="text-left md:text-right border-l border-border pl-4">
            <div className="text-3xl font-black text-orange-500 flex items-center md:justify-end gap-2 drop-shadow-md">
              <span className="animate-pulse">🔥</span> Day {profile?.current_streak}
            </div>
            <p className="text-textSecondary text-sm mt-1 uppercase tracking-widest font-bold">Current Streak</p>
          </div>
        </div>

      </header>

      {/* 2-Column layout for Quote and Next Class Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <DailyQuote />
        <NextClassWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
        <div className="lg:col-span-4 w-full">
          <DashboardAttendance />
        </div>
        <div className="lg:col-span-5 w-full">
          <TasksWidget setProfile={setProfile} />
        </div>
        <div className="lg:col-span-3 w-full">
          <ExpensesWidget profile={profile} setActiveTab={setActiveTab} />
        </div>
      </div>
      
      <PortfolioWidget />
    </div>
  );
}

export default Dashboard;