import React, { useState, useEffect } from 'react';
import CopyButton from './ui/CopyButton';
import PinConfirmModal from './PinConfirmModal';

function LinksView({ userId }) {
  // Namespaced per-user so switching accounts on a shared browser doesn't
  // show the previous user's directory.
  const linksKey = `cc_links_${userId}`;

  // 1. Load links from local storage, or provide a default starter pack
  const [links, setLinks] = useState(() => {
    const saved = localStorage.getItem(linksKey);
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'GitHub', url: 'https://github.com', icon: '🐙', desc: 'Code repositories & version control' },
      { id: '2', name: 'LinkedIn', url: 'https://linkedin.com', icon: '💼', desc: 'Professional network & resume' }
    ];
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', icon: '🔗', desc: '' });
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // 2. Auto-save to local storage whenever the links array changes
  useEffect(() => {
    localStorage.setItem(linksKey, JSON.stringify(links));
  }, [links, linksKey]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newLink = { ...formData, id: Date.now().toString() }; // Unique ID
    setLinks([...links, newLink]);
    setShowForm(false);
    setFormData({ name: '', url: '', icon: '🔗', desc: '' });
  };

  const handleDeleteClick = (e, id) => {
    e.preventDefault(); // Stop the link from opening
    e.stopPropagation(); // Stop the click from bubbling up
    setDeleteTargetId(id);
  };

  const executeDeleteLink = (id) => {
    setLinks(links.filter(link => link.id !== id));
  };

  return (
    <div className="w-full max-w-4xl pb-10 mx-auto animate-fade-in">
      {/* Header */}
      <header className="bg-surface p-6 rounded-xl border border-border mb-6 shadow-lg flex flex-col w-full gap-1 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-textPrimary">Command Directory</h1>

        <div className="flex flex-row justify-between items-start w-full gap-2">
          <p className="flex-1 min-w-0 text-sm text-textSecondary">Centralized hub for all external networks, profiles, and resources.</p>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex flex-row items-center justify-center shrink-0 bg-accent hover:bg-accentHover text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
            >
              + Add Link
            </button>
          )}
        </div>
      </header>

      {/* The Creation Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-xl border border-border mb-6 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-4 transition-colors duration-300">
          <input type="text" placeholder="Platform Name (e.g., LeetCode)" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />
          <input type="url" placeholder="Full URL (https://...)" required value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />
          <input type="text" placeholder="Brief Description" required value={formData.desc} onChange={(e) => setFormData({...formData, desc: e.target.value})} className="w-full p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />
          <div className="flex gap-2">
            <input type="text" placeholder="Icon Emoji (e.g., 👨‍💻)" required maxLength="2" value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})} className="w-20 p-2 bg-background rounded text-sm text-textPrimary border border-border focus:border-accent outline-none text-center" />
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-surfaceHover hover:bg-border text-textPrimary text-sm py-2 rounded transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-accent hover:bg-accentHover text-white text-sm py-2 rounded font-bold transition-colors">Save Link</button>
          </div>
        </form>
      )}

      {/* Links Grid */}
      {links.length === 0 && !showForm ? (
        <div className="py-12 flex flex-col items-center justify-center text-textSecondary border-2 border-dashed border-border rounded-xl">
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
              className="relative bg-surface p-5 rounded-xl border border-border hover:border-accent transition-all duration-300 flex items-start gap-4 group shadow-lg hover:-translate-y-1 block"
            >
              <div className="text-3xl grayscale group-hover:grayscale-0 transition-all duration-300 drop-shadow-md">
                {link.icon}
              </div>

              <div className="flex-1 pr-6">
                <h3 className="font-bold text-textPrimary transition-colors">{link.name}</h3>
                <p className="text-xs text-textSecondary mt-1 leading-tight">{link.desc}</p>
                <p className="text-[10px] text-accent mt-3 font-mono opacity-0 group-hover:opacity-100 transition-opacity">LAUNCH ↗</p>
              </div>

              {/* ACTION BUTTONS (Copy & Delete) */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">

                {/* Copy Button */}
                <CopyButton
                  value={link.url}
                  title="Copy Link"
                  className="bg-surfaceHover hover:bg-border text-textSecondary p-1.5 rounded-md border border-border transition-colors flex items-center justify-center"
                />

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDeleteClick(e, link.id)}
                  className="bg-surfaceHover hover:bg-dangerBg text-textSecondary hover:text-danger p-1.5 rounded-md border border-border hover:border-danger/50 transition-colors"
                  title="Delete Link"
                >
                  <span className="text-xs">🗑️</span>
                </button>
              </div>
            </a>
          ))}
        </div>
      )}

      <PinConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          executeDeleteLink(deleteTargetId);
          setDeleteTargetId(null);
        }}
        actionText="Delete Link"
      />
    </div>
  );
}

export default LinksView;
