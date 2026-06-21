import React, { useState, useEffect } from 'react';

function ProfileWidget() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', reg_no: '', cgpa: 0 });

  // ==========================================
  // 1. THE INITIAL LOAD (GET)
  // ==========================================
  const fetchProfile = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/profile/');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // Pre-fill the edit form with your current data
        setEditForm({ name: data.name, reg_no: data.reg_no, cgpa: data.cgpa || 0 });
      }
    } catch (err) {
      console.error("Failed to connect to Command Center Database");
    } finally {
      setIsLoading(false);
    }
  };

  // Run once when the dashboard loads
  useEffect(() => {
    fetchProfile();
  }, []);

  // ==========================================
  // 2. THE UPDATE SAVER (PUT)
  // ==========================================
  const saveProfile = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/profile/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // We are only sending the fields we allow the user to edit!
        body: JSON.stringify({
          name: editForm.name,
          reg_no: editForm.reg_no,
          cgpa: parseFloat(editForm.cgpa)
        })
      });

      if (res.ok) {
        const updatedData = await res.json();
        setProfile(updatedData); // Instantly update the UI
        setIsEditing(false);     // Close edit mode
      }
    } catch (err) {
      console.error("Failed to save changes");
    }
  };


  // ==========================================
  // 3. THE UI RENDER
  // ==========================================
  if (isLoading) {
    return <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 animate-pulse text-slate-400 text-sm">Authenticating Commander...</div>;
  }

  if (!profile) {
    return <div className="bg-slate-800 p-5 rounded-xl border border-red-900/50 text-red-400 text-sm">Database connection failed. Is FastAPI running?</div>;
  }

  return (
    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
      
      {/* Gamification Header: The Streak! */}
      <div className="absolute top-0 right-0 bg-indigo-600/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg border-b border-l border-indigo-500/30 flex items-center gap-1">
        🔥 {profile.current_streak} Day Streak
      </div>

      {!isEditing ? (
        // --- DISPLAY MODE ---
        <div className="flex flex-col gap-4 mt-2">
          <div>
            <h2 className="text-2xl font-black text-white">{profile.name}</h2>
            <p className="text-xs text-slate-400 font-mono tracking-widest">{profile.reg_no}</p>
          </div>

          <div className="flex justify-between items-end border-t border-slate-700/50 pt-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current CGPA</p>
              <span className="text-3xl font-black text-emerald-400">{profile.cgpa ? profile.cgpa.toFixed(2) : 'N/A'}</span>
            </div>
            
            <button 
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold text-slate-400 hover:text-white bg-slate-900/50 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded transition-all"
            >
              Edit Profile
            </button>
          </div>
        </div>
      ) : (
        // --- EDIT MODE ---
        <div className="flex flex-col gap-3 mt-2 animate-fade-in">
          <h2 className="text-sm font-bold text-indigo-400 border-b border-slate-700 pb-2">Update Credentials</h2>
          
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">Display Name</label>
            <input 
              type="text" 
              value={editForm.name} 
              onChange={e => setEditForm({...editForm, name: e.target.value})}
              className="w-full p-2 bg-slate-900 rounded text-sm text-white outline-none border border-slate-700 focus:border-indigo-500 mt-1" 
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Reg Number</label>
              <input 
                type="text" 
                value={editForm.reg_no} 
                onChange={e => setEditForm({...editForm, reg_no: e.target.value.toUpperCase()})}
                className="w-full p-2 bg-slate-900 rounded text-sm text-white outline-none border border-slate-700 mt-1 uppercase" 
              />
            </div>
            <div className="w-24">
              <label className="text-[10px] text-slate-400 uppercase font-bold">CGPA</label>
              <input 
                type="number" 
                step="0.01"
                value={editForm.cgpa} 
                onChange={e => setEditForm({...editForm, cgpa: e.target.value})}
                className="w-full p-2 bg-slate-900 rounded text-sm text-white outline-none border border-slate-700 mt-1" 
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setIsEditing(false)} 
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={saveProfile} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded transition-colors shadow-lg shadow-indigo-900/20"
            >
              Save Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default ProfileWidget;