import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ReadOnlyTimetable from './ReadOnlyTimetable';
import PinConfirmModal from './PinConfirmModal';

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

function CloseFriendsView() {
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeFriend, setActiveFriend] = useState(null);
  const [friendTimetable, setFriendTimetable] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [pinTargetId, setPinTargetId] = useState(null);

  // 🔥 MEETUP STATES
  const [meetupModalUser, setMeetupModalUser] = useState(null);
  const [meetupData, setMeetupData] = useState({ location: '', meet_time: '' });

  const loadDirectory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCloseFriends();
      setFriends(data);
    } catch (err) {
      console.error("Failed to load close friends", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDirectory(); }, []);

  const loadTimetable = async (friend) => {
    setIsLoading(true);
    try {
      const data = await api.getFriendTimetable(friend.user_id);
      setActiveFriend(friend);
      setFriendTimetable(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const executeDelete = async (npcId) => {
    try {
      await api.deleteCloseFriend(npcId);
      setDeletingId(null);
      loadDirectory();
    } catch (err) {
      console.error("Failed to delete clone", err);
    }
  };

  // 🔥 SEND MEETUP LOGIC
  const handleSendMeetup = async (e) => {
    e.preventDefault();
    try {
      // Uses the real_user_id we extracted in the backend!
      await api.sendMeetup({ 
        receiver_id: meetupModalUser.real_user_id || meetupModalUser.user_id, 
        location: meetupData.location, 
        meet_time: new Date(meetupData.meet_time).toISOString() 
      });
      setMeetupModalUser(null);
      setMeetupData({ location: '', meet_time: '' });
      alert("Meetup Request Sent!");
    } catch (err) { 
      console.error(err);
      alert("Failed to send request."); 
    }
  };

  if (isLoading) return <div className="text-emerald-400 text-center mt-20 animate-pulse font-mono">Loading Directory...</div>;

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col gap-6 h-[85vh]">
      
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">💾 Close Friends</h1>
          <p className="text-slate-400 text-sm">Offline schedules cloned directly to your account.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {!activeFriend ? (
          <div className="animate-fade-in">
            {friends.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center mt-10">
                <span className="text-4xl mb-4 opacity-50">📂</span>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Directory is Empty</h3>
                <p className="text-slate-500 max-w-sm">Go to your Social Radar and click 'Clone' on a friend's card to save their schedule here offline.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map(friend => {
                  const isFree = friend.live_status.is_free;
                  const statusBg = isFree ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30';
                  
                  return (
                    <div key={friend.user_id} onClick={() => loadTimetable(friend)} className={`group p-5 rounded-xl border shadow-lg transition-all flex flex-col h-full relative ${statusBg} cursor-pointer hover:scale-[1.02]`}>
                      
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-white">{friend.name}</h3>
                        <div className={`w-3 h-3 rounded-full ${isFree ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                      </div>

                      {isFree ? (
                        <p className="text-sm text-emerald-400 font-bold">Available right now</p>
                      ) : (
                        <div>
                          <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Currently in {friend.live_status.type}</p>
                          <p className="text-sm text-slate-300 font-medium truncate pr-32">{friend.live_status.class_name}</p>
                          <p className="text-xs text-slate-400 mt-1">Slot: {friend.live_status.slot} • Room: {friend.live_status.room}</p>
                        </div>
                      )}

                      {deletingId === friend.user_id ? (
                         <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900 border border-red-500/50 p-1.5 rounded z-10 animate-fade-in shadow-xl">
                           <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest ml-1">Remove?</span>
                           <button onClick={(e) => { e.stopPropagation(); setDeletingId(null); setPinTargetId(friend.user_id); }} className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold">Yes</button>
                           <button onClick={(e) => { e.stopPropagation(); setDeletingId(null); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded">No</button>
                         </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setDeletingId(friend.user_id); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-red-400 transition-opacity bg-slate-900/80 px-2 py-1 rounded-md">
                           ✕ Un-clone
                        </button>
                      )}

                      {/* 🔥 NEW: MEETUP BUTTON */}
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setMeetupModalUser(friend); }} className="opacity-0 group-hover:opacity-100 text-xs bg-slate-800 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-500 px-2 py-1.5 rounded transition-all">
                          🤝 Meet
                        </button>
                      </div>

                      <div className="mt-auto">
                        {friend.next_class && (
                          <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <div className="flex justify-between items-end mb-1">
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Next Class</p>
                              <span className="text-[10px] font-black text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
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
            )}
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col gap-6">
            <button onClick={() => setActiveFriend(null)} className="self-start text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors">← Back to Directory</button>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h2 className="text-xl font-black text-white mb-2">{activeFriend.name}'s Cloned Schedule</h2>
              <p className="text-slate-400 text-sm mb-6">Read-only offline copy.</p>
              
              {friendTimetable.length === 0 ? (
                <p className="text-slate-500 text-center italic py-10">No subjects logged.</p>
              ) : (
                <ReadOnlyTimetable subjects={friendTimetable} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 NEW: MEETUP MODAL */}
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

      <PinConfirmModal
        isOpen={pinTargetId !== null}
        onClose={() => setPinTargetId(null)}
        onConfirm={() => {
          executeDelete(pinTargetId);
          setPinTargetId(null);
        }}
        actionText="Un-clone Friend"
      />
    </div>
  );
}

export default CloseFriendsView;