import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

function ScratchpadView() {
  // ==========================================
  // 📝 MI NOTES (DATABASE SYNC)
  // ==========================================
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNote, setActiveNote] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
    } catch (err) { console.error("Failed to load notes", err); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchNotes(); }, []);

  // Debounced Auto-Save
  useEffect(() => {
    if (!activeNote || !activeNote.id) return;
    setSaveStatus('Saving...');
    const timerId = setTimeout(async () => {
      try {
        await api.updateNote(activeNote.id, { title: activeNote.title, content: activeNote.content });
        setSaveStatus('✓ Saved');
        setNotes(prev => prev.map(n => n.id === activeNote.id ? activeNote : n));
      } catch (err) { setSaveStatus('Error saving'); }
    }, 1000);
    return () => clearTimeout(timerId);
  }, [activeNote]);

  const handleCreateNew = async () => {
    try {
      const newNote = await api.addNote({ title: 'New Note', content: '' });
      setNotes([newNote, ...notes]);
      setActiveNote(newNote);
    } catch (err) { console.error("Failed to create note"); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
      if (activeNote?.id === id) setActiveNote(null);
    } catch (err) { console.error("Failed to delete note"); }
  };

  // ==========================================
  // 🎨 ARCHITECTURE DOODLE (LOCAL MEMORY)
  // ==========================================
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showDoodleConfirm, setShowDoodleConfirm] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Guard clause in case it hasn't rendered
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.strokeStyle = '#60a5fa'; 
    context.lineWidth = 3;

    const savedDoodle = localStorage.getItem('cc_doodle');
    if (savedDoodle) {
      const img = new Image();
      img.src = savedDoodle;
      img.onload = () => context.drawImage(img, 0, 0);
    } else {
      context.fillStyle = '#1e293b'; 
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current.getContext('2d');
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const context = canvasRef.current.getContext('2d');
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return; 
    const context = canvasRef.current.getContext('2d');
    context.closePath();
    setIsDrawing(false);
    localStorage.setItem('cc_doodle', canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#1e293b';
    context.fillRect(0, 0, canvas.width, canvas.height);
    localStorage.removeItem('cc_doodle');
    setShowDoodleConfirm(false);
  };

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col h-[85vh]">
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">The Scratchpad</h1>
          <p className="text-slate-400 text-sm">Notes sync to database. Doodles save locally.</p>
        </div>
        <button onClick={handleCreateNew} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg transition-colors">+ New Note</button>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT SIDE: MI Notes / Editor */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
          {!activeNote ? (
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4 block">My Notes</span>
              {isLoading ? (
                <div className="text-emerald-400 font-mono animate-pulse text-xs">Loading Notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center text-slate-500 mt-10 text-sm">No notes yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map(note => (
                    <div key={note.id} onClick={() => setActiveNote(note)} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 hover:border-emerald-500 cursor-pointer transition-all flex flex-col h-40 group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-sm truncate pr-2">{note.title || 'Untitled'}</h3>
                        <button onClick={(e) => handleDelete(note.id, e)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                      </div>
                      <p className="text-slate-400 text-xs whitespace-pre-wrap flex-1 overflow-hidden">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-fade-in">
              <div className="p-3 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center shrink-0">
                <input 
                  type="text" 
                  placeholder="Note Title..." 
                  value={activeNote.title || ''}
                  onChange={e => setActiveNote({...activeNote, title: e.target.value})}
                  className="bg-transparent text-white font-bold text-lg outline-none w-1/2 placeholder-slate-600"
                />
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${saveStatus === 'Saving...' ? 'text-blue-400 animate-pulse' : saveStatus === '✓ Saved' ? 'text-emerald-500' : 'text-slate-500'}`}>{saveStatus}</span>
                  <button onClick={() => setActiveNote(null)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors uppercase font-bold tracking-wider">Back</button>
                </div>
              </div>
              <textarea
                value={activeNote.content}
                onChange={e => setActiveNote({...activeNote, content: e.target.value})}
                placeholder="Start typing..."
                className="flex-1 w-full p-6 bg-slate-800 text-slate-300 text-sm focus:outline-none resize-none custom-scrollbar font-mono leading-relaxed"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* RIGHT SIDE: Doodle Canvas */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center h-12">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Architecture Doodle</span>
            {showDoodleConfirm ? (
              <div className="flex gap-2 items-center animate-fade-in">
                <span className="text-[10px] text-red-400 font-bold mr-1">Are you sure?</span>
                <button onClick={() => setShowDoodleConfirm(false)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors">Cancel</button>
                <button onClick={clearCanvas} className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded transition-colors shadow-[0_0_8px_rgba(220,38,38,0.4)]">Wipe</button>
              </div>
            ) : (
              <button onClick={() => setShowDoodleConfirm(true)} className="text-[10px] text-red-400 hover:text-red-300">Erase Board</button>
            )}
          </div>
          <div className="flex-1 relative cursor-crosshair overflow-hidden bg-slate-900">
            <canvas
              ref={canvasRef}
              width={800} 
              height={800}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="absolute top-0 left-0"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default ScratchpadView;