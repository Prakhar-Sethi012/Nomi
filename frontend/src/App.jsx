import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LinksView from './components/LinksView';
import ScratchpadView from './components/ScratchpadView';
import AttendanceStrategyView from './components/AttendanceStrategyView';
import TimetableView from './components/TimetableView';
import ExpensesView from './components/ExpensesView';
import SetupForm from './components/SetupForm'; // ✅ Imported your clean setup form

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // ✅ The Single Source of Truth
  const [profile, setProfile] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // ✅ Blocking API call on initial load
  useEffect(() => {
    const authenticateCommander = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/profile/');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
        // If 404, the backend says no profile exists. We safely leave profile as null.
      } catch (err) {
        console.error("Database connection failed. Is FastAPI running?");
      } finally {
        setIsAuthenticating(false);
      }
    };

    authenticateCommander();
  }, []);

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-mono text-emerald-400 animate-pulse">
        Establishing secure connection to Command Center Database...
      </div>
    );
  }

  // ✅ If backend says no user exists, render the Setup Form
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans animate-fade-in">
        <SetupForm onSetupComplete={(newProfile) => setProfile(newProfile)} />
      </div>
    );
  }

  // ✅ Profile verified. Load the OS.
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center pt-6 px-4 font-sans">
      
      <nav className="flex gap-1 mb-6 bg-slate-800 p-1.5 rounded-lg border border-slate-700 shadow-lg z-10 sticky top-4 flex-wrap justify-center">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('scratchpad')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'scratchpad' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>Scratchpad</button>
        <button onClick={() => setActiveTab('links')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'links' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>Directory</button>
        <button onClick={() => setActiveTab('strategy')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'strategy' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>Strategy</button>
        <button onClick={() => setActiveTab('timetable')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'timetable' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>Timetable</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'expenses' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>Finance</button>
      </nav>

      <div className="w-full flex justify-center">
        {/* ✅ Pass profile AND setProfile so the Dashboard can update the master state */}
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