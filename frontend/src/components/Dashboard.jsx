import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import TasksWidget from './TasksWidget';
import ExpensesWidget from './ExpensesWidget';
import PortfolioWidget from './PortfolioWidget';
import WeatherWidget from './WeatherWidget';
import DashboardAttendance from './DashboardAttendance';
import DailyQuote from './DailyQuote';
import ThemeToggle from './ThemeToggle';
import { api } from '../services/api';
import NextClassWidget from './NextClassWidget';
import NumberRoll from './ui/NumberRoll';
import PullToRefresh from './ui/PullToRefresh';
import SlotMachineText from './ui/SlotMachineText';
import { staggerParent, fadeUp } from '../motion/variants';

function Dashboard({ profile, setProfile, setActiveTab }) {
  const [isEditingCgpa, setIsEditingCgpa] = useState(false);
  const [tempCgpa, setTempCgpa] = useState(profile?.cgpa ? profile.cgpa.toFixed(2) : "0.00");

  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // Named (not inline) so pull-to-refresh can reuse the exact same sync
  // instead of inventing a second "refresh the dashboard" path.
  const syncProfile = async () => {
    try {
      const freshProfile = await api.getProfile();
      setProfile(freshProfile);
    } catch (err) {
      console.error("Failed to background sync profile", err);
    }
  };

  // 🔥 NEW: Auto-Sync Profile on Mount
  // If you changed Ghost Mode in Radar, this pulls the fresh data the second you open the Dashboard!
  useEffect(() => {
    syncProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <PullToRefresh onRefresh={syncProfile}>
    <div className="w-full max-w-6xl mx-auto pb-10 animate-fade-in flex flex-col h-full">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface p-6 rounded-xl border border-border mb-6 shadow-lg gap-4 shrink-0 transition-colors duration-300">
        
        {/* COLUMN 1 (LEFT) */}
        <div className="flex-1 w-full">
          <h1 className="text-2xl font-bold text-textPrimary mb-1 flex flex-wrap items-baseline gap-x-2">
            Welcome back, <SlotMachineText key={profile?.name} text={profile?.name?.split(' ')[0] || ''} />
          </h1>
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
                <span>CGPA: <strong className="text-textPrimary text-[13px]"><NumberRoll value={profile?.cgpa || 0} decimals={2} /></strong></span>
                <span className="text-[10px] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">✎</span>
              </div>
            )}
          </div>
        </div>
        
        {/* COLUMN 2 (CENTER) */}
        <div className="w-full md:flex-1 flex justify-center">
          <WeatherWidget />
        </div>

        {/* COLUMN 3 (RIGHT) — Ghost, Theme, and Streak all share one
            non-wrapping row now, so the streak badge no longer eats a full
            row of its own on mobile. Tighter padding/gaps + min-w-0 on the
            streak badge so the row actually fits a 375px screen instead of
            bleeding off the right edge. */}
        <div className="w-full flex flex-row justify-between md:justify-end items-center gap-1 sm:gap-2 flex-1 shrink-0">

          <button
            onClick={handleGhostModeToggle}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-sm shrink-0 ${
              profile?.is_ghost
                ? 'bg-danger text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-background border border-border text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'
            }`}
            title={profile?.is_ghost ? "Your timetable is hidden from friends" : "Your timetable is visible to friends"}
          >
            {profile?.is_ghost ? '👻 Ghost: ON' : '👁️ Ghost: OFF'}
          </button>

          <ThemeToggle />

          <div className="text-right border-l border-border pl-2 min-w-0">
            <div className="text-lg sm:text-2xl font-black text-orange-500 flex items-center justify-end gap-1 drop-shadow-md">
              <span className="animate-pulse">🔥</span> Day <NumberRoll value={profile?.current_streak || 0} />
            </div>
          </div>
        </div>

      </header>

      {/* Widgets reveal in a staggered grid on mount (login → dashboard, or any
          tab switch back here) instead of popping in together. flex flex-col
          flex-1 min-h-0 here is a transparent passthrough — it keeps this new
          wrapper from breaking the flex-height chain the 12-col grid below
          relies on (its own flex-1 min-h-0 needs a flex ancestor to mean anything). */}
      <motion.div
        variants={staggerParent(0.08)}
        initial="hidden"
        animate="visible"
        className="flex flex-col flex-1 min-h-0"
      >
        {/* 2-Column layout for Quote and Next Class Widget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <motion.div variants={fadeUp}><DailyQuote /></motion.div>
          <motion.div variants={fadeUp}><NextClassWidget /></motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
          <motion.div variants={fadeUp} className="lg:col-span-5 w-full">
            <TasksWidget setProfile={setProfile} />
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-4 w-full">
            <DashboardAttendance />
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-3 w-full">
            <ExpensesWidget profile={profile} setActiveTab={setActiveTab} />
          </motion.div>
        </div>

        <motion.div variants={fadeUp}>
          <PortfolioWidget />
        </motion.div>
      </motion.div>
    </div>
    </PullToRefresh>
  );
}

export default Dashboard;