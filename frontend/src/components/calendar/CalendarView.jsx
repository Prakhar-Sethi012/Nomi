import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { haptics } from '../../utils/haptics';
import Pressable from '../ui/Pressable';
import Skeleton from '../ui/Skeleton';

// 3-second undo countdown ring for task completion
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

// Format Date to YYYY-MM-DD in local time
function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse ISO date or local date key to YYYY-MM-DD
function getTaskDateKey(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return toLocalDateKey(d);
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function CalendarView({ setProfile, setActiveTab }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation & Date State
  const todayKey = toLocalDateKey(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Form State inside expanded cell window
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('12:00');
  const [newTaskTags, setNewTaskTags] = useState('');
  const [newTaskFrequency, setNewTaskFrequency] = useState('Once');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Completion State for undo timers
  const [completingTasks, setCompletingTasks] = useState({});
  const completingTasksRef = useRef(completingTasks);
  useEffect(() => { completingTasksRef.current = completingTasks; }, [completingTasks]);

  // Clean up any pending undo timers on unmount
  useEffect(() => {
    return () => {
      Object.values(completingTasksRef.current).forEach(({ timer, interval }) => {
        clearTimeout(timer);
        clearInterval(interval);
      });
    };
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.getTodoList();
      setTasks(data || []);
    } catch {
      setError('Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Keyboard shortcut: close expanded date window on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedDate) {
        setSelectedDate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate]);

  // Group tasks by date key
  const tasksByDate = {};
  tasks.forEach(task => {
    const key = getTaskDateKey(task.due_date);
    if (!tasksByDate[key]) {
      tasksByDate[key] = [];
    }
    tasksByDate[key].push(task);
  });

  // Calendar Grid Calculations for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, dayNum);
    calendarDays.push({
      dateKey: toLocalDateKey(dateObj),
      dayNum,
      isCurrentMonth: false,
      dateObj,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateObj = new Date(year, month, d);
    calendarDays.push({
      dateKey: toLocalDateKey(dateObj),
      dayNum: d,
      isCurrentMonth: true,
      dateObj,
    });
  }

  // Next month padding days to complete grid rows
  const remainingSlots = (7 - (calendarDays.length % 7)) % 7;
  for (let n = 1; n <= remainingSlots; n++) {
    const dateObj = new Date(year, month + 1, n);
    calendarDays.push({
      dateKey: toLocalDateKey(dateObj),
      dayNum: n,
      isCurrentMonth: false,
      dateObj,
    });
  }

  // Month navigation handlers
  const handlePrevMonth = () => {
    haptics.light();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    haptics.light();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    haptics.medium();
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  // Task Completion Logic
  const toggleComplete = (id) => {
    if (completingTasks[id]) {
      clearInterval(completingTasks[id].interval);
      clearTimeout(completingTasks[id].timer);
      setCompletingTasks(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
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
        await api.deleteTask(id);
        fetchTasks();
        if (setProfile) {
          api.getProfile().then(setProfile).catch(() => {});
        }
        setCompletingTasks(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      } catch {
        setCompletingTasks(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        setError('Failed to complete task.');
      }
    }, 3000);

    setCompletingTasks(prev => ({
      ...prev,
      [id]: { timer: timerId, interval: intervalId, remaining: 3 }
    }));
  };

  const handleDeleteTask = async (id) => {
    try {
      await api.deleteTask(id);
      fetchTasks();
      if (setProfile) {
        api.getProfile().then(setProfile).catch(() => {});
      }
    } catch {
      setError('Failed to delete task.');
    }
  };

  // Add Task on Selected Date
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedDate) return;

    try {
      setIsAddingTask(true);
      setError('');
      
      const [hours, minutes] = (newTaskTime || '12:00').split(':');
      const [sYear, sMonth, sDay] = selectedDate.split('-');
      const taskDate = new Date(parseInt(sYear, 10), parseInt(sMonth, 10) - 1, parseInt(sDay, 10), parseInt(hours, 10), parseInt(minutes, 10));
      
      const tagsArray = newTaskTags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== '');

      const payload = {
        title: newTaskTitle.trim(),
        task_type: 'Work',
        due_date: taskDate.toISOString(),
        tags: tagsArray,
        is_todo: true,
        frequency: newTaskFrequency || 'Once'
      };

      await api.addTask(payload);
      haptics.success();
      setNewTaskTitle('');
      setNewTaskTags('');
      setNewTaskFrequency('Once');
      fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to add task.');
    } finally {
      setIsAddingTask(false);
    }
  };

  const isImportant = (task) => task.tags?.some((t) => t.toLowerCase().includes('imp'));

  // Format date for detail header
  const formatSelectedHeaderDate = (dateKey) => {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] || []) : [];
  const sortedSelectedTasks = [...selectedTasks].sort((a, b) => {
    const aImp = isImportant(a);
    const bImp = isImportant(b);
    if (aImp !== bImp) return aImp ? -1 : 1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  const totalTasksThisMonth = calendarDays
    .filter(d => d.isCurrentMonth)
    .reduce((acc, d) => acc + (tasksByDate[d.dateKey]?.length || 0), 0);

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 animate-fade-in flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-5 sm:p-6 rounded-xl border border-border mb-6 shadow-lg gap-4 transition-colors duration-300">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              to="/"
              onClick={() => setActiveTab && setActiveTab('dashboard')}
              className="text-xs font-mono text-textSecondary hover:text-accent flex items-center gap-1 transition-colors group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>Dashboard</span>
            </Link>
            <span className="text-textSecondary text-xs">•</span>
            <span className="text-accent text-xs font-bold uppercase tracking-wider">Schedule OS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-textPrimary tracking-tight flex items-center gap-2">
            <span>Calendar</span>
            <span className="text-xs font-mono font-medium text-textSecondary bg-surfaceHover px-2.5 py-1 rounded-md border border-border">
              {totalTasksThisMonth} {totalTasksThisMonth === 1 ? 'task' : 'tasks'} in {MONTH_NAMES[month]}
            </span>
          </h1>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="flex items-center bg-surfaceHover border border-border rounded-lg p-1 shadow-inner">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-2 hover:bg-surface text-textSecondary hover:text-textPrimary rounded-md transition-all text-sm font-bold active:scale-95"
            >
              ◀
            </button>
            <span className="font-display font-bold text-sm text-textPrimary px-3 min-w-[130px] text-center select-none">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-2 hover:bg-surface text-textSecondary hover:text-textPrimary rounded-md transition-all text-sm font-bold active:scale-95"
            >
              ▶
            </button>
          </div>

          <button
            onClick={handleGoToToday}
            className="px-3.5 py-2 bg-accent hover:bg-accentHover text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span>●</span> Today
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-dangerBg border border-danger text-danger text-xs p-3 rounded-lg mb-4 font-mono flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-danger font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Calendar Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-xl p-3 sm:p-6 transition-colors duration-300">
        
        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {WEEKDAYS.map(day => (
            <div
              key={day}
              className="text-center py-2 text-[10px] sm:text-xs font-mono font-bold text-textSecondary tracking-wider uppercase select-none"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square min-h-[70px] sm:min-h-[95px] p-2 rounded-xl bg-surfaceHover/50 border border-border/50">
                <Skeleton className="w-5 h-5 rounded-md mb-2" />
                <Skeleton className="w-full h-3 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
            {calendarDays.map((day) => {
              const dayTasks = tasksByDate[day.dateKey] || [];
              const isToday = day.dateKey === todayKey;
              const isSelected = selectedDate === day.dateKey;
              const hasTasks = dayTasks.length > 0;
              const importantCount = dayTasks.filter(isImportant).length;

              return (
                <motion.div
                  key={day.dateKey}
                  layoutId={`calendar-cell-${day.dateKey}`}
                  onClick={() => {
                    haptics.selection();
                    setSelectedDate(day.dateKey);
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`relative min-h-[74px] sm:min-h-[105px] p-2 sm:p-2.5 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden select-none group ${
                    isSelected
                      ? 'opacity-0' // Hidden when expanded to avoid double element artifacts during transition
                      : day.isCurrentMonth
                        ? isToday
                          ? 'bg-accent/10 border-accent shadow-md shadow-accent/10'
                          : hasTasks
                            ? 'bg-surface hover:bg-surfaceHover border-border hover:border-accent/60'
                            : 'bg-surface hover:bg-surfaceHover border-border/80 hover:border-border'
                        : 'bg-background/40 opacity-40 border-border/40 hover:opacity-75'
                  }`}
                >
                  {/* Top row: Day Number and Important Star */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                        isToday
                          ? 'bg-accent text-white shadow-sm'
                          : day.isCurrentMonth
                            ? 'text-textPrimary group-hover:text-accent'
                            : 'text-textSecondary'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {importantCount > 0 && (
                      <span className="text-[10px] text-accent font-bold" title={`${importantCount} Important`}>
                        ⭐
                      </span>
                    )}
                  </div>

                  {/* Task Indicators */}
                  <div className="mt-auto pt-1">
                    {hasTasks ? (
                      <div className="flex flex-col gap-1">
                        {/* Dot Cluster on smaller screens / Pill badge on larger */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {dayTasks.slice(0, 3).map((t, idx) => (
                              <span
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isImportant(t) ? 'bg-accent' : 'bg-textSecondary'
                                }`}
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[8px] font-mono text-textSecondary font-bold">
                                +{dayTasks.length - 3}
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surfaceHover text-textPrimary border border-border shrink-0">
                            {dayTasks.length}
                          </span>
                        </div>

                        {/* Text preview of top task on md+ screens */}
                        <p className="hidden md:block text-[10px] text-textSecondary truncate font-medium group-hover:text-textPrimary transition-colors">
                          {dayTasks[0].title}
                        </p>
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FLUID SHARED-ELEMENT EXPANSION WINDOW (Framer Motion layoutId)            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedDate && (
          <>
            {/* Backdrop */}
            <motion.div
              key="calendar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedDate(null)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Centered Expanded Window Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-none">
              <motion.div
                key={`expanded-${selectedDate}`}
                layoutId={`calendar-cell-${selectedDate}`}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="pointer-events-auto w-full max-w-lg bg-surface border-2 border-accent shadow-2xl rounded-2xl flex flex-col max-h-[88vh] overflow-hidden transition-colors duration-300"
              >
                {/* Header */}
                <div className="p-5 border-b border-border bg-surfaceHover/50 flex items-start justify-between gap-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-textPrimary tracking-tight">
                        {formatSelectedHeaderDate(selectedDate)}
                      </h3>
                      {selectedDate === todayKey && (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-accent text-white px-2 py-0.5 rounded-full shadow-sm">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-textSecondary mt-1">
                      {sortedSelectedTasks.length}{' '}
                      {sortedSelectedTasks.length === 1 ? 'task scheduled' : 'tasks scheduled'} for this day
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedDate(null)}
                    aria-label="Close"
                    className="w-8 h-8 rounded-full bg-surface hover:bg-border text-textSecondary hover:text-textPrimary flex items-center justify-center transition-colors font-bold text-sm border border-border shadow-sm active:scale-90 shrink-0"
                    title="Close (Esc)"
                  >
                    ✕
                  </button>
                </div>

                {/* Task List Section */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar flex flex-col gap-2.5 min-h-[160px]">
                  {sortedSelectedTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 text-textSecondary gap-2 select-none">
                      <div className="w-12 h-12 rounded-full bg-surfaceHover border border-border flex items-center justify-center text-textSecondary/40 text-xl font-bold shadow-inner mb-1">
                        ✓
                      </div>
                      <p className="text-sm font-medium text-textPrimary">No tasks on this date</p>
                      <p className="text-xs text-textSecondary">Use the quick add form below to schedule a task.</p>
                    </div>
                  ) : (
                    sortedSelectedTasks.map((task) => {
                      const isOverdue =
                        new Date(task.due_date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
                      const isRecurring = task.frequency && task.frequency !== 'Once';
                      const completing = completingTasks[task.id];
                      const important = isImportant(task);

                      return (
                        <div
                          key={task.id}
                          className={`relative p-3 rounded-xl border transition-all duration-200 ${
                            completing
                              ? 'opacity-50 scale-[0.98] bg-surfaceHover border-success'
                              : important
                                ? 'bg-surface border-accent/70 shadow-sm'
                                : isOverdue
                                  ? 'bg-dangerBg border-danger/60'
                                  : 'bg-surfaceHover border-border hover:border-accent/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <Pressable
                                onClick={() => toggleComplete(task.id)}
                                haptic={completing ? undefined : 'tap'}
                                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  completing
                                    ? 'bg-success border-success'
                                    : 'border-border hover:border-success bg-surface'
                                }`}
                              >
                                {completing && <span className="text-white text-xs">✓</span>}
                              </Pressable>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`font-medium text-sm leading-tight flex items-center gap-1.5 flex-wrap ${
                                    completing
                                      ? 'text-textSecondary line-through'
                                      : isOverdue
                                        ? 'text-danger'
                                        : 'text-textPrimary'
                                  }`}
                                >
                                  {important && !completing && <span title="Important">⭐</span>}
                                  {isRecurring && (
                                    <span className="text-accent text-xs" title={`Repeats ${task.frequency}`}>
                                      ↻
                                    </span>
                                  )}
                                  <span>{task.title}</span>
                                  {isOverdue && !completing && (
                                    <span className="text-[9px] bg-dangerBg text-danger px-1.5 py-0.2 rounded uppercase tracking-wider font-bold">
                                      Overdue
                                    </span>
                                  )}
                                </p>

                                {completing && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <UndoRing remaining={completing.remaining} />
                                    <p className="text-[10px] text-success font-bold">
                                      {isRecurring ? 'Rescheduling...' : 'Undo?'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Delete Action Button */}
                            {!completing && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-textSecondary hover:text-danger p-1 rounded transition-colors text-xs opacity-60 hover:opacity-100"
                                title="Delete task"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Footer row: Tags and Time */}
                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-border/50 text-xs ml-8">
                            <div className="flex flex-wrap gap-1">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] uppercase tracking-wider font-bold bg-surface border border-border px-1.5 py-0.5 rounded text-accent"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <span className="font-mono text-[11px] text-textSecondary font-medium">
                              {new Date(task.due_date).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Embedded Add Task Form */}
                <div className="p-4 sm:p-5 border-t border-border bg-surfaceHover/30 shrink-0">
                  <form onSubmit={handleAddTask} className="flex flex-col gap-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a task for this date..."
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="flex-1 p-2 bg-background rounded-lg text-sm text-textPrimary border border-border focus:border-accent outline-none transition-colors"
                      />
                      <input
                        type="time"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="w-24 p-2 bg-background rounded-lg text-xs font-mono text-textPrimary border border-border focus:border-accent outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Tags (e.g. important, quiz)"
                        value={newTaskTags}
                        onChange={(e) => setNewTaskTags(e.target.value)}
                        className="flex-1 min-w-[140px] p-2 bg-background rounded-lg text-xs text-textPrimary border border-border focus:border-accent outline-none"
                      />
                      <select
                        value={newTaskFrequency}
                        onChange={(e) => setNewTaskFrequency(e.target.value)}
                        className="p-2 bg-background rounded-lg text-xs text-textPrimary border border-border focus:border-accent outline-none shrink-0"
                      >
                        <option value="Once">Once</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>

                      <Pressable
                        type="submit"
                        disabled={isAddingTask || !newTaskTitle.trim()}
                        className="px-4 py-2 bg-accent hover:bg-accentHover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow shrink-0"
                      >
                        {isAddingTask ? 'Adding...' : '+ Add Task'}
                      </Pressable>
                    </div>

                    {/* Quick Tag Chips */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {['important', 'cat', 'fat', 'quiz', 'club', 'others'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const curr = newTaskTags
                              ? newTaskTags.split(',').map((t) => t.trim()).filter((t) => t !== '')
                              : [];
                            if (!curr.includes(preset)) {
                              setNewTaskTags(curr.length > 0 ? `${curr.join(', ')}, ${preset}` : preset);
                            }
                          }}
                          className="text-[9px] uppercase tracking-wider font-bold bg-surface hover:bg-accent/20 text-textSecondary hover:text-accent border border-border hover:border-accent px-2 py-0.5 rounded transition-colors"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CalendarView;
