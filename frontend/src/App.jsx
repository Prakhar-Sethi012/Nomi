import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { offlineSync } from './services/offlineSync';

// --- Views & Components ---
import Dashboard from './components/Dashboard';
import LinksView from './components/LinksView';
import ScratchpadView from './components/ScratchpadView';
import AttendanceStrategyView from './components/AttendanceStrategyView';
import TimetableView from './components/TimetableView';
import ExpensesView from './components/ExpensesView';
import AuthScreen from './components/AuthScreen';
import SocialRadar from './components/SocialRadar';
import CloseFriendsView from './components/CloseFriendsView'; // 🔥 NEW: Imported the directory!

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // =========================================
  // 1. AUTHENTICATE & FETCH PROFILE
  // =========================================
  useEffect(() => {
    if (isAuthenticated) {
      api.getProfile()
        .then(data => {
          setProfile(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Database connection failed or profile not found.", err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

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
  // 3. LOGOUT HANDLER
  // =========================================
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setProfile(null);
  };

  // =========================================
  // RENDER BLOCKS
  // =========================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center font-mono text-accent animate-pulse">
        Decrypting Terminal...
      </div>
    );
  }

  // 🛡️ SECURITY GATE: If not authenticated, show Login/Register screen
  if (!isAuthenticated) {
    return (
      <AuthScreen onLoginSuccess={(userData) => {
        setProfile(userData);
        setIsAuthenticated(true);
      }} />
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 flex flex-col items-center pt-6 px-4 font-sans">
      
      <nav className="w-full max-w-6xl flex justify-between items-center mb-6 bg-surface p-1.5 rounded-lg border border-border shadow-lg z-10 sticky top-4 transition-colors duration-300">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 justify-center md:justify-start items-center flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('scratchpad')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'scratchpad' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Scratchpad</button>
          <button onClick={() => setActiveTab('links')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'links' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Directory</button>
          <button onClick={() => setActiveTab('strategy')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'strategy' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Strategy</button>
          <button onClick={() => setActiveTab('timetable')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'timetable' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Timetable</button>
          <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'expenses' ? 'bg-success text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Finance</button>
          <button onClick={() => setActiveTab('radar')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'radar' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Radar</button>
          
          {/* 🔥 NEW: Close Friends Directory Tab */}
          <button onClick={() => setActiveTab('closeFriends')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'closeFriends' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Close Friends</button>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="ml-2 px-4 py-2 text-danger hover:bg-danger/10 rounded-md text-sm font-bold transition-colors shrink-0"
        >
          Logout
        </button>

      </nav>

      <div className="w-full max-w-6xl flex justify-center">
        {activeTab === 'dashboard' && <Dashboard profile={profile} setProfile={setProfile} setActiveTab={setActiveTab} />}
        {activeTab === 'scratchpad' && <ScratchpadView />}
        {activeTab === 'links' && <LinksView />}
        {activeTab === 'timetable' && <TimetableView />}
        {activeTab === 'strategy' && <AttendanceStrategyView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'radar' && <SocialRadar />}
        {activeTab === 'closeFriends' && <CloseFriendsView />} {/* 🔥 NEW: Renders the component */}
      </div>
    </div>
  );
}

export default App;