import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { api } from '../services/api';
import ReadOnlyTimetable from './ReadOnlyTimetable';
import PinConfirmModal from './PinConfirmModal'; // 🔥 IMPORT MODAL
import BottomSheet from './ui/BottomSheet';
import HoldToConfirm from './ui/HoldToConfirm';
import NotificationStack from './ui/NotificationStack';
import SegmentedControl from './ui/SegmentedControl';
import Skeleton from './ui/Skeleton';
import PullToRefresh from './ui/PullToRefresh';
import CopyButton from './ui/CopyButton';
import { useAppMotion } from '../hooks/useAppMotion';
import { haptics } from '../utils/haptics';

// Push slides the incoming screen in from the right while the outgoing one
// parallaxes back and dims; pop reverses both. `direction` (+1 push, -1 pop)
// is threaded through as `custom` so the same variant object serves both.
const screenVariants = {
  initial: (direction) => ({ x: direction > 0 ? '100%' : '-30%', opacity: direction > 0 ? 1 : 0.4 }),
  animate: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? '-30%' : '100%', opacity: direction > 0 ? 0.4 : 1 }),
};

const EDGE_DRAG_THRESHOLD = 100;
const EDGE_DRAG_VELOCITY = 500;

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

function SocialRadar({ profile, setProfile }) {
  const [viewLevel, setViewLevel] = useState(1);
  const [direction, setDirection] = useState(1);
  const [requestTab, setRequestTab] = useState('incoming');
  // Named motionCfg (not `m`) since `m` is already this file's convention
  // for a single meetup item in .map() callbacks.
  const motionCfg = useAppMotion();
  const dragControls = useDragControls();

  // Wraps setViewLevel so every level change also records whether it's a
  // push (deeper) or a pop (back) — the shared transition needs to know
  // which way to slide/parallax.
  const goToLevel = (nextLevel) => {
    setDirection(nextLevel > viewLevel ? 1 : -1);
    setViewLevel(nextLevel);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyLog, setHistoryLog] = useState(null);
  const [circles, setCircles] = useState([]);
  const [activeCircle, setActiveCircle] = useState(null);
  const [roster, setRoster] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [friendTimetable, setFriendTimetable] = useState([]);

  // Ghost Mode now lives solely on the shared `profile` (App.jsx) — no more
  // separate local copy that could drift out of sync with the Dashboard toggle.
  const myProfileId = profile?.id ?? null;
  const isGhost = profile?.is_ghost ?? false;

  const [newCircleName, setNewCircleName] = useState('');
  const [customToken, setCustomToken] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchCircle, setSelectedSearchCircle] = useState(null);
  const [joinToken, setJoinToken] = useState('');

  const [editingNicknameId, setEditingNicknameId] = useState(null);
  const [newNickname, setNewNickname] = useState('');

  // 🔥 MODAL STATE
  const [pendingCircleAction, setPendingCircleAction] = useState(null); // 'leave' or 'delete'
  const [cloningId, setCloningId] = useState(null); 

  const [incomingMeetups, setIncomingMeetups] = useState([]);
  const [outgoingMeetups, setOutgoingMeetups] = useState([]);
  const [meetupModalUser, setMeetupModalUser] = useState(null);
  const [meetupData, setMeetupData] = useState({ location: '', meet_time: '' });

  // Tracks pending "clone success" revert timers so they can be cancelled on unmount.
  const cloneTimersRef = useRef([]);
  useEffect(() => {
    const timers = cloneTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await api.getCircleHistory(activeCircle.id);
      setHistoryLog(data);
    } catch (err) { alert(err.message); }
  };

  const loadLobby = async () => {
    setIsLoading(true); setError('');
    try {
      const [circlesData, freshProfile, incoming, outgoing] = await Promise.all([
        api.getMyCircles(),
        api.getProfile(),
        api.getIncomingMeetups(),
        api.getOutgoingMeetups()
      ]);
      setCircles(circlesData);
      setProfile(freshProfile);
      setIncomingMeetups(incoming);
      setOutgoingMeetups(outgoing);
      setDirection(-1);
      setViewLevel(1);
    } catch (err) { setError('Failed to load lobby data.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadLobby(); }, []);

  const handleGhostModeToggle = async () => {
    const newGhostState = !isGhost;
    setProfile(prev => ({ ...prev, is_ghost: newGhostState }));
    try {
      const updatedProfile = await api.updateProfile({ is_ghost: newGhostState });
      setProfile(updatedProfile);
    } catch (err) {
      setProfile(prev => ({ ...prev, is_ghost: !newGhostState }));
      setError('Failed to toggle Ghost Mode.');
    }
  };

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
      setRoster(prev => prev.map(f => f.user_id === friendId ? { ...f, cloneSuccess: true } : f));
      const timerId = setTimeout(() => {
        setRoster(prev => prev.map(f => f.user_id === friendId ? { ...f, cloneSuccess: false } : f));
      }, 2000);
      cloneTimersRef.current.push(timerId);
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
      loadLobby(); 
      alert("Meetup Request Sent!");
    } catch (err) { setError("Failed to send meetup request."); }
  };

  const handleUpdateMeetup = async (id, status) => {
    try {
      await api.updateMeetupStatus(id, status);
      // Optimistic local update instead of a full loadLobby() refetch, so the
      // card's own collapse-then-crossfade transition gets to play instead of
      // the whole list jumping to a freshly-fetched snapshot mid-animation.
      setIncomingMeetups(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      if (status === 'accepted') haptics.success(); else haptics.warning();
    } catch (err) { setError("Failed to update status."); }
  };

  // A meetup request is a notification: the action row collapses on height
  // and opacity once it's answered, and the status badge crossfades in to
  // replace it, rather than the whole card snapping to its new state.
  const renderIncomingMeetup = (meetup) => (
    <motion.div layout className="bg-surface border border-border p-4 rounded-lg flex flex-col gap-3 shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold text-textPrimary"><span className="text-accent">{meetup.friend_name}</span> wants to meet!</p>
          <p className="text-xs text-textSecondary mt-1">📍 {meetup.location}</p>
          <p className="text-xs text-textSecondary">⏰ {new Date(meetup.meet_time).toLocaleString()}</p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {meetup.status === 'accepted' && (
            <motion.span key="accepted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-success/10 text-success text-[10px] px-2 py-1 rounded font-bold uppercase border border-success/30 shrink-0">Accepted</motion.span>
          )}
          {meetup.status === 'pending' && (
            <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-amber-900/40 text-amber-400 text-[10px] px-2 py-1 rounded font-bold uppercase border border-amber-500/30 shrink-0">Pending</motion.span>
          )}
          {meetup.status === 'declined' && (
            <motion.span key="declined" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-dangerBg text-danger text-[10px] px-2 py-1 rounded font-bold uppercase border border-danger/30 shrink-0">Declined</motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {meetup.status === 'pending' && (
          <motion.div
            key="actions"
            layout
            initial={false}
            exit={{ opacity: 0, height: 0 }}
            transition={motionCfg.base}
            className="flex gap-2 mt-1 overflow-hidden"
          >
            <button onClick={() => handleUpdateMeetup(meetup.id, 'accepted')} className="flex-1 bg-success/10 hover:bg-success text-success hover:text-white border border-success/30 px-3 py-1.5 rounded text-xs font-bold transition-all">Accept</button>
            <button onClick={() => handleUpdateMeetup(meetup.id, 'declined')} className="flex-1 bg-dangerBg hover:bg-danger text-danger hover:text-white border border-danger/30 px-3 py-1.5 rounded text-xs font-bold transition-all">Decline</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const loadRoster = async (circle) => {
    setIsLoading(true); setError(''); setPendingCircleAction(null); setCloningId(null);
    try {
      const rosterData = await api.getCircleRoster(circle.id);
      setActiveCircle(circle); setRoster(rosterData); setDirection(1); setViewLevel(2);
    } catch (err) { setError('Failed to load roster.'); }
    finally { setIsLoading(false); }
  };

  const loadFriendTimetable = async (friend) => {
    if (friend.is_ghost) return;
    setIsLoading(true); setError('');
    try {
      const timetableData = await api.getFriendTimetable(friend.user_id);
      setActiveFriend(friend); setFriendTimetable(timetableData); setDirection(1); setViewLevel(3);
    } catch (err) { setError(err.message || 'Failed to access timetable.'); }
    finally { setIsLoading(false); }
  };

  const handleEdgePopDragEnd = (_event, info) => {
    if (info.offset.x > EDGE_DRAG_THRESHOLD || info.velocity.x > EDGE_DRAG_VELOCITY) {
      if (viewLevel === 3) goToLevel(2);
      else if (viewLevel === 2) goToLevel(1);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl pb-10 mx-auto flex flex-col gap-6 h-auto md:h-[85dvh]">
        <div className="bg-surface p-6 rounded-xl border border-border shadow-lg flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col gap-6 h-auto md:h-[85dvh]">

      <header className="bg-surface p-6 rounded-xl border border-border shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary mb-1 flex items-center gap-2">📡 Social Radar</h1>
          <p className="text-textSecondary text-sm">Coordinate schedules with your circles.</p>
        </div>
        <button onClick={handleGhostModeToggle} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${isGhost ? 'bg-background border-border text-textSecondary shadow-inner' : 'bg-accent/20 border-accent/50 text-accent hover:bg-accent/30'}`}>
          {isGhost ? '👻 Ghost Mode: ON (Hidden)' : '🌍 Ghost Mode: OFF (Visible)'}
        </button>
      </header>

      {error && <div className="bg-dangerBg border border-danger text-danger p-3 rounded-lg text-sm text-center font-bold shrink-0">{error}</div>}

      <PullToRefresh onRefresh={loadLobby} className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={viewLevel}
          custom={direction}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={motionCfg.gentle}
          drag={viewLevel > 1 ? 'x' : false}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ left: 0 }}
          onDragEnd={handleEdgePopDragEnd}
          className="relative"
        >
        {viewLevel > 1 && (
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="absolute left-0 top-0 bottom-0 w-5 z-20 touch-none"
            aria-hidden="true"
          />
        )}
        {viewLevel === 1 && (
          <div className="flex flex-col gap-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col">
                <h3 className="text-textPrimary font-bold mb-3 text-sm uppercase tracking-wider">Create a Circle</h3>
                <form onSubmit={handleCreateCircle} className="flex flex-col gap-3 mt-auto">
                  <input type="text" placeholder="Circle Name (e.g. Hostel Squad)" required value={newCircleName} onChange={e => setNewCircleName(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent" />
                  <div className="flex gap-2">
                    <input type="text" placeholder="Custom Passcode (Optional)" maxLength="10" value={customToken} onChange={e => setCustomToken(e.target.value.toUpperCase().replace(/\s/g, ''))} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent uppercase tracking-widest font-mono" />
                    <button type="submit" className="bg-accent hover:bg-accentHover text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">Create</button>
                  </div>
                </form>
              </div>

              <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col relative">
                <h3 className="text-textPrimary font-bold mb-3 text-sm uppercase tracking-wider">Public Directory</h3>
                <div className="relative mt-auto">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">🔍</span>
                  <input type="text" placeholder="Search circles to join..." value={searchQuery} onChange={handleSearch} className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-textPrimary outline-none focus:border-accent transition-all" />
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-2xl z-20 max-h-48 overflow-y-auto">
                    {searchResults.map(res => (
                      <div key={res.id} onClick={() => setSelectedSearchCircle(res)} className="p-3 hover:bg-surfaceHover cursor-pointer border-b border-border last:border-0 flex justify-between items-center transition-colors">
                        <span className="text-textPrimary font-bold text-sm">{res.name}</span>
                        <span className="text-[10px] bg-accent/20 text-accent px-2 py-1 rounded border border-accent/30 uppercase font-bold tracking-wider">Join</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-textPrimary mb-4 px-1">My Circles</h2>
              {circles.length === 0 ? (
                <div className="bg-surface/50 border border-border border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center">
                  <p className="text-textSecondary font-bold">No circles joined yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {circles.map(circle => (
                    <div key={circle.id} onClick={() => loadRoster(circle)} className="bg-surface hover:bg-surfaceHover p-5 rounded-xl border border-border hover:border-accent shadow-lg cursor-pointer transition-all group relative overflow-hidden">
                      {circle.creator_id === myProfileId && <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-bl-lg">Leader</div>}
                      <h3 className="text-lg font-black text-textPrimary group-hover:text-accent transition-colors mb-2 pr-8">{circle.name}</h3>
                      <div className="inline-flex items-center gap-2 bg-background px-2 py-1 rounded border border-border">
                        <span className="text-[10px] uppercase text-textSecondary font-bold">Passcode:</span>
                        <span className="text-accent font-mono text-xs font-black tracking-widest">{circle.join_token}</span>
                        <CopyButton
                          value={circle.join_token}
                          title="Copy Passcode"
                          className="text-textSecondary hover:text-accent flex items-center justify-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-background border border-border p-6 rounded-xl shadow-2xl">
                <h2 className="text-xl font-black text-textPrimary mb-1 flex items-center gap-2">☕ The Request Room</h2>
                <p className="text-textSecondary text-xs mb-6 uppercase tracking-widest font-bold">Incoming & Outgoing Meetups</p>

                <div className="md:hidden mb-6">
                  <SegmentedControl
                    value={requestTab}
                    onChange={setRequestTab}
                    options={[
                      { value: 'incoming', label: '📥 Incoming' },
                      { value: 'outgoing', label: '📤 Outgoing' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Incoming Column */}
                  <div className={requestTab === 'incoming' ? '' : 'hidden md:block'}>
                    <h3 className="text-sm font-bold text-textPrimary mb-3 border-b border-border pb-2">📥 Incoming Requests</h3>
                    {incomingMeetups.length === 0 ? (
                      <p className="text-xs text-textSecondary italic">No incoming requests.</p>
                    ) : (
                      <NotificationStack
                        items={incomingMeetups}
                        keyExtractor={(meetup) => meetup.id}
                        renderItem={renderIncomingMeetup}
                      />
                    )}
                  </div>

                  {/* Outgoing Column */}
                  <div className={requestTab === 'outgoing' ? '' : 'hidden md:block'}>
                    <h3 className="text-sm font-bold text-textPrimary mb-3 border-b border-border pb-2">📤 Sent Requests</h3>
                    <div className="flex flex-col gap-3">
                      {outgoingMeetups.length === 0 ? <p className="text-xs text-textSecondary italic">No outgoing requests.</p> : outgoingMeetups.map(m => (
                        <div key={m.id} className="bg-surface border border-border p-4 rounded-lg flex flex-col gap-2 opacity-80 hover:opacity-100 transition-opacity">
                          <p className="text-sm text-textSecondary">Sent to <span className="font-bold text-textPrimary">{m.friend_name}</span></p>
                          <p className="text-xs text-textSecondary">📍 {m.location} • ⏰ {new Date(m.meet_time).toLocaleString()}</p>
                          <div className="mt-1">
                            {m.status === 'accepted' && <span className="text-[10px] text-success font-bold uppercase tracking-widest">✓ They Accepted</span>}
                            {m.status === 'declined' && <span className="text-[10px] text-danger font-bold uppercase tracking-widest">✕ Declined</span>}
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
              <button onClick={() => goToLevel(1)} className="text-sm text-textSecondary hover:text-textPrimary flex items-center gap-2 transition-colors">← Back to Lobby</button>

              <div className="flex items-center gap-4">
                {activeCircle.creator_id === myProfileId && (
                  <button onClick={fetchHistory} className="text-xs bg-surface hover:bg-surfaceHover text-textPrimary border border-border px-3 py-1.5 rounded transition-all font-bold tracking-wider uppercase">
                    📜 Audit Log
                  </button>
                )}

                {/* 🔥 OPEN MODAL BUTTON */}
                {activeCircle.creator_id === myProfileId ? (
                  <HoldToConfirm
                    onConfirm={() => setPendingCircleAction('delete')}
                    className="text-xs bg-dangerBg text-danger border border-danger/30 px-3 py-1.5 rounded font-bold tracking-wider uppercase"
                  >
                    🗑️ Destroy Circle
                  </HoldToConfirm>
                ) : (
                  <button
                    onClick={() => setPendingCircleAction('leave')}
                    className="text-xs bg-dangerBg hover:bg-danger text-danger hover:text-white border border-danger/30 px-3 py-1.5 rounded transition-all font-bold tracking-wider uppercase"
                  >
                    🚪 Leave Circle
                  </button>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-textPrimary">{activeCircle.name} <span className="text-textSecondary font-normal">Roster</span></h2>
              <p className="text-textSecondary text-sm mt-1">Select a member to view their schedule, or hover to interact.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roster.length === 0 ? <p className="text-textSecondary italic col-span-full">You are the only one here.</p> : roster.map(friend => {
                const isFree = friend.live_status.is_free;
                const statusBg = friend.is_ghost ? 'bg-background border-border' : isFree ? 'bg-success/10 border-success/30' : 'bg-dangerBg border-danger/30';

                return (
                  <motion.div key={friend.user_id} layoutId={`member-${friend.user_id}`} onClick={() => !friend.is_ghost && loadFriendTimetable(friend)} className={`group p-5 rounded-xl border shadow-lg transition-all flex flex-col h-full relative ${statusBg} ${friend.is_ghost ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:scale-[1.02]'}`}>

                    {editingNicknameId === friend.user_id ? (
                      <form onSubmit={(e) => handleSaveNickname(e, friend.user_id)} className="flex items-center gap-2 mb-3" onClick={e => e.stopPropagation()}>
                        <input type="text" value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="Set Nickname..." className="bg-background text-textPrimary text-sm px-3 py-1 rounded border border-accent outline-none w-full" autoFocus/>
                        <button type="button" onClick={(e) => handleSaveNickname(e, friend.user_id, true)} className="text-xs bg-surfaceHover hover:bg-border text-textPrimary px-2 py-1.5 rounded" title="Reset to Original Name">↺</button>
                        <button type="submit" className="text-xs bg-accent hover:bg-accentHover text-white px-3 py-1.5 rounded font-bold">Save</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingNicknameId(null); }} className="text-xs text-textSecondary hover:text-textPrimary px-2">✕</button>
                      </form>
                    ) : (
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-textPrimary">{friend.name}</h3>
                          <button onClick={(e) => { e.stopPropagation(); setEditingNicknameId(friend.user_id); setNewNickname(friend.name !== friend.real_name ? friend.name : ''); }} className="text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 text-textSecondary hover:text-accent transition-opacity bg-background/80 px-2 py-1 rounded-md">✏️ Edit</button>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${friend.is_ghost ? 'bg-textSecondary' : isFree ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-danger'}`}></div>
                      </div>
                    )}

                    {!friend.is_ghost && (
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        {cloningId === friend.user_id ? (
                          <div className="flex items-center gap-2 bg-background border border-success/50 p-1.5 rounded z-10 animate-fade-in shadow-xl">
                            <span className="text-[9px] text-success font-bold uppercase tracking-widest ml-1">Clone?</span>
                            <button onClick={(e) => { e.stopPropagation(); executeClone(friend.user_id); }} className="text-[10px] bg-success hover:opacity-90 text-white px-2 py-1 rounded font-bold">Yes</button>
                            <button onClick={(e) => { e.stopPropagation(); setCloningId(null); }} className="text-[10px] bg-surfaceHover hover:bg-border text-textPrimary px-2 py-1 rounded">No</button>
                          </div>
                        ) : friend.cloneSuccess ? (
                           <div className="text-[10px] text-success font-bold bg-success/20 px-2 py-1.5 rounded border border-success/30 flex items-center gap-1.5">
                              <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0" fill="none">
                                <motion.path
                                  d="M4 12l6 6L20 6"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.4, ease: 'easeOut' }}
                                />
                              </svg>
                              Cloned
                           </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setCloningId(friend.user_id); }} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs bg-surface hover:bg-success/20 text-textSecondary hover:text-success border border-border hover:border-success px-2 py-1.5 rounded transition-all">
                            💾 Clone
                          </button>
                        )}

                        <button onClick={(e) => { e.stopPropagation(); setMeetupModalUser(friend); }} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs bg-surface hover:bg-accent/30 text-textSecondary hover:text-accent border border-border hover:border-accent px-2 py-1.5 rounded transition-all">
                          🤝 Meet
                        </button>
                      </div>
                    )}

                    {friend.is_ghost ? (
                      <p className="text-xs text-textSecondary font-mono uppercase tracking-widest font-bold">👻 User is in Ghost Mode</p>
                    ) : isFree ? (
                      <p className="text-sm text-success font-bold">Available right now</p>
                    ) : (
                      <div>
                        <p className="text-xs text-danger font-bold uppercase tracking-wider mb-1">Currently in {friend.live_status.type}</p>
                        <p className="text-sm text-textPrimary font-medium truncate pr-32">{friend.live_status.class_name}</p>
                        <p className="text-xs text-textSecondary mt-1">Slot: {friend.live_status.slot} • Room: {friend.live_status.room}</p>
                      </div>
                    )}

                    <div className="mt-auto">
                      {friend.next_class && !friend.is_ghost && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex justify-between items-end mb-1">
                            <p className="text-[10px] uppercase tracking-widest text-textSecondary font-bold">Next Class</p>
                            <span className="text-[10px] font-black text-accent bg-accent/20 px-2 py-0.5 rounded border border-accent/20 uppercase tracking-wider">
                              In {formatSmartTime(friend.next_class.minutes_until).value} {formatSmartTime(friend.next_class.minutes_until).unit}
                            </span>
                          </div>
                          <p className="text-sm text-textPrimary font-bold truncate pr-32">{friend.next_class.name}</p>
                          <p className="text-xs text-textSecondary mt-1">Slot {friend.next_class.slot} • {friend.next_class.room}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {viewLevel === 3 && activeFriend && (
          <div className="flex flex-col gap-6">
            <button onClick={() => goToLevel(2)} className="self-start text-sm text-textSecondary hover:text-textPrimary flex items-center gap-2 transition-colors">← Back to {activeCircle.name} Roster</button>
            <motion.div layoutId={`member-${activeFriend.user_id}`} className="bg-surface p-6 rounded-xl border border-border shadow-lg">
              <h2 className="text-xl font-black text-textPrimary mb-2">{activeFriend.name}'s Schedule</h2>
              <p className="text-textSecondary text-sm mb-6">Read-only view.</p>

              {friendTimetable.length === 0 ? (
                <p className="text-textSecondary text-center italic py-10">No subjects logged by this user.</p>
              ) : (
                <ReadOnlyTimetable subjects={friendTimetable} />
              )}
            </motion.div>
          </div>
        )}
        </motion.div>
      </AnimatePresence>
      </div>
      </PullToRefresh>

      {/* JOIN SEARCH CIRCLE SHEET */}
      <BottomSheet
        isOpen={!!selectedSearchCircle}
        onClose={() => setSelectedSearchCircle(null)}
        title={selectedSearchCircle ? `Join ${selectedSearchCircle.name}` : ''}
      >
        <p className="text-sm text-textSecondary mb-6">Enter the passcode provided by the creator.</p>
        <form onSubmit={handleJoinSearchCircle} className="flex flex-col gap-4">
          <input type="text" required placeholder="Passcode..." value={joinToken} onChange={e => setJoinToken(e.target.value.toUpperCase().replace(/\s/g, ''))} className="bg-background border border-border rounded-lg px-4 py-3 text-textPrimary outline-none focus:border-accent uppercase tracking-widest font-mono text-center" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelectedSearchCircle(null)} className="flex-1 bg-surfaceHover hover:bg-border text-textPrimary py-2 rounded-lg font-bold transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-accent hover:bg-accentHover text-white py-2 rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">Enter</button>
          </div>
        </form>
      </BottomSheet>

      {/* SEND MEETUP REQUEST SHEET */}
      <BottomSheet
        isOpen={!!meetupModalUser}
        onClose={() => setMeetupModalUser(null)}
        title={meetupModalUser ? `🤝 Meet ${meetupModalUser.name}` : ''}
      >
        <p className="text-sm text-textSecondary mb-6">Send a quick ping to coordinate a meetup.</p>
        <form onSubmit={handleSendMeetup} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-textSecondary block mb-1">Where?</label>
            <input type="text" required placeholder="e.g., Foody, SJT Lobby..." value={meetupData.location} onChange={e => setMeetupData({...meetupData, location: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-textPrimary outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-textSecondary block mb-1">When?</label>
            <input type="datetime-local" required value={meetupData.meet_time} onChange={e => setMeetupData({...meetupData, meet_time: e.target.value})} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-textPrimary outline-none focus:border-accent font-mono text-sm" />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setMeetupModalUser(null)} className="flex-1 bg-surfaceHover hover:bg-border text-textPrimary py-2 rounded-lg font-bold transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-accent hover:bg-accentHover text-white py-2 rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">Send Ping</button>
          </div>
        </form>
      </BottomSheet>

      {/* AUDIT LOG MODAL */}
      {historyLog && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setHistoryLog(null)}>
          <div className="bg-surface border border-border rounded-xl p-6 shadow-2xl max-w-md w-full max-h-[80dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-textPrimary">📜 Audit Log (30 Days)</h3>
              <button onClick={() => setHistoryLog(null)} className="text-textSecondary hover:text-textPrimary">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
              {historyLog.length === 0 ? <p className="text-textSecondary text-center italic mt-10">No recent activity.</p> : historyLog.map((log, i) => (
                <div key={i} className="flex justify-between items-center bg-background p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{log.action === 'joined' ? '👋' : '🚪'}</span>
                    <div>
                      <p className="text-sm font-bold text-textPrimary">{log.user_name}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${log.action === 'joined' ? 'text-success' : 'text-danger'}`}>{log.action}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-textSecondary font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🔥 NEW PIN MODAL FOR CIRCLES */}
      <PinConfirmModal 
        isOpen={pendingCircleAction !== null}
        onClose={() => setPendingCircleAction(null)}
        onConfirm={executeLeaveOrDelete}
        actionText={pendingCircleAction === 'delete' ? 'Destroy Circle' : 'Leave Circle'}
      />

    </div>
  );
}

export default SocialRadar;