import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getTodayClasses, getNextClassInfo } from '../utils/timetableUtils';
import Skeleton from './ui/Skeleton';

// 🔥 NEW: Smart Time Formatter
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

function NextClassWidget() {
  const [subjects, setSubjects] = useState([]);
  const [timeInfo, setTimeInfo] = useState({ status: 'LOADING' });
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    // No early-return on an empty subjects array here: getTodayClasses/
    // getNextClassInfo already resolve that to FREE_DAY on their own, and
    // skipping the call used to leave timeInfo stuck at its initial LOADING
    // status forever for anyone with zero subjects.
    const calculateTime = () => {
      const todayClasses = getTodayClasses(subjects);
      const info = getNextClassInfo(todayClasses);
      setTimeInfo(info);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, [subjects]);

  if (isLoading || timeInfo.status === 'LOADING') {
    return (
      <div className="bg-surface p-6 rounded-xl border border-border h-32 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      </div>
    );
  }

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
  
  // 🔥 Apply Smart Formatting
  const timeData = formatSmartTime(isHappeningNow ? minutesLeft : minutesUntil);

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
          {/* 🔥 Styled Smart Output */}
          <p className={`text-2xl font-black leading-none ${isHappeningNow ? 'text-success' : 'text-textPrimary'}`}>
            {timeData.value} {timeData.unit && <span className="text-sm font-medium text-textSecondary">{timeData.unit}</span>}
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