import React, { useEffect, useState } from 'react';
import ScrambleText from './ui/ScrambleText';

const themes = [
  { id: 'dark', label: 'Command Dark', icon: '🌙' },
  { id: 'light', label: 'Paper Light', icon: '☀️' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🧑‍💻' },
  { id: 'brutalist', label: 'Brutalist', icon: '🧱' },
  { id: 'vaporwave', label: 'Vaporwave', icon: '🌴' },
  { id: 'nordic', label: 'Nordic', icon: '❄️' }
];

function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'dark';
  });

  useEffect(() => {
    if (currentTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
    localStorage.setItem('app-theme', currentTheme);
  }, [currentTheme]);

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setCurrentTheme(themes[nextIndex].id);
  };

  // Falls back to the first theme if localStorage ever holds a stale/unknown
  // id (e.g. from an older app version) — otherwise this would crash the render.
  const activeTheme = themes.find(t => t.id === currentTheme) || themes[0];

  return (
    <button 
      onClick={cycleTheme}
      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surfaceHover transition-colors shadow-sm cursor-pointer shrink-0"
      title="Toggle Theme"
    >
      <span>{activeTheme.icon}</span>
      <ScrambleText
        text={activeTheme.label}
        className="text-xs font-bold text-textSecondary hidden sm:block"
      />
    </button>
  );
}

export default ThemeToggle;