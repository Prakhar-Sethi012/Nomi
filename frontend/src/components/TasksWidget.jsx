import React, { useState, useEffect } from 'react';

function TasksWidget() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Upgraded UI State to hold the timer, interval, AND remaining seconds
  const [completingTasks, setCompletingTasks] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', due_date: '', tags: '' });

  const todayStr = new Date().toDateString();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/tasks/todo');
      if (response.ok) setTasks(await response.json());
    } catch (err) {
      setError('Connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '');
      let isoDate;
      try { isoDate = new Date(formData.due_date).toISOString(); } 
      catch (e) { return setError('Invalid date selection.'); }

      const payload = { title: formData.title, task_type: 'Work', due_date: isoDate, tags: tagsArray, is_todo: true };

      const response = await fetch('http://127.0.0.1:8000/tasks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchTasks(); setShowForm(false); setFormData({ title: '', due_date: '', tags: '' });
      } else {
        const errorData = await response.json();
        setError(`API Error: ${JSON.stringify(errorData.detail)}`);
      }
    } catch (err) { setError('Network failed.'); }
  };

  // --- The Live Countdown Deletion Engine ---
  const toggleComplete = (id) => {
    // 1. UNDO ACTION: If it's already ticking, cancel everything
    if (completingTasks[id]) {
      clearInterval(completingTasks[id].interval);
      clearTimeout(completingTasks[id].timer);
      setCompletingTasks(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      return;
    }

    // 2. COMPLETE ACTION: Set up the ticking interval
    const intervalId = setInterval(() => {
      setCompletingTasks(prev => {
        // If the user cancelled it while the interval was running, ignore it
        if (!prev[id]) return prev; 
        return {
          ...prev,
          [id]: { ...prev[id], remaining: prev[id].remaining - 1 }
        };
      });
    }, 1000);

    // 3. EXECUTE DELETION: The 5-second final trigger
    const timerId = setTimeout(async () => {
      clearInterval(intervalId); // Stop the countdown text
      try {
        const response = await fetch(`http://127.0.0.1:8000/tasks/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
          fetchTasks(); 
          
          // Clean up the timer state so it doesn't leave ghost data
          setCompletingTasks(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
          });
          
          // 🔥 GAMIFICATION ENGINE 🔥
          const lastActiveStr = localStorage.getItem('cc_last_active');
          let currentStreak = parseInt(localStorage.getItem('cc_streak') || 0);

          if (lastActiveStr !== todayStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastActiveStr === yesterday.toDateString()) {
               currentStreak += 1; 
            } else {
               currentStreak = 1; 
            }

            localStorage.setItem('cc_streak', currentStreak);
            localStorage.setItem('cc_last_active', todayStr);
            window.dispatchEvent(new Event('streak-updated'));
          }
        } else {
          // If the backend fails, abort the UI change
          setCompletingTasks(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
          });
          setError("Failed to delete task from database.");
        }
      } catch (err) { 
        console.error("Failed to delete"); 
      }
    }, 5000);

    // 4. Initialize the state with 5 seconds on the clock
    setCompletingTasks(prev => ({
      ...prev,
      [id]: { timer: timerId, interval: intervalId, remaining: 5 }
    }));
  };

  // Only show tasks due today or in the future
  const activeTasks = tasks.filter(task => {
    const taskDate = new Date(task.due_date);
    return taskDate.setHours(0,0,0,0) >= new Date().setHours(0,0,0,0);
  });

  if (isLoading) return <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex items-center justify-center text-blue-400 animate-pulse">Syncing tasks...</div>;

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex flex-col shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4 flex justify-between items-center">
        Action Items
        {!showForm && <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">{activeTasks.length}</span>}
      </h2>
      
      {error && <div className="bg-red-900/40 border border-red-500/50 text-red-200 text-xs p-2 rounded mb-2 overflow-x-auto max-h-16 font-mono">{error}</div>}

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
          <input type="text" placeholder="Task Title" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          <input type="datetime-local" required value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          <input type="text" placeholder="Tags (comma separated)" required value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          <div className="flex gap-2 mt-auto pt-2">
            <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm py-2 rounded transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded font-bold transition-colors">Add Task</button>
          </div>
        </form>
      ) : (
        <>
          <button onClick={() => setShowForm(true)} className="w-full mb-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-sm py-1.5 rounded transition-colors flex items-center justify-center gap-2">+ New Task</button>
          {activeTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No pending tasks. You're all caught up!</div>
          ) : (
            <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {activeTasks.map((task) => (
                <li key={task.id} className={`bg-slate-700 p-3 rounded-lg border transition-all duration-500 ${completingTasks[task.id] ? 'opacity-40 border-green-500 scale-[0.98]' : 'border-slate-600 hover:border-blue-500'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleComplete(task.id)} className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${completingTasks[task.id] ? 'bg-green-500 border-green-500' : 'border-slate-400 hover:border-green-400'}`}>
                        {completingTasks[task.id] && <span className="text-white text-xs">✓</span>}
                      </button>
                      <div>
                        <p className={`font-medium text-sm leading-tight transition-all ${completingTasks[task.id] ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{task.title}</p>
                        {/* 🔥 THE LIVE UPDATING COUNTDOWN TEXT 🔥 */}
                        {completingTasks[task.id] && (
                          <p className="text-[10px] text-green-400 font-bold mt-1">
                            Deleting in {completingTasks[task.id].remaining}s... Click circle to undo.
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 whitespace-nowrap ml-2">
                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 ml-8">
                    {task.tags.map(tag => (
                      <span key={tag} className={`text-[10px] uppercase tracking-wider font-bold bg-slate-800 border border-slate-600 px-2 py-0.5 rounded ${completingTasks[task.id] ? 'text-slate-500' : 'text-blue-400'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default TasksWidget;