import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../services/api';
import PinConfirmModal from './PinConfirmModal'; // 🔥 IMPORT MODAL
import Skeleton from './ui/Skeleton';
import DoodleCanvas from './ui/DoodleCanvas';
import DoodleToolbar from './ui/DoodleToolbar';
import ScratchModeChoice from './ScratchModeChoice';
import { useAppMotion } from '../hooks/useAppMotion';
import { fadeUp, scaleIn, staggerParent } from '../motion/variants';

function ScratchpadView({ userId }) {
  const m = useAppMotion();
  // Namespaced per-user so switching accounts on a shared browser doesn't
  // show the previous user's doodle.
  const doodleKey = `cc_doodle_${userId}`;

  // 🚪 FRONT DOOR — the workspace only reveals itself once the user has
  // picked a mode; resets to the choice screen every time the view mounts
  // (i.e. every time the user opens the Scratchpad tab), which is exactly
  // what "when the user opens the Scratchpad" asks for.
  const [mode, setMode] = useState(null); // null | 'notes' | 'doodle'

  // ==========================================
  // 📝 MI NOTES (DATABASE SYNC)
  // ==========================================
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNote, setActiveNote] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  // Tracks whether activeNote changed because of an actual edit, vs. just
  // being opened/created/switched — so opening a note doesn't trigger a save.
  const isDirtyRef = useRef(false);

  // 🔥 NEW STATE FOR MODAL
  const [deleteNoteId, setDeleteNoteId] = useState(null);

  // 🖥️ FULLSCREEN "FOCUS MODE" — pops the whole workspace into a portaled,
  // viewport-covering overlay so it's not fighting the rest of the dashboard
  // chrome for space.
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
    } catch (err) { console.error("Failed to load notes", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchNotes(); }, []);

  // Debounced Auto-Save — only runs when the user actually edited something
  useEffect(() => {
    if (!activeNote || !activeNote.id || !isDirtyRef.current) return;
    setSaveStatus('Saving...');
    const timerId = setTimeout(async () => {
      try {
        await api.updateNote(activeNote.id, { title: activeNote.title, content: activeNote.content });
        isDirtyRef.current = false;
        setSaveStatus('✓ Saved');
        setNotes(prev => prev.map(n => n.id === activeNote.id ? activeNote : n));
      } catch (err) { setSaveStatus('Error saving'); }
    }, 1000);
    return () => clearTimeout(timerId);
  }, [activeNote]);

  const openNote = (note) => {
    isDirtyRef.current = false;
    setSaveStatus('');
    setActiveNote(note);
  };

  const editActiveNote = (fields) => {
    isDirtyRef.current = true;
    setActiveNote(prev => ({ ...prev, ...fields }));
  };

  const handleCreateNew = async () => {
    try {
      const newNote = await api.addNote({ title: 'New Note', content: '' });
      setNotes([newNote, ...notes]);
      openNote(newNote);
    } catch (err) { console.error("Failed to create note"); }
  };

  const executeDeleteNote = async (id) => {
    try {
      await api.deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
      if (activeNote?.id === id) setActiveNote(null);
    } catch (err) { console.error("Failed to delete note"); }
  };

  // ==========================================
  // 🎨 ARCHITECTURE DOODLE (INFINITE CANVAS)
  // ==========================================
  const doodleCanvasRef = useRef(null);
  const [showDoodleConfirm, setShowDoodleConfirm] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [brushColor, setBrushColor] = useState('#60a5fa');
  const [brushSize, setBrushSize] = useState(3);
  const [brushTexture, setBrushTexture] = useState('pen');

  // 🔥 NEW STATE FOR DOODLE MODAL
  const [wipeDoodleAuth, setWipeDoodleAuth] = useState(false);

  const executeClearCanvas = () => {
    doodleCanvasRef.current?.clear();
    setShowDoodleConfirm(false);
  };

  const outerHeader = (
    <header className="bg-surface p-6 rounded-xl border border-border shadow-lg flex justify-between items-center shrink-0">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary mb-1">
          The Scratchpad
          {mode && <span className="text-textSecondary font-normal text-lg"> · {mode === 'notes' ? 'Notes' : 'Doodle'}</span>}
        </h1>
        <p className="text-textSecondary text-sm">Notes sync to database. Doodles save locally.</p>
      </div>
      <div className="flex items-center gap-2">
        {mode && (
          <button
            onClick={() => setMode(null)}
            className="bg-surfaceHover hover:bg-border text-textPrimary font-bold px-3 py-2 rounded-lg transition-colors text-sm"
          >
            ↺ Switch
          </button>
        )}
        {mode && (
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="bg-surfaceHover hover:bg-border text-textPrimary font-bold px-3 py-2 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Focus Mode (Esc)' : 'Enter Focus Mode'}
          >
            {isFullscreen ? '⤡ Exit Focus' : '⛶ Focus Mode'}
          </button>
        )}
      </div>
    </header>
  );

  const notesPanel = (
    <motion.div
      key="notes"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      transition={m.base}
      className="flex-1 bg-surface rounded-xl border border-border shadow-lg flex flex-col overflow-hidden relative"
    >
      <div className="p-3 border-b border-border bg-background flex justify-between items-center h-12 shrink-0">
        <span className="text-xs text-textSecondary font-bold uppercase tracking-wider">My Notes</span>
        <button onClick={handleCreateNew} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">+ New Note</button>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {!activeNote ? (
          <motion.div key="list" className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((i) => (
                  <div key={i} className="bg-background p-4 rounded-xl border border-border flex flex-col h-40 gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center text-textSecondary mt-10 text-sm">No notes yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {notes.map(note => (
                    <motion.div
                      key={note.id}
                      layoutId={`note-${note.id}`}
                      layout
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={m.gentle}
                      onClick={() => openNote(note)}
                      className="bg-background p-4 rounded-xl border border-border hover:border-emerald-500 cursor-pointer transition-colors flex flex-col h-40 group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-textPrimary text-sm truncate pr-2">{note.title || 'Untitled'}</h3>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteNoteId(note.id); }}
                          className="text-textSecondary hover:text-danger opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-textSecondary text-xs whitespace-pre-wrap flex-1 overflow-hidden">{note.content}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="editor" layoutId={`note-${activeNote.id}`} className="flex-1 flex flex-col">
            <div className="p-3 border-b border-border bg-background flex justify-between items-center shrink-0">
              <input
                type="text"
                placeholder="Note Title..."
                value={activeNote.title || ''}
                onChange={e => editActiveNote({ title: e.target.value })}
                className="bg-transparent text-textPrimary font-bold text-lg outline-none w-1/2 placeholder:text-textSecondary"
              />
              <div className="flex items-center gap-4">
                <div className="w-20 flex justify-end">
                  <AnimatePresence mode="wait" initial={false}>
                    {saveStatus === 'Saving...' && (
                      <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] uppercase font-bold tracking-wider text-accent">
                        Saving...
                      </motion.span>
                    )}
                    {saveStatus === '✓ Saved' && (
                      <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-500">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0" fill="none">
                          <motion.path
                            d="M4 12l6 6L20 6"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                          />
                        </svg>
                        Saved
                      </motion.span>
                    )}
                    {saveStatus === 'Error saving' && (
                      <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] uppercase font-bold tracking-wider text-danger">
                        Error saving
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={() => setActiveNote(null)} className="text-[10px] bg-surfaceHover hover:bg-border text-textPrimary px-3 py-1.5 rounded transition-colors uppercase font-bold tracking-wider">Back</button>
              </div>
            </div>
            <textarea
              value={activeNote.content}
              onChange={e => editActiveNote({ content: e.target.value })}
              placeholder="Start typing..."
              className="flex-1 w-full p-6 bg-surface text-textSecondary text-sm focus:outline-none resize-none custom-scrollbar font-mono leading-relaxed"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const doodlePanel = (
    <motion.div
      key="doodle"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      transition={m.base}
      className="flex-1 bg-surface rounded-xl border border-border shadow-lg flex flex-col overflow-hidden"
    >
      <div className="p-3 border-b border-border bg-background flex justify-between items-center h-12 shrink-0">
        <span className="text-xs text-textSecondary font-bold uppercase tracking-wider">Infinite Canvas</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPanMode(p => !p)}
            className={`text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase tracking-wider ${isPanMode ? 'bg-accent text-white' : 'bg-surfaceHover hover:bg-border text-textPrimary'}`}
            title="Toggle pan mode"
          >
            ✋ Pan
          </button>
          {showDoodleConfirm ? (
            <div className="flex gap-2 items-center animate-fade-in">
              <span className="text-[10px] text-danger font-bold mr-1">Are you sure?</span>
              <button onClick={() => setShowDoodleConfirm(false)} className="text-[10px] bg-surfaceHover hover:bg-border text-textPrimary px-2 py-1 rounded transition-colors">Cancel</button>
              <button onClick={() => setWipeDoodleAuth(true)} className="text-[10px] bg-danger hover:opacity-90 text-white font-bold px-2 py-1 rounded transition-colors shadow-[0_0_8px_rgba(220,38,38,0.4)]">Wipe</button>
            </div>
          ) : (
            <button onClick={() => setShowDoodleConfirm(true)} className="text-[10px] text-danger hover:opacity-80">Erase Board</button>
          )}
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden bg-background">
        <DoodleCanvas ref={doodleCanvasRef} doodleKey={doodleKey} isPanMode={isPanMode} color={brushColor} size={brushSize} texture={brushTexture} />
        <DoodleToolbar
          color={brushColor} onColorChange={setBrushColor}
          size={brushSize} onSizeChange={setBrushSize}
          texture={brushTexture} onTextureChange={setBrushTexture}
        />
      </div>
    </motion.div>
  );

  const body = (
    <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
      <AnimatePresence mode="wait" initial={false}>
        {!mode ? (
          <ScratchModeChoice key="choice" onChoose={setMode} />
        ) : mode === 'notes' ? notesPanel : doodlePanel}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {!isFullscreen && (
        <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col h-auto md:h-[85dvh]">
          {outerHeader}
          {body}
        </div>
      )}

      {/* createPortal must wrap AnimatePresence here, not the other way
          around — createPortal()'s return value carries no `key` unless one
          is passed as its third argument, and AnimatePresence needs a stable
          key on its direct child to track enter/exit. Portaling unconditionally
          and letting AnimatePresence conditionally render the (properly
          keyed) motion.div inside it is the same pattern PinConfirmModal/
          BottomSheet/MoreSheet already use. */}
      {createPortal(
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              key="scratchpad-focus"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={m.sheet}
              className="fixed inset-0 z-40 bg-background overflow-hidden"
              style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Atmospheric backdrop — theme-adaptive grid + soft glow, kept
                  out of the way of interaction (pointer-events-none). */}
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.2] pointer-events-none" />
              <div className="absolute top-[-120px] left-[-120px] w-[420px] h-[420px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
              <div className="absolute bottom-[-120px] right-[-120px] w-[420px] h-[420px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

              <motion.div
                variants={staggerParent(0.08)}
                initial="hidden"
                animate="visible"
                className="relative z-10 flex flex-col h-full p-4 md:p-6 gap-4 md:gap-6"
              >
                <motion.div variants={fadeUp} className="shrink-0">{outerHeader}</motion.div>
                <motion.div variants={fadeUp} className="flex-1 min-h-0 flex flex-col">{body}</motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 🔥 MODALS */}
      <PinConfirmModal
        isOpen={deleteNoteId !== null}
        onClose={() => setDeleteNoteId(null)}
        onConfirm={() => {
          executeDeleteNote(deleteNoteId);
          setDeleteNoteId(null);
        }}
        actionText="Delete Note Permanently"
      />

      <PinConfirmModal
        isOpen={wipeDoodleAuth}
        onClose={() => { setWipeDoodleAuth(false); setShowDoodleConfirm(false); }}
        onConfirm={() => {
          executeClearCanvas();
          setWipeDoodleAuth(false);
        }}
        actionText="Wipe Doodle Board"
      />
    </>
  );
}

export default ScratchpadView;
