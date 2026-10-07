import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Pressable from './ui/Pressable';
import NotificationStack from './ui/NotificationStack';
import SwipeRow from './ui/SwipeRow';
import Skeleton from './ui/Skeleton';

// The 3-second undo window's own countdown, read straight off the
// `remaining` state the completion timer already keeps — no separate clock.
function UndoRing({ remaining, total = 3 }) {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 -rotate-90 shrink-0">
      <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" className="stroke-current text-success/25" />
      <motion.circle
        cx="10" cy="10" r="8" fill="none" strokeWidth="2" strokeLinecap="round"
        className="stroke-current text-success"
        animate={{ pathLength: remaining / total }}
        transition={{ duration: 1, ease: 'linear' }}
      />
    </svg>
  );
}

function TasksWidget({ setProfile }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [completingTasks, setCompletingTasks] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const getTodayDefaultInput = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({ title: '', due_date: getTodayDefaultInput(), tags: '', frequency: 'Once' });

  // Mirrors completingTasks so the unmount-cleanup effect below can always see
  // the latest timers without re-running on every tick.
  const completingTasksRef = useRef(completingTasks);
  useEffect(() => { completingTasksRef.current = completingTasks; }, [completingTasks]);

  // Abandoned completion timers must not keep running (and firing deletes) after unmount.
  useEffect(() => {
    return () => {
      Object.values(completingTasksRef.current).forEach(({ timer, interval }) => {
        clearTimeout(timer);
        clearInterval(interval);
      });
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await api.getTodoList(); 
      setTasks(data); 
    } catch (err) {
      setError('Connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const formatForInput = (isoString) => {
    const d = new Date(isoString);
    const offset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
  };

  const openEditMode = (task) => {
    setEditingTaskId(task.id);
    setFormData({
      title: task.title,
      due_date: formatForInput(task.due_date),
      tags: task.tags.join(', '),
      frequency: task.frequency || 'Once'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '');
      let isoDate;
      try { isoDate = new Date(formData.due_date).toISOString(); } 
      catch (e) { return setError('Invalid date selection.'); }

      if (editingTaskId) {
        const payload = { title: formData.title, due_date: isoDate, tags: tagsArray, frequency: formData.frequency };
        await api.updateTask(editingTaskId, payload);
      } else {
        const payload = { title: formData.title, task_type: 'Work', due_date: isoDate, tags: tagsArray, is_todo: true, frequency: formData.frequency };
        await api.addTask(payload);
      }
      
      fetchTasks(); 
      setShowForm(false); 
      setEditingTaskId(null);
      setFormData({ title: '', due_date: getTodayDefaultInput(), tags: '', frequency: 'Once' });
      
    } catch (err) { 
      setError(err.message || 'Network failed.'); 
    }
  };

  const toggleComplete = (id) => {
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

    const intervalId = setInterval(() => {
      setCompletingTasks(prev => {
        if (!prev[id]) return prev; 
        return { ...prev, [id]: { ...prev[id], remaining: prev[id].remaining - 1 } };
      });
    }, 1000);

    const timerId = setTimeout(async () => {
      clearInterval(intervalId);
      try {
        // The backend now decides on its own whether this completion counts as a
        // "perfect day" and bumps current_streak/last_active_date accordingly —
        // no client-computed streak logic here anymore.
        await api.deleteTask(id);

        fetchTasks();
        if (setProfile) {
          api.getProfile().then(setProfile).catch(() => {});
        }
        setCompletingTasks(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });

      } catch (err) {
        setCompletingTasks(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
        setError("Failed to process task completion.");
      }
    }, 3000);

    setCompletingTasks(prev => ({
      ...prev,
      [id]: { timer: timerId, interval: intervalId, remaining: 3 }
    }));
  };

  // Swipe-left delete is a direct discard, distinct from the checkbox's
  // complete-then-undo flow — no grace period, since abandoning a task
  // isn't the same action as finishing it.
  const handleSwipeDelete = async (id) => {
    try {
      await api.deleteTask(id);
      fetchTasks();
    } catch {
      setError('Failed to delete task.');
    }
  };

  const renderTaskRow = (task, isExpanded) => {
    const isOverdue = new Date(task.due_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
    const isRecurring = task.frequency && task.frequency !== 'Once';
    const completing = completingTasks[task.id];
    const important = isImportant(task);

    // Importance takes the border-color slot (ahead of overdue) since a
    // glowing box-shadow was the actual cause of two separate problems: it's
    // not clipped to the card the way a background is, so its blur bled
    // upward into the "N Tasks" badge sitting just above the pile, and
    // stacked with the border, the tag chip, and the star it made the whole
    // card feel loud. A single theme-derived border color reads as clearly
    // as the same amber ring did, without spilling outside its own box or
    // hardcoding a color that ignores the active theme.
    const borderClass = completing
      ? 'border-success'
      : important
        ? 'border-accent'
        : isOverdue
          ? 'border-danger/60'
          : 'border-border hover:border-accent';

    return (
      // bg-surface here is a deliberate, explicit opaque backstop — without
      // it this outer frame has no fill of its own (only the inner div two
      // levels down, inside SwipeRow, actually paints a background), so
      // stacked in the collapsed pile, a card with no background of its own
      // reads as a transparency glitch rather than a solid card edge.
      // overflow-hidden + the collapsed max-height clamp below keep every
      // card in the pile the same height regardless of how many tags it
      // has — without it, a card with 2-3 tags is taller than the top card
      // and its bottom edge pokes out from underneath the stack.
      <div className={`group relative overflow-hidden rounded-lg border bg-surface transition-colors duration-300 ${borderClass} ${!isExpanded ? 'max-h-[88px]' : 'h-auto'}`}>
        <SwipeRow
          disabled={!!completing}
          onDelete={() => handleSwipeDelete(task.id)}
          onComplete={() => toggleComplete(task.id)}
        >
          <div className={`relative p-3 transition-all duration-300 ${
            completing ? 'opacity-50 scale-[0.98] bg-surfaceHover' : isOverdue ? 'bg-dangerBg' : 'bg-surfaceHover'
          }`}>

            {!completing && (
              <Pressable
                onClick={() => openEditMode(task)}
                className="absolute top-3 right-3 text-textSecondary hover:text-accent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                title="Edit Task"
              >
                ✎
              </Pressable>
            )}

            <div className="flex justify-between items-start mb-2 pr-6">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Pressable onClick={() => toggleComplete(task.id)} haptic={completing ? undefined : 'tap'} className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${completing ? 'bg-success border-success' : 'border-border hover:border-success'}`}>
                  {completing && <span className="text-white text-xs">✓</span>}
                </Pressable>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium text-sm leading-tight transition-all flex items-center gap-1 ${completing ? 'text-textSecondary line-through' : isOverdue ? 'text-danger' : 'text-textPrimary'}`}>
                    {important && !completing && <span className="shrink-0" title="Important">⭐</span>}
                    {isRecurring && <span className="text-accent shrink-0" title={`Repeats ${task.frequency}`}>↻</span>}
                    <span className="truncate">{task.title}</span>
                    {isOverdue && !completing && <span className="shrink-0 text-[9px] bg-dangerBg text-danger px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Overdue</span>}
                  </p>
                  {completing && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <UndoRing remaining={completing.remaining} />
                      <p className="text-[10px] text-success font-bold">{isRecurring ? 'Rescheduling...' : 'Undo?'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end ml-8">
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <span key={tag} className={`text-[10px] uppercase tracking-wider font-bold bg-surface border border-border px-2 py-0.5 rounded ${completing ? 'text-textSecondary' : 'text-accent'}`}>
                    {tag}
                  </span>
                ))}
              </div>
              <p className={`text-xs whitespace-nowrap ml-2 ${isOverdue ? 'text-danger font-bold' : 'text-textSecondary'}`}>
                {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </SwipeRow>
      </div>
    );
  };

  // Matches "imp" and "important" both — the quick-select chip in the form
  // below adds the literal tag "important", so a strict `=== 'imp'` check
  // would never actually fire from the app's own UI.
  const isImportant = (task) => task.tags?.some((t) => t.toLowerCase().includes('imp'));

  // Strictly check if task is scheduled for today in user's local timezone
  const isToday = (isoString) => {
    if (!isoString) return false;
    const taskDate = new Date(isoString);
    const today = new Date();
    return (
      taskDate.getFullYear() === today.getFullYear() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getDate() === today.getDate()
    );
  };

  // Filter tasks strictly scheduled for today
  const todayTasks = tasks
    .filter(task => isToday(task.due_date))
    .sort((a, b) => {
      const aImportant = isImportant(a);
      const bImportant = isImportant(b);
      if (aImportant !== bImportant) return aImportant ? -1 : 1;
      return new Date(a.due_date) - new Date(b.due_date);
    });

  if (isLoading) {
    return (
      <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col h-auto md:h-[400px] gap-3">
        <div className="flex justify-between items-center mb-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-surfaceHover p-3 rounded-lg border border-border flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full shrink-0" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-3 w-1/3 ml-8" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col h-auto md:h-[400px]">
      <h2 className="text-xl font-bold text-textPrimary mb-4 flex justify-between items-center">
        <Link
          to="/calendar"
          className="group flex items-center gap-2 hover:text-accent transition-colors"
          title="Open full Calendar"
        >
          <span>Action Items</span>
          <span className="text-xs text-textSecondary group-hover:text-accent transition-colors font-mono opacity-60 group-hover:opacity-100">
            ↗
          </span>
        </Link>
        {!showForm && !editingTaskId && (
          <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
            {todayTasks.length}
          </span>
        )}
      </h2>

      {error && <div className="bg-dangerBg border border-danger text-danger text-xs p-2 rounded mb-2 overflow-x-auto max-h-16 font-mono">{error}</div>}

      {showForm || editingTaskId ? (
        <form onSubmit={handleSubmit} className="flex-1 md:min-h-0 flex flex-col gap-3 overflow-visible md:overflow-y-auto custom-scrollbar pr-2">
          <input type="text" placeholder="Task Title" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />

          <div className="flex gap-2">
            <input type="datetime-local" required value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="flex-1 p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />

            <select
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
              className="w-1/3 p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none"
            >
              <option value="Once">Once</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Tags (e.g. urgent, project)"
              required
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none"
            />
            {/* Quick-Select Chips */}
            <div className="flex flex-wrap gap-1">
              {['important', 'cat', 'fat', 'quiz', 'club', 'others'].map(preset => (
                <Pressable
                  key={preset}
                  type="button"
                  haptic="selection"
                  onClick={() => {
                    const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t !== '') : [];
                    if (!currentTags.includes(preset)) {
                      setFormData(prev => ({ ...prev, tags: currentTags.length > 0 ? `${currentTags.join(', ')}, ${preset}` : preset }));
                    }
                  }}
                  className="text-[9px] uppercase tracking-wider font-bold bg-surface hover:bg-accent/30 text-textSecondary hover:text-accent border border-border hover:border-accent px-2 py-1 rounded transition-colors"
                >
                  +{preset}
                </Pressable>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-auto pt-2">
            <Pressable type="button" onClick={() => { setShowForm(false); setEditingTaskId(null); setError(''); setFormData({ title: '', due_date: getTodayDefaultInput(), tags: '', frequency: 'Once' }); }} className="flex-1 bg-surfaceHover hover:bg-border text-textPrimary text-sm py-2 rounded transition-colors">Cancel</Pressable>
            <Pressable type="submit" haptic="tap" className="flex-1 bg-accent hover:bg-accentHover text-white text-sm py-2 rounded font-bold transition-colors">{editingTaskId ? 'Save Edits' : 'Add Task'}</Pressable>
          </div>
        </form>
      ) : (
        <>
          <Pressable onClick={() => setShowForm(true)} haptic="tap" className="w-full mb-3 bg-surfaceHover hover:bg-border border border-border text-textPrimary text-sm py-1.5 rounded transition-colors flex items-center justify-center gap-2">+ New Task</Pressable>
          {todayTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 select-none">
              <div className="w-12 h-12 rounded-full bg-surfaceHover/80 border border-border/80 flex items-center justify-center text-textSecondary/40 text-xl font-bold shadow-inner mb-1">
                ✓
              </div>
              <p className="text-sm font-medium text-textSecondary">You're clear for today</p>
              <Link
                to="/calendar"
                className="mt-1 text-xs text-accent hover:text-accentHover font-semibold transition-colors flex items-center gap-1 group"
              >
                <span>View all in Calendar</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-visible md:overflow-y-auto pr-2 custom-scrollbar flex-1 md:min-h-0">
              <NotificationStack
                items={todayTasks}
                keyExtractor={(task) => task.id}
                renderItem={renderTaskRow}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TasksWidget;