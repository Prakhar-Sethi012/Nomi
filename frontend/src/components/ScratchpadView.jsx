import React, { useState, useRef, useEffect } from 'react';

function ScratchpadView() {
  // ==========================================
  // 📝 TEXT NOTES (DATABASE SYNC)
  // ==========================================
  const [notes, setNotes] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); 

  // NEW: State to track if the user clicked clear
  const [showTextConfirm, setShowTextConfirm] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/scratchpad');
        if (response.ok) {
          const data = await response.json();
          setNotes(data.content || '');
        }
      } catch (err) {
        console.error("Failed to load notes from DB");
      } finally {
        setIsLoaded(true); 
      }
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    if (!isLoaded) return; 

    setIsSyncing(true);
    
    const timerId = setTimeout(async () => {
      try {
        await fetch('http://127.0.0.1:8000/scratchpad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: notes })
        });
      } catch (err) {
        console.error("Failed to sync to DB");
      } finally {
        setIsSyncing(false);
      }
    }, 1000);

    return () => clearTimeout(timerId);
  }, [notes, isLoaded]);

  // ==========================================
  // 🎨 ARCHITECTURE DOODLE (LOCAL MEMORY)
  // ==========================================
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // NEW: State to track if the user clicked erase
  const [showDoodleConfirm, setShowDoodleConfirm] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
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
    
    const canvas = canvasRef.current;
    localStorage.setItem('cc_doodle', canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#1e293b';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    localStorage.removeItem('cc_doodle');
    setShowDoodleConfirm(false); // Reset the button state
  };

  return (
    <div className="w-full max-w-6xl pb-10 mx-auto animate-fade-in flex flex-col h-[85vh]">
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-1">The Scratchpad</h1>
        <p className="text-slate-400 text-sm">Notes sync to database. Architecture doodles save locally.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Side: Text/Markdown Area */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center h-12">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
              Text / Code Snippets
              {isSyncing ? (
                <span className="text-[9px] text-blue-400 normal-case animate-pulse">Syncing to DB...</span>
              ) : (
                <span className="text-[9px] text-green-500 normal-case">✓ Saved</span>
              )}
            </span>
            
            {/* THE TEXT CONFIRMATION UI */}
            {showTextConfirm ? (
              <div className="flex gap-2 items-center animate-fade-in">
                <span className="text-[10px] text-red-400 font-bold mr-1">Are you sure?</span>
                <button onClick={() => setShowTextConfirm(false)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors">Cancel</button>
                <button onClick={() => { setNotes(''); setShowTextConfirm(false); }} className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded transition-colors shadow-[0_0_8px_rgba(220,38,38,0.4)]">Wipe</button>
              </div>
            ) : (
              <button onClick={() => setShowTextConfirm(true)} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Drop your thoughts, API endpoints, or raw code here..."
            className="flex-1 w-full p-4 bg-slate-800 text-slate-300 text-sm focus:outline-none resize-none custom-scrollbar font-mono leading-relaxed"
          />
        </div>

        {/* Right Side: The Doodle Canvas */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center h-12">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Architecture Doodle</span>
            
            {/* THE DOODLE CONFIRMATION UI */}
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