import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LinksView from './components/LinksView';
import ScratchpadView from './components/ScratchpadView';
import AttendanceStrategyView from './components/AttendanceStrategyView';
import TimetableView from './components/TimetableView';
import ExpensesView from './components/ExpensesView';
import SetupForm from './components/SetupForm'; 
import { offlineSync } from './services/offlineSync';
import { api } from './services/api'; // 🔥 Brought in the API SDK

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // =========================================
  // 1. AUTHENTICATE & FETCH PROFILE
  // =========================================
  useEffect(() => {
    const authenticateCommander = async () => {
      try {
        const data = await api.getProfile();
        setProfile(data);
      } catch (err) {
        console.error("Database connection failed or profile not found.");
      } finally {
        setIsAuthenticating(false);
      }
    };

    authenticateCommander();
  }, []);

  // =========================================
  // 2. THE GLOBAL OFFLINE-FIRST LISTENER
  // =========================================
  useEffect(() => {
    const handleOnline = () => {
      console.log("🟢 Connection restored!");
      offlineSync.processQueue();
    };

    const handleOffline = () => {
      console.log("🔴 Connection lost. Switching to IndexedDB Queue.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      offlineSync.processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // =========================================
  // RENDER BLOCKS
  // =========================================

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center font-mono text-accent animate-pulse">
        Establishing secure connection to Command Center Database...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center p-4 font-sans animate-fade-in">
        <SetupForm onSetupComplete={(newProfile) => setProfile(newProfile)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 flex flex-col items-center pt-6 px-4 font-sans">
      
      {/* 🔥 REFACTORED NAVBAR: Uses semantic theme colors so it changes with the toggle */}
      <nav className="flex gap-1 mb-6 bg-surface p-1.5 rounded-lg border border-border shadow-lg z-10 sticky top-4 flex-wrap justify-center transition-colors duration-300">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('scratchpad')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'scratchpad' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Scratchpad</button>
        <button onClick={() => setActiveTab('links')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'links' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Directory</button>
        <button onClick={() => setActiveTab('strategy')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'strategy' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Strategy</button>
        <button onClick={() => setActiveTab('timetable')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'timetable' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Timetable</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'expenses' ? 'bg-success text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Finance</button>
      </nav>

      <div className="w-full flex justify-center">
        {activeTab === 'dashboard' && <Dashboard profile={profile} setProfile={setProfile} setActiveTab={setActiveTab} />}
        {activeTab === 'scratchpad' && <ScratchpadView />}
        {activeTab === 'links' && <LinksView />}
        {activeTab === 'timetable' && <TimetableView />}
        {activeTab === 'strategy' && <AttendanceStrategyView />}
        {activeTab === 'expenses' && <ExpensesView />}
      </div>
    </div>
  );
}

export default App;