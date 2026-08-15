import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ReadOnlyTimetable from './ReadOnlyTimetable';

const formatSmartTime = (minutes) => {
  if (minutes < 0) return { value: 'Now', unit: '' };
  if (minutes < 60) return { value: minutes, unit: `min${minutes !== 1 ? 's' : ''}` };
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return { value: hours, unit: `hr${hours !== 1 ? 's' : ''}` };
  }
  const days = Math.floor(minutes / 1440);
  return { value: days, unit: `day${days !== 1 ? 's' : ''}` };
};

function SocialRadar() {
  const [viewLevel, setViewLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [myProfileId, setMyProfileId] = useState(null);
  const [historyLog, setHistoryLog] = useState(null); 
  const [circles, setCircles] = useState([]);
  const [activeCircle, setActiveCircle] = useState(null);
  const [roster, setRoster] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [friendTimetable, setFriendTimetable] = useState([]);
  const [isGhost, setIsGhost] = useState(false);

  const [newCircleName, setNewCircleName] = useState('');
  const [customToken, setCustomToken] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchCircle, setSelectedSearchCircle] = useState(null);
  const [joinToken, setJoinToken] = useState('');

  const [editingNicknameId, setEditingNicknameId] = useState(null);
  const [newNickname, setNewNickname] = useState('');

  const [pendingCircleAction, setPendingCircleAction] = useState(null); 
  const [cloningId, setCloningId] = useState(null); 

  // 🔥 NEW: MEETUP ROOM STATES
  const [incomingMeetups, setIncomingMeetups] = useState([]);
  const [outgoingMeetups, setOutgoingMeetups] = useState([]);
  const [meetupModalUser, setMeetupModalUser] = useState(null); // Which friend are we asking out?
  const [meetupData, setMeetupData] = useState({ location: '', meet_time: '' });

  const fetchHistory = async () => {
    try {
      const data = await api.getCircleHistory(activeCircle.id);
      setHistoryLog(data);
    } catch (err) { alert(err.message); }
  };

  const loadLobby = async () => {
    setIsLoading(true); setError('');
    try {
      const [circlesData, profile, incoming, outgoing] = await Promise.all([ 
        api.getMyCircles(), 
        api.getProfile(),
        api.getIncomingMeetups(),
        api.getOutgoingMeetups()
      ]);
      setCircles(circlesData);
      setIsGhost(profile.is_ghost);
      setMyProfileId(profile.id);
      setIncomingMeetups(incoming);
      setOutgoingMeetups(outgoing);
      setViewLevel(1);
    } catch (err) { setError('Failed to load lobby data.'); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadLobby(); }, []);

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: newCircleName };
      if (customToken.trim()) payload.custom_token = customToken.trim();
      await api.createCircle(payload);
      setNewCircleName(''); setCustomToken(''); loadLobby();
    } catch (err) { setError(err.message || 'Token might be taken!'); }
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await api.searchCircles(q);
      setSearchResults(results);
    } catch (err) { console.error(err); }
  };

  const handleJoinSearchCircle = async (e) => {
    e.preventDefault();
    try { 
      await api.joinCircle({ join_token: joinToken.toUpperCase() }); 
      setSelectedSearchCircle(null); setJoinToken(''); setSearchQuery(''); setSearchResults([]);
      loadLobby(); 
    } catch (err) { setError(err.message || 'Failed to join. Invalid passcode.'); }
  };

  const executeLeaveOrDelete = async () => {
    try {
      if (pendingCircleAction === 'delete') await api.deleteCircle(activeCircle.id);
      else await api.leaveCircle(activeCircle.id);
      setPendingCircleAction(null);
      loadLobby();
    } catch (err) { setError(err.message); }
  };

  const executeClone = async (friendId) => {
    try {
      await api.cloneFriend(friendId);
      setCloningId(null);
      const oldRoster = [...roster];
      setRoster(roster.map(f => f.user_id === friendId ? { ...f, cloneSuccess: true } : f));
      setTimeout(() => setRoster(oldRoster), 2000);
    } catch (err) { setError(err.message || "Failed to clone friend."); setCloningId(null); }
  };

  const handleSaveNickname = async (e, friendId, reset = false) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await api.setNickname(friendId, reset ? '' : newNickname);
      setEditingNicknameId(null);
      loadRoster(activeCircle); 
    } catch (err) { setError('Failed to update nickname.'); }
  };

  // 🔥 NEW: Send Meetup Request
  const handleSendMeetup = async (e) => {
    e.preventDefault();
    try {
      await api.sendMeetup({ 
        receiver_id: meetupModalUser.user_id, 
        location: meetupData.location, 
        meet_time: new Date(meetupData.meet_time).toISOString() 
      });
      setMeetupModalUser(null);
      setMeetupData({ location: '', meet_time: '' });
      loadLobby(); // Refresh to see it in outgoing
      alert("Meetup Request Sent!");
    } catch (err) { setError("Failed to send meetup request."); }
  };

  // 🔥 NEW: Accept/Decline Meetup
  const handleUpdateMeetup = async (id, status) => {
    try {
      await api.updateMeetupStatus(id, status);
      loadLobby(); // Refresh lists
    } catch (err) { setError("Failed to update status."); }
  };

  const loadRoster = async (circle) => {
    setIsLoading(true); setError(''); setPendingCircleAction(null); setCloningId(null);
    try {
      const rosterData = await api.getCircleRoster(circle.id);
      setActiveCircle(circle); setRoster(rosterData); setViewLevel(2);
    } catch (err) { setError('Failed to load roster.'); } 
    finally { setIsLoading(false); }
  };

  const loadFriendTimetable = async (friend) => {
    if (friend.is_ghost) return; 
    setIsLoading(true); setError('');
    try {
      const timetableData = await api.getFriendTimetable(friend.user_id);
      setActiveFriend(friend); setFriendTimetable(timetableData); setViewLevel(3);
    } catch (err) { setError(err.message || 'Failed to access timetable.'); } 
    finally { setIsLoading(false); }
  };

  if (isLoading) return <div className="text-indigo-400 text-center mt-20 animate-pulse font-mono">Syncing Database...</div>;

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col gap-6 h-[85vh]">
      
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">📡 Social Radar</h1>
          <p className="text-slate-400 text-sm">Coordinate schedules with your circles.</p>
        </div>
        <button onClick={() => { const s = !isGhost; api.toggleGhostMode(s).then(() => setIsGhost(s)); }} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${isGhost ? 'bg-slate-900 border-slate-600 text-slate-400 shadow-inner' : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30'}`}>
          {isGhost ? '👻 Ghost Mode: ON (Hidden)' : '🌍 Ghost Mode: OFF (Visible)'}
        </button>
      </header>

      {error && <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center font-bold shrink-0">{error}</div>}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {viewLevel === 1 && (
          <div className="flex flex-col gap-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg flex flex-col">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Create a Circle</h3>
                <form onSubmit={handleCreateCircle} className="flex flex-col gap-3 mt-auto">
                  <input type="text" placeholder="Circle Name (e.g. Hostel Squad)" required value={newCircleName} onChange={e => setNewCircleName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Custom Passcode (Optional)" maxLength="10" value={customToken} onChange={e => setCustomToken(e.target.value.toUpperCase().replace(/\s/g, ''))} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 uppercase tracking-widest font-mono" />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">Create</button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg flex flex-col relative">
                <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Public Directory</h3>
                <div className="relative mt-auto">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                  <input type="text" placeholder="Search circles to join..." value={searchQuery} onChange={handleSearch} className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-all" />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-20 max-h-48 overflow-y-auto">
                    {searchResults.map(res => (
                      <div key={res.id} onClick={() => setSelectedSearchCircle(res)} className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0 flex justify-between items-center transition-colors">
                        <span className="text-white font-bold text-sm">{res.name}</span>
                        <span className="text-[10px] bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30 uppercase font-bold tracking-wider">Join</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-300 mb-4 px-1">My Circles</h2>
              {circles.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center">
                  <p className="text-slate-400 font-bold">No circles joined yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {circles.map(circle => (
                    <div key={circle.id} onClick={() => loadRoster(circle)} className="bg-slate-800 hover:bg-slate-750 p-5 rounded-xl border border-slate-700 hover:border-indigo-500 shadow-lg cursor-pointer transition-all group relative overflow-hidden">
                      {circle.creator_id === myProfileId && <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg">Leader</div>}
                      <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors mb-2 pr-8">{circle.name}</h3>
                      <div className="inline-flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-600">
                        <span className="text-[10px] uppercase text-slate-500 font-bold">Passcode:</span>
                        <span className="text-indigo-400 font-mono text-xs font-black tracking-widest">{circle.join_token}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🔥 NEW: MEETUP REQUEST ROOM */}
            <div className="mt-8 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl">
                <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">☕ The Request Room</h2>
                <p className="text-slate-400 text-xs mb-6 uppercase tracking-widest font-bold">Incoming & Outgoing Meetups</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Incoming Column */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700 pb-2">📥 Incoming Requests</h3>
                    <div className="flex flex-col gap-3">
                      {incomingMeetups.length === 0 ? <p className="text-xs text-slate-500 italic">No incoming requests.</p> : incomingMeetups.map(m => (
                        <div key={m.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col gap-3 shadow-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-white"><span className="text-indigo-400">{m.friend_name}</span> wants to meet!</p>
                              <p className="text-xs text-slate-400 mt-1">📍 {m.location}</p>
                              <p className="text-xs text-slate-400">⏰ {new Date(m.meet_time).toLocaleString()}</p>
                            </div>
                            {m.status === 'accepted' && <span className="bg-emerald-900/40 text-emerald-400 text-[10px] px-2 py-1 rounded font-bold uppercase border border-emerald-500/30">Accepted</span>}
                            {m.status === 'pending' && <span className="bg-amber-900/40 text-amber-400 text-[10px] px-2 py-1 rounded font-bold uppercase border border-amber-500/30">Pending</span>}
                          </div>
                          
                          {m.status === 'pending' && (
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => handleUpdateMeetup(m.id, 'accepted')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-3 py-1.5 rounded text-xs font-bold transition-all">Accept</button>
                              <button onClick={() => handleUpdateMeetup(m.id, 'declined')} className="flex-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 px-3 py-1.5 rounded text-xs font-bold transition-all">Decline</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outgoing Column */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 mb-3 border-b border-slate-700 pb-2">📤 Sent Requests</h3>
                    <div className="flex flex-col gap-3">
                      {outgoingMeetups.length === 0 ? <p className="text-xs text-slate-500 italic">No outgoing requests.</p> : outgoingMeetups.map(m => (
                        <div key={m.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col gap-2 opacity-80 hover:opacity-100 transition-opacity">
                          <p className="text-sm text-slate-300">Sent to <span className="font-bold text-white">{m.friend_name}</span></p>
                          <p className="text-xs text-slate-400">📍 {m.location} • ⏰ {new Date(m.meet_time).toLocaleString()}</p>
                          <div className="mt-1">
                            {m.status === 'accepted' && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">✓ They Accepted</span>}
                            {m.status === 'declined' && <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">✕ Declined</span>}
                            {m.status === 'pending' && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">... Waiting for response</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {viewLevel === 2 && activeCircle && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setViewLevel(1)} className="text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors">← Back to Lobby</button>
              
              <div className="flex items-center gap-4">
                {activeCircle.creator_id === myProfileId && (
                  <button onClick={fetchHistory} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1.5 rounded transition-all font-bold tracking-wider uppercase">
                    📜 Audit Log
                  </button>
                )}

                {pendingCircleAction ? (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mr-2">Are you sure?</span>
                    <button onClick={() => setPendingCircleAction(null)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-all font-bold">No</button>
                    <button onClick={executeLeaveOrDelete} className="text-xs bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] px-3 py-1.5 rounded transition-all font-bold">Yes</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setPendingCircleAction(activeCircle.creator_id === myProfileId ? 'delete' : 'leave')} 
                    className="text-xs bg-red-900/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 px-3 py-1.5 rounded transition-all font-bold tracking-wider uppercase"
                  >
                    {activeCircle.creator_id === myProfileId ? '🗑️ Destroy Circle' : '🚪 Leave Circle'}
                  </button>
                )}
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-white">{activeCircle.name} <span className="text-slate-500 font-normal">Roster</span></h2>
              <p className="text-slate-400 text-sm mt-1">Select a member to view their schedule, or hover to interact.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roster.length === 0 ? <p className="text-slate-500 italic col-span-full">You are the only one here.</p> : roster.map(friend => {
                const isFree = friend.live_status.is_free;
                const statusBg = friend.is_ghost ? 'bg-slate-900 border-slate-700' : isFree ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30';
                
                return (
                  <div key={friend.user_id} onClick={() => !friend.is_ghost && loadFriendTimetable(friend)} className={`group p-5 rounded-xl border shadow-lg transition-all flex flex-col h-full relative ${statusBg} ${friend.is_ghost ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:scale-[1.02]'}`}>
                    
                    {editingNicknameId === friend.user_id ? (
                      <form onSubmit={(e) => handleSaveNickname(e, friend.user_id)} className="flex items-center gap-2 mb-3" onClick={e => e.stopPropagation()}>
                        <input type="text" value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="Set Nickname..." className="bg-slate-950 text-white text-sm px-3 py-1 rounded border border-indigo-500 outline-none w-full" autoFocus/>
                        <button type="button" onClick={(e) => handleSaveNickname(e, friend.user_id, true)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1.5 rounded" title="Reset to Original Name">↺</button>
                        <button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-bold">Save</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingNicknameId(null); }} className="text-xs text-slate-400 hover:text-white px-2">✕</button>
                      </form>
                    ) : (
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{friend.name}</h3>
                          <button onClick={(e) => { e.stopPropagation(); setEditingNicknameId(friend.user_id); setNewNickname(friend.name !== friend.real_name ? friend.name : ''); }} className="text-xs opacity-0 group-hover:opacity-100 text-slate-500 hover:text-indigo-400 transition-opacity bg-slate-900/80 px-2 py-1 rounded-md">✏️ Edit</button>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${friend.is_ghost ? 'bg-slate-500' : isFree ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                      </div>
                    )}

                    {/* 🔥 NEW: Interactive Hover Buttons (Clone & Meet) */}
                    {!friend.is_ghost && (
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        {/* Clone Logic */}
                        {cloningId === friend.user_id ? (
                          <div className="flex items-center gap-2 bg-slate-900 border border-emerald-500/50 p-1.5 rounded z-10 animate-fade-in shadow-xl">
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest ml-1">Clone?</span>
                            <button onClick={(e) => { e.stopPropagation(); executeClone(friend.user_id); }} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold">Yes</button>
                            <button onClick={(e) => { e.stopPropagation(); setCloningId(null); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">No</button>
                          </div>
                        ) : friend.cloneSuccess ? (
                           <div className="text-[10px] text-emerald-400 font-bold bg-emerald-900/40 px-2 py-1.5 rounded border border-emerald-500/30 animate-fade-in flex items-center">
                             ✓ Cloned
                           </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setCloningId(friend.user_id); }} className="opacity-0 group-hover:opacity-100 text-xs bg-slate-800 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500 px-2 py-1.5 rounded transition-all">
                            💾 Clone
                          </button>
                        )}

                        {/* Meetup Button */}
                        <button onClick={(e) => { e.stopPropagation(); setMeetupModalUser(friend); }} className="opacity-0 group-hover:opacity-100 text-xs bg-slate-800 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-500 px-2 py-1.5 rounded transition-all">
                          🤝 Meet
                        </button>
                      </div>
                    )}

                    {friend.is_ghost ? (
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-widest font-bold">👻 User is in Ghost Mode</p>
                    ) : isFree ? (
                      <p className="text-sm text-emerald-400 font-bold">Available right now</p>
                    ) : (
                      <div>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Currently in {friend.live_status.type}</p>
                        <p className="text-sm text-slate-300 font-medium truncate pr-32">{friend.live_status.class_name}</p>
                        <p className="text-xs text-slate-400 mt-1">Slot: {friend.live_status.slot} • Room: {friend.live_status.room}</p>
                      </div>
                    )}

                    <div className="mt-auto">
                      {friend.next_class && !friend.is_ghost && (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                          <div className="flex justify-between items-end mb-1">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Next Class</p>
                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider">
                              In {formatSmartTime(friend.next_class.minutes_until).value} {formatSmartTime(friend.next_class.minutes_until).unit}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 font-bold truncate pr-32">{friend.next_class.name}</p>
                          <p className="text-xs text-slate-400 mt-1">Slot {friend.next_class.slot} • {friend.next_class.room}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewLevel === 3 && activeFriend && (
          <div className="animate-fade-in flex flex-col gap-6">
            <button onClick={() => setViewLevel(2)} className="self-start text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors">← Back to {activeCircle.name} Roster</button>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h2 className="text-xl font-black text-white mb-2">{activeFriend.name}'s Schedule</h2>
              <p className="text-slate-400 text-sm mb-6">Read-only view.</p>
              
              {friendTimetable.length === 0 ? (
                <p className="text-slate-500 text-center italic py-10">No subjects logged by this user.</p>
              ) : (
                <ReadOnlyTimetable subjects={friendTimetable} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* JOIN SEARCH CIRCLE MODAL */}
      {selectedSearchCircle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-black text-white mb-2">Join {selectedSearchCircle.name}</h3>
            <p className="text-sm text-slate-400 mb-6">Enter the passcode provided by the creator.</p>
            <form onSubmit={handleJoinSearchCircle} className="flex flex-col gap-4">
              <input type="text" required autoFocus placeholder="Passcode..." value={joinToken} onChange={e => setJoinToken(e.target.value.toUpperCase().replace(/\s/g, ''))} className="bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:border-indigo-500 uppercase tracking-widest font-mono text-center" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedSearchCircle(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-bold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">Enter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔥 NEW: SEND MEETUP REQUEST MODAL */}
      {meetupModalUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-black text-white mb-2">🤝 Meet {meetupModalUser.name}</h3>
            <p className="text-sm text-slate-400 mb-6">Send a quick ping to coordinate a meetup.</p>
            <form onSubmit={handleSendMeetup} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Where?</label>
                <input type="text" required placeholder="e.g., Foody, SJT Lobby..." value={meetupData.location} onChange={e => setMeetupData({...meetupData, location: e.target.value})} className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">When?</label>
                <input type="datetime-local" required value={meetupData.meet_time} onChange={e => setMeetupData({...meetupData, meet_time: e.target.value})} className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 font-mono text-sm" />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setMeetupModalUser(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-bold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">Send Ping</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {historyLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setHistoryLog(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-white">📜 Audit Log (30 Days)</h3>
              <button onClick={() => setHistoryLog(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
              {historyLog.length === 0 ? <p className="text-slate-500 text-center italic mt-10">No recent activity.</p> : historyLog.map((log, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{log.action === 'joined' ? '👋' : '🚪'}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{log.user_name}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${log.action === 'joined' ? 'text-emerald-400' : 'text-red-400'}`}>{log.action}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SocialRadar;