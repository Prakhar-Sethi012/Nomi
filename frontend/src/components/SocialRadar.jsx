import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function SocialRadar() {
  const [radarData, setRadarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Forms
  const [newCircleName, setNewCircleName] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [isGhost, setIsGhost] = useState(false);

  const fetchRadar = async () => {
    try {
      const data = await api.getRadar();
      setRadarData(data);
      // Also grab the user's current ghost status to set the toggle correctly
      const profile = await api.getProfile();
      setIsGhost(profile.is_ghost);
    } catch (err) {
      setError('Failed to sync radar data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, []);

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    try {
      await api.createCircle({ name: newCircleName });
      setNewCircleName('');
      fetchRadar();
    } catch (err) {
      setError(err.message || 'Failed to create circle.');
    }
  };

  const handleJoinCircle = async (e) => {
    e.preventDefault();
    try {
      await api.joinCircle({ join_token: joinToken.toUpperCase() });
      setJoinToken('');
      fetchRadar();
    } catch (err) {
      setError(err.message || 'Failed to join circle.');
    }
  };

  const handleToggleGhostMode = async () => {
    try {
      const newStatus = !isGhost;
      await api.toggleGhostMode(newStatus);
      setIsGhost(newStatus);
    } catch (err) {
      setError('Failed to update privacy settings.');
    }
  };

  if (isLoading) return <div className="text-indigo-400 text-center mt-20 animate-pulse font-mono">Calibrating Radar...</div>;

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col gap-6">
      
      {/* HEADER & GHOST MODE TOGGLE */}
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            📡 Social Radar
          </h1>
          <p className="text-slate-400 text-sm">
            Coordinate schedules with your circles.
          </p>
        </div>
        
        <button 
          onClick={handleToggleGhostMode}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${
            isGhost 
              ? 'bg-slate-900 border-slate-600 text-slate-400 shadow-inner' 
              : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30'
          }`}
        >
          {isGhost ? '👻 Ghost Mode: ON (Hidden)' : '🌍 Ghost Mode: OFF (Visible)'}
        </button>
      </header>

      {error && <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center font-bold">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Create a Circle</h3>
            <form onSubmit={handleCreateCircle} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Circle Name..." 
                required 
                value={newCircleName} 
                onChange={e => setNewCircleName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">+</button>
            </form>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Join a Circle</h3>
            <form onSubmit={handleJoinCircle} className="flex gap-2">
              <input 
                type="text" 
                placeholder="6-Digit Token" 
                required 
                maxLength="6"
                value={joinToken} 
                onChange={e => setJoinToken(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 uppercase tracking-widest font-mono"
              />
              <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">Join</button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: CIRCLES DATA */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {radarData.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center">
              <span className="text-4xl mb-3">🛰️</span>
              <p className="text-slate-400 font-bold">No signals detected.</p>
              <p className="text-slate-500 text-sm mt-1">Create or join a circle to sync up with friends.</p>
            </div>
          ) : (
            radarData.map(circle => (
              <div key={circle.circle_id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                  <h2 className="text-lg font-black text-white">{circle.circle_name}</h2>
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-600">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Invite Code:</span>
                    <span className="text-indigo-400 font-mono font-black tracking-widest">{circle.join_token}</span>
                  </div>
                </div>

                {circle.friends.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">You are the only one in this circle right now.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {circle.friends.map((friend, idx) => (
                      <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2 h-2 rounded-full ${friend.is_ghost ? 'bg-slate-500' : 'bg-green-500'}`}></div>
                          <span className="font-bold text-slate-200">{friend.name}</span>
                        </div>
                        
                        {friend.is_ghost ? (
                          <div className="bg-slate-900 border border-slate-700/50 p-3 rounded text-center">
                            <span className="text-xs text-slate-500 italic">User is offline / hidden</span>
                          </div>
                        ) : friend.subjects.length === 0 ? (
                          <div className="bg-slate-900 border border-slate-700/50 p-3 rounded text-center">
                            <span className="text-xs text-slate-500 italic">No subjects added yet.</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {friend.subjects.map((sub, sIdx) => (
                              <span key={sIdx} className="text-[10px] bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 px-2 py-1 rounded">
                                {sub.name} {sub.room ? `(${sub.room})` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default SocialRadar;