import React, { useState, useEffect } from 'react';

function TasksWidget() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch data as soon as the widget loads on screen
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
        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">{tasks.length}</span>
      </h2>
      
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
                  {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
              
              {/* Render the strict tags beautifully */}
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
    </div>
  );
}

export default TasksWidget;