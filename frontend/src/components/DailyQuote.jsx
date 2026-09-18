import React from 'react';

const quotes = [
  { text: "Arz kiya hai... error 404 tera dhyaan kidhar hai, tera source code idhar hai.", author: "Dev Ghalib" },
  { text: "I'm not procrastinating. I'm just doing side quests.", author: "Every Student Ever" },
  { text: "Na wafa hogi, na wafa ki baat hogi. Ab dosti jisse bhi hogi, deployment ke baad hogi.", author: "Midnight Coder" },
  { text: "99 little bugs in the code. Take one down, patch it around... 127 little bugs in the code.", author: "The Compiler" },
  { text: "My code works, I don't know why. My code broke, I don't know why.", author: "StackOverflow Lurker" },
  { text: "I love deadlines. I love the whooshing noise they make as they go by.", author: "Douglas Adams" },
  { text: "You are the CSS to my HTML. Without you, I'm just basic.", author: "Frontend Rizz" }
];

function DailyQuote() {
  // Use the current day of the month to pick a quote, so it changes exactly at midnight
  const dayOfMonth = new Date().getDate();
  const quoteIndex = dayOfMonth % quotes.length;
  const todaysQuote = quotes[quoteIndex];

  return (
    <div className="bg-surface/60 backdrop-blur-md border border-border rounded-xl py-2 px-4 mb-4 flex items-center justify-between gap-3 shadow-sm relative overflow-hidden group">
      {/* Decorative gradient glow */}
      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-xl"></div>

      <p className="text-textSecondary text-sm font-medium italic pl-2 leading-tight">
        "{todaysQuote.text}"
      </p>

      <span className="text-[9px] text-textSecondary font-bold uppercase tracking-widest shrink-0 whitespace-nowrap">
        — {todaysQuote.author}
      </span>
    </div>
  );
}

export default DailyQuote;