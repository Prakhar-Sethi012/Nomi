import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LinksView from './components/LinksView';
import ScratchpadView from './components/ScratchpadView';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // START NULL: This forces the app to render the Onboarding screen for new users
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('cc_profile');
    if (saved) return JSON.parse(saved);
    return null; 
  });

  // Temporary state for the setup form
  const [setupData, setSetupData] = useState({ name: '', reg_no: '' });

  useEffect(() => {
    if (profile) {
      localStorage.setItem('cc_profile', JSON.stringify(profile));
    }
  }, [profile]);

  // ==========================================
  // STATE 1: THE ONBOARDING GUARD
  // ==========================================
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            setProfile({ name: setupData.name, reg_no: setupData.reg_no.toUpperCase() });
          }}
          className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md animate-fade-in"
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Initialize Profile</h1>
            <p className="text-slate-400 text-sm">Enter your details to lock in your identity. This cannot be changed later.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase tracking-wider">First Name</label>
              <input type="text" required value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} className="w-full p-3 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" placeholder="e.g. Rahul" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold mb-1 block uppercase tracking-wider">Registration Number</label>
              <input type="text" required value={setupData.reg_no} onChange={e => setSetupData({...setupData, reg_no: e.target.value})} className="w-full p-3 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none uppercase" placeholder="e.g. 25BCE0000" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors mt-2">
              Launch Command Center
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // STATE 2: THE MAIN APPLICATION
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center pt-6 px-4 font-sans">
      
<nav className="flex gap-1 mb-6 bg-slate-800 p-1.5 rounded-lg border border-slate-700 shadow-lg z-10 sticky top-4">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-5 py-2 rounded-md text-sm font-bold transition-all duration-200 ${
            activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('scratchpad')}
          className={`px-5 py-2 rounded-md text-sm font-bold transition-all duration-200 ${
            activeTab === 'scratchpad' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
        >
          Scratchpad
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-5 py-2 rounded-md text-sm font-bold transition-all duration-200 ${
            activeTab === 'links' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
        >
          Directory
        </button>
      </nav>

      <div className="w-full flex justify-center">
        {activeTab === 'dashboard' && <Dashboard profile={profile} />}
        {activeTab === 'scratchpad' && <ScratchpadView />}
        {activeTab === 'links' && <LinksView />}
      </div>
    </div>
  );
}

export default App;