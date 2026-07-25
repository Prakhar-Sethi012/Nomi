import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getTodayClasses, getNextClassInfo } from '../utils/timetableUtils';

function NextClassWidget() {
  const [subjects, setSubjects] = useState([]);
  const [timeInfo, setTimeInfo] = useState({ status: 'LOADING' });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch subjects once on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await api.getSubjects();
        setSubjects(data);
      } catch (err) {
        console.error("Failed to fetch subjects for widget", err);
        setTimeInfo({ status: 'ERROR' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  // Update the countdown clock every 60 seconds
  useEffect(() => {
    if (subjects.length === 0) return;

    const calculateTime = () => {
      const todayClasses = getTodayClasses(subjects);
      const info = getNextClassInfo(todayClasses);
      setTimeInfo(info);
    };

    calculateTime(); // Run immediately
    const timer = setInterval(calculateTime, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [subjects]);

  if (isLoading || timeInfo.status === 'LOADING') {
    return <div className="bg-surface p-6 rounded-xl border border-border animate-pulse h-32 flex items-center justify-center text-textSecondary">Scanning Schedule...</div>;
  }

  // RENDER STATES
  if (timeInfo.status === 'FREE_DAY') {
    return (
      <div className="bg-surface p-6 rounded-xl border border-border shadow-lg flex items-center justify-between h-32 transition-colors duration-300">
        <div>
          <h2 className="text-xl font-bold text-textPrimary">No Classes Today</h2>
          <p className="text-sm text-textSecondary mt-1">Enjoy your day off!</p>
        </div>
        <div className="text-4xl">🏝️</div>
      </div>
    );
  }

  if (timeInfo.status === 'DONE') {
    return (
      <div className="bg-surface p-6 rounded-xl border border-border shadow-lg flex items-center justify-between h-32 transition-colors duration-300">
        <div>
          <h2 className="text-xl font-bold text-textPrimary">Classes Over</h2>
          <p className="text-sm text-textSecondary mt-1">You survived today's FFCS gauntlet.</p>
        </div>
        <div className="text-4xl">🎮</div>
      </div>
    );
  }

  const { classInfo, status, minutesLeft, minutesUntil } = timeInfo;
  const isHappeningNow = status === 'CURRENT';

  return (
    <div className={`p-6 rounded-xl border shadow-lg flex flex-col justify-center h-32 transition-all duration-300 relative overflow-hidden ${
      isHappeningNow 
        ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.15)]' 
        : 'bg-surface border-border'
    }`}>
      
      {isHappeningNow && (
        <div className="absolute top-0 right-0 bg-success text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-lg animate-pulse">
          Ongoing
        </div>
      )}

      <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isHappeningNow ? 'text-success' : 'text-accent'}`}>
        {isHappeningNow ? 'Currently In' : 'Up Next'} • {classInfo.timeStr}
      </p>
      
      <h2 className="text-xl font-black text-textPrimary line-clamp-1 mb-1">
        {classInfo.subject.name}
      </h2>
      
      <div className="flex justify-between items-end">
        <p className="text-sm font-medium text-textSecondary flex items-center gap-1.5">
          <span>🚩</span> {classInfo.subject.room_number || 'TBA'}
          <span className="opacity-50">|</span> 
          <span className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded uppercase">
            {classInfo.subject.subject_type === 'LAB' ? classInfo.subject.lab_slot : classInfo.subject.theory_slot}
          </span>
        </p>

        <div className="text-right">
          <p className={`text-2xl font-black leading-none ${isHappeningNow ? 'text-success' : 'text-textPrimary'}`}>
            {isHappeningNow ? minutesLeft : minutesUntil} <span className="text-sm font-medium text-textSecondary">min</span>
          </p>
          <p className="text-[10px] text-textSecondary font-bold uppercase tracking-widest mt-1">
            {isHappeningNow ? 'Remaining' : 'Until Start'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default NextClassWidget;