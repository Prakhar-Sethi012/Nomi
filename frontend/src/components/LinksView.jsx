import React, { useState, useEffect } from 'react';

function LinksView() {
  // 1. Load links from local storage, or provide a default starter pack
  const [links, setLinks] = useState(() => {
    const saved = localStorage.getItem('cc_links');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'GitHub', url: 'https://github.com', icon: '🐙', desc: 'Code repositories & version control' },
      { id: '2', name: 'LinkedIn', url: 'https://linkedin.com', icon: '💼', desc: 'Professional network & resume' }
    ];
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', icon: '🔗', desc: '' });
  
  // State to show the temporary "Copied!" checkmark
  const [copiedId, setCopiedId] = useState(null);

  // 2. Auto-save to local storage whenever the links array changes
  useEffect(() => {
    localStorage.setItem('cc_links', JSON.stringify(links));
  }, [links]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newLink = { ...formData, id: Date.now().toString() }; // Unique ID
    setLinks([...links, newLink]);
    setShowForm(false);
    setFormData({ name: '', url: '', icon: '🔗', desc: '' });
  };

  const handleDelete = (e, id) => {
    e.preventDefault(); // Stop the link from opening
    e.stopPropagation(); // Stop the click from bubbling up
    setLinks(links.filter(link => link.id !== id));
  };

  const handleCopy = (e, id, url) => {
    e.preventDefault();  // Stop the link from opening
    e.stopPropagation(); // Stop the click from bubbling up
    
    // Write to the user's clipboard
    navigator.clipboard.writeText(url);
    
    // Show "Copied!" UI for 2 seconds
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl pb-10 mx-auto animate-fade-in">
      {/* Header */}
      <header className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Command Directory</h1>
          <p className="text-slate-400 text-sm">Centralized hub for all external networks, profiles, and resources.</p>
        </div>
        
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-4 rounded transition-colors"
          >
            + Add Link
          </button>
        )}
      </header>

      {/* The Creation Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Platform Name (e.g., LeetCode)" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          <input type="url" placeholder="Full URL (https://...)" required value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          <input type="text" placeholder="Brief Description" required value={formData.desc} onChange={(e) => setFormData({...formData, desc: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          <div className="flex gap-2">
            <input type="text" placeholder="Icon Emoji (e.g., 👨‍💻)" required maxLength="2" value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})} className="w-20 p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none text-center" />
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm py-2 rounded transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded font-bold transition-colors">Save Link</button>
          </div>
        </form>
      )}

      {/* Links Grid */}
      {links.length === 0 && !showForm ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
          <p>Your directory is empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {links.map((link) => (
            <a 
              key={link.id} 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-slate-400 transition-all duration-300 flex items-start gap-4 group shadow-lg hover:-translate-y-1 block"
            >
              <div className="text-3xl grayscale group-hover:grayscale-0 transition-all duration-300 drop-shadow-md">
                {link.icon}
              </div>
              
              <div className="flex-1 pr-6">
                <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">{link.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-tight">{link.desc}</p>
                <p className="text-[10px] text-blue-400 mt-3 font-mono opacity-0 group-hover:opacity-100 transition-opacity">LAUNCH ↗</p>
              </div>

              {/* ACTION BUTTONS (Copy & Delete) */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                
                {/* Copy Button */}
                <button 
                  onClick={(e) => handleCopy(e, link.id, link.url)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded-md border border-slate-600 transition-colors"
                  title="Copy Link"
                >
                  {copiedId === link.id ? (
                    <span className="text-green-400 text-xs font-bold px-1">✓</span>
                  ) : (
                    <span className="text-xs">📋</span>
                  )}
                </button>

                {/* Delete Button */}
                <button 
                  onClick={(e) => handleDelete(e, link.id)}
                  className="bg-slate-700 hover:bg-red-900/80 text-slate-400 hover:text-red-400 p-1.5 rounded-md border border-slate-600 hover:border-red-500/50 transition-colors"
                  title="Delete Link"
                >
                  <span className="text-xs">🗑️</span>
                </button>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default LinksView;