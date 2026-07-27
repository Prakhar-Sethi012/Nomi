import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function SocialRadar() {
  // Navigation State (1: Lobby, 2: Roster, 3: Timetable)
  const [viewLevel, setViewLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Data State
  const [circles, setCircles] = useState([]);
  const [activeCircle, setActiveCircle] = useState(null);
  const [roster, setRoster] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [friendTimetable, setFriendTimetable] = useState([]);
  const [isGhost, setIsGhost] = useState(false);

  // Forms
  const [newCircleName, setNewCircleName] = useState('');
  const [joinToken, setJoinToken] = useState('');

  // ==========================================
  // LEVEL 1: THE LOBBY
  // ==========================================
  const loadLobby = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [circlesData, profile] = await Promise.all([
        api.getMyCircles(),
        api.getProfile()
      ]);
      setCircles(circlesData);
      setIsGhost(profile.is_ghost);
      setViewLevel(1);
    } catch (err) {
      setError('Failed to load your circles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLobby();
  }, []);

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    try {
      await api.createCircle({ name: newCircleName });
      setNewCircleName('');
      loadLobby();
    } catch (err) { setError(err.message || 'Failed to create circle.'); }
  };

  const handleJoinCircle = async (e) => {
    e.preventDefault();
    try {
      await api.joinCircle({ join_token: joinToken.toUpperCase() });
      setJoinToken('');
      loadLobby();
    } catch (err) { setError(err.message || 'Failed to join circle.'); }
  };

  const handleToggleGhostMode = async () => {
    try {
      const newStatus = !isGhost;
      await api.toggleGhostMode(newStatus);
      setIsGhost(newStatus);
    } catch (err) { setError('Failed to update privacy settings.'); }
  };

  // ==========================================
  // LEVEL 2: THE ROSTER
  // ==========================================
  const loadRoster = async (circle) => {
    setIsLoading(true);
    setError('');
    try {
      const rosterData = await api.getCircleRoster(circle.id);
      setActiveCircle(circle);
      setRoster(rosterData);
      setViewLevel(2);
    } catch (err) {
      setError('Failed to load roster. You might not have access.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LEVEL 3: READ-ONLY TIMETABLE
  // ==========================================
  const loadFriendTimetable = async (friend) => {
    if (friend.is_ghost) return; // Ghost protocol block
    
    setIsLoading(true);
    setError('');
    try {
      const timetableData = await api.getFriendTimetable(friend.user_id);
      setActiveFriend(friend);
      setFriendTimetable(timetableData);
      setViewLevel(3);
    } catch (err) {
      setError(err.message || 'Failed to access this timetable.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // RENDER BLOCKS
  // ==========================================
  if (isLoading) return <div className="text-indigo-400 text-center mt-20 animate-pulse font-mono">Syncing Database...</div>;

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col gap-6 h-[85vh]">
      
      {/* GLOBAL HEADER & GHOST MODE */}
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            📡 Social Radar
          </h1>
          <p className="text-slate-400 text-sm">Coordinate schedules with your circles.</p>
        </div>
        
        <button 
          onClick={handleToggleGhostMode}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${
            isGhost ? 'bg-slate-900 border-slate-600 text-slate-400 shadow-inner' : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30'
          }`}
        >
          {isGhost ? '👻 Ghost Mode: ON (Hidden)' : '🌍 Ghost Mode: OFF (Visible)'}
        </button>
      </header>

      {error && <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center font-bold shrink-0">{error}</div>}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {/* ========================================================= */}
        {/* VIEW LEVEL 1: THE LOBBY */}
        {/* ========================================================= */}
        {viewLevel === 1 && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Create / Join Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Create a Circle</h3>
                <form onSubmit={handleCreateCircle} className="flex gap-2">
                  <input type="text" placeholder="Circle Name..." required value={newCircleName} onChange={e => setNewCircleName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">+</button>
                </form>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Join a Circle</h3>
                <form onSubmit={handleJoinCircle} className="flex gap-2">
                  <input type="text" placeholder="6-Digit Token" required maxLength="6" value={joinToken} onChange={e => setJoinToken(e.target.value.toUpperCase())} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 uppercase tracking-widest font-mono" />
                  <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">Join</button>
                </form>
              </div>
            </div>

            {/* My Circles Grid */}
            <div>
              <h2 className="text-xl font-bold text-slate-300 mb-4 px-1">My Circles</h2>
              {circles.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center">
                  <p className="text-slate-400 font-bold">No circles joined yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {circles.map(circle => (
                    <div 
                      key={circle.id} 
                      onClick={() => loadRoster(circle)}
                      className="bg-slate-800 hover:bg-slate-750 p-5 rounded-xl border border-slate-700 hover:border-indigo-500 shadow-lg cursor-pointer transition-all group"
                    >
                      <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors mb-2">{circle.name}</h3>
                      <div className="inline-flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-600">
                        <span className="text-[10px] uppercase text-slate-500 font-bold">Code:</span>
                        <span className="text-indigo-400 font-mono text-xs font-black tracking-widest">{circle.join_token}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW LEVEL 2: THE ROSTER */}
        {/* ========================================================= */}
        {viewLevel === 2 && activeCircle && (
          <div className="animate-fade-in flex flex-col gap-6">
            <button onClick={() => setViewLevel(1)} className="self-start text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
              ← Back to Lobby
            </button>
            
            <div>
              <h2 className="text-2xl font-black text-white">{activeCircle.name} <span className="text-slate-500 font-normal">Roster</span></h2>
              <p className="text-slate-400 text-sm mt-1">Select a member to view their full schedule.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roster.length === 0 ? (
                <p className="text-slate-500 italic col-span-full">You are the only one here.</p>
              ) : (
                roster.map(friend => {
                  const isFree = friend.live_status.is_free;
                  const statusBg = friend.is_ghost ? 'bg-slate-900 border-slate-700' : isFree ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30';
                  
                  return (
                    <div 
                      key={friend.user_id} 
                      onClick={() => !friend.is_ghost && loadFriendTimetable(friend)}
                      className={`p-5 rounded-xl border shadow-lg transition-all ${statusBg} ${friend.is_ghost ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:scale-[1.02]'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-white">{friend.name}</h3>
                        <div className={`w-3 h-3 rounded-full ${friend.is_ghost ? 'bg-slate-500' : isFree ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                      </div>

                      {friend.is_ghost ? (
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest font-bold">👻 User is in Ghost Mode</p>
                      ) : isFree ? (
                        <p className="text-sm text-emerald-400 font-bold">Available right now</p>
                      ) : (
                        <div>
                          <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Currently in {friend.live_status.type}</p>
                          <p className="text-sm text-slate-300 font-medium truncate">{friend.live_status.class_name}</p>
                          <p className="text-xs text-slate-400 mt-1">Slot: {friend.live_status.slot} • Room: {friend.live_status.room}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW LEVEL 3: READ-ONLY TIMETABLE */}
        {/* ========================================================= */}
        {viewLevel === 3 && activeFriend && (
          <div className="animate-fade-in flex flex-col gap-6">
            <button onClick={() => setViewLevel(2)} className="self-start text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
              ← Back to {activeCircle.name} Roster
            </button>
            
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h2 className="text-xl font-black text-white mb-1">{activeFriend.name}'s Schedule</h2>
              <p className="text-slate-400 text-sm mb-6">Read-only view.</p>

              {friendTimetable.length === 0 ? (
                <p className="text-slate-500 text-center italic py-10">No subjects logged by this user.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friendTimetable.map(sub => (
                    <div key={sub.id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <h3 className="font-bold text-indigo-300 text-sm mb-2 truncate">{sub.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div className="bg-slate-800 p-2 rounded">
                          <span className="block text-[9px] uppercase font-bold text-slate-500">Theory Slot</span>
                          <span className="font-mono text-white">{sub.theory_slot || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-800 p-2 rounded">
                          <span className="block text-[9px] uppercase font-bold text-slate-500">Lab Slot</span>
                          <span className="font-mono text-white">{sub.lab_slot || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-800 p-2 rounded col-span-2 flex justify-between items-center">
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-500">Room</span>
                            <span className="font-mono text-white">{sub.room_number || 'TBA'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default SocialRadar;