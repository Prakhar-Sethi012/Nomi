import React, { useState, useEffect } from 'react';

function TasksWidget() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    tags: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/tasks/todo');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        setError('Failed to load tasks');
      }
    } catch (err) {
      setError('Connection error. Is FastAPI running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Convert comma-separated string into a clean array of tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag !== '');

      const payload = {
        title: formData.title,
        task_type: 'Work', // Hardcoded for the Action Items widget
        due_date: formData.due_date, 
        tags: tagsArray,
        is_todo: true
      };

      const response = await fetch('http://127.0.0.1:8000/tasks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchTasks(); // Instantly fetch the updated list
        setShowForm(false); // Close the form
        setFormData({ title: '', due_date: '', tags: '' }); // Reset form
      } else {
        console.error('Failed to create task');
      }
    } catch (err) {
      console.error('Error saving task');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex items-center justify-center text-blue-400 animate-pulse">
        Syncing tasks...
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex flex-col shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4 flex justify-between items-center">
        Action Items
        {!showForm && <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">{tasks.length}</span>}
      </h2>
      
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
          <input 
            type="text" 
            placeholder="Task Title (e.g., DSA Practice)" 
            required 
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
            className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" 
          />
          
          <input 
            type="datetime-local" 
            required 
            value={formData.due_date} 
            onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
            className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" 
          />

          <input 
            type="text" 
            placeholder="Tags (comma separated: club, study)" 
            required 
            value={formData.tags} 
            onChange={(e) => setFormData({...formData, tags: e.target.value})} 
            className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" 
          />
          
          <div className="flex gap-2 mt-auto pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm py-2 rounded transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded font-bold transition-colors">Add Task</button>
          </div>
        </form>
      ) : (
        <>
          <button onClick={() => setShowForm(true)} className="w-full mb-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-sm py-1.5 rounded transition-colors flex items-center justify-center gap-2">
            + New Task
          </button>

          {error ? (
            <div className="text-red-400 text-sm">{error}</div>
          ) : tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              No pending tasks. You're all caught up!
            </div>
          ) : (
            <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {tasks.map((task) => (
                <li key={task.id} className="bg-slate-700 p-3 rounded-lg border border-slate-600 hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-slate-200 text-sm leading-tight">{task.title}</p>
                    <p className="text-xs text-slate-400 whitespace-nowrap ml-2">
                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map(tag => (
                      <span key={tag} className="text-[10px] uppercase tracking-wider font-bold bg-slate-800 text-blue-400 border border-slate-600 px-2 py-0.5 rounded">
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