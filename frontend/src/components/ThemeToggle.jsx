import React, { useEffect, useState } from 'react';

const themes = [
  { id: 'dark', label: 'Command Dark', icon: '🌙' },
  { id: 'light', label: 'Paper Light', icon: '☀️' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🧑‍💻' }
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
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surfaceHover transition-colors shadow-sm cursor-pointer"
      title="Toggle Theme"
    >
      <span>{activeTheme.icon}</span>
      <span className="text-xs font-bold text-textSecondary hidden sm:block">
        {activeTheme.label}
      </span>
    </button>
  );
}

export default ThemeToggle;