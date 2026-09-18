import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import PinConfirmModal from './PinConfirmModal';
import Pressable from './ui/Pressable';
import Skeleton from './ui/Skeleton';

function PortfolioWidget() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // Holds the ID of the project we want to delete

  const [formData, setFormData] = useState({
    title: '', description: '', tech_stack: '', github_link: ''
  });

  const fetchProjects = async () => {
    try {
      const data = await api.getPortfolio();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const deleteProject = async (id) => {
    try {
      await api.deletePortfolioItem(id);
      fetchProjects(); 
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        item_type: "Project",
        title: formData.title,
        description: formData.description + (formData.tech_stack ? ` | Stack: ${formData.tech_stack}` : ""),
        links: [formData.github_link || "https://github.com"] 
      };
      
      await api.addPortfolioItem(payload);
      
      fetchProjects(); 
      setShowForm(false);
      setFormData({ title: '', description: '', tech_stack: '', github_link: '' });
    } catch (err) {
      console.error('Error saving project', err);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 bg-surface p-6 rounded-xl border border-border shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-32 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surfaceHover p-4 rounded-lg border border-border flex flex-col gap-3 h-32">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-surface p-6 rounded-xl border border-border shadow-lg">
      <div className="flex flex-row justify-between items-start w-full gap-3 mb-6">
        <div className="flex flex-col min-w-0">
          <h2 className="text-lg font-bold text-textPrimary whitespace-nowrap">Project Showcase</h2>
          <p className="text-xs text-textSecondary mt-1">Track and display your engineering portfolio</p>
        </div>
        {!showForm && (
          <Pressable
            onClick={() => setShowForm(true)}
            haptic="tap"
            className="text-sm bg-accent hover:bg-accentHover text-white px-3 py-1.5 rounded font-bold transition-colors shrink-0"
          >
            + Add Project
          </Pressable>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-background p-4 rounded-lg border border-border flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Project Title (e.g., Command Center PWA)" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-2 bg-surface rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />
            <input type="url" placeholder="GitHub Link (https://...)" value={formData.github_link} onChange={(e) => setFormData({...formData, github_link: e.target.value})} className="w-full p-2 bg-surface rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />
          </div>

          <input type="text" placeholder="Tech Stack (comma separated: React, FastAPI, PostgreSQL)" required value={formData.tech_stack} onChange={(e) => setFormData({...formData, tech_stack: e.target.value})} className="w-full p-2 bg-surface rounded text-sm text-textPrimary border border-border focus:border-accent outline-none" />

          <textarea placeholder="Briefly describe what this project does and the problem it solves..." required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="2" className="w-full p-2 bg-surface rounded text-sm text-textPrimary border border-border focus:border-accent outline-none resize-none" />

          <div className="flex gap-2 mt-2">
            <Pressable type="button" onClick={() => setShowForm(false)} className="px-6 bg-surfaceHover hover:bg-border text-textPrimary text-sm py-2 rounded transition-colors">Cancel</Pressable>
            <Pressable type="submit" haptic="tap" className="px-6 bg-accent hover:bg-accentHover text-white text-sm py-2 rounded font-bold transition-colors">Save to Portfolio</Pressable>
          </div>
        </form>
      ) : projects.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-textSecondary border-2 border-dashed border-border rounded-lg">
          <p>Your portfolio is currently empty.</p>
          <p className="text-xs mt-1">Add your first project to start building your developer identity.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const hasTech = proj.description && proj.description.includes(' | Stack: ');
            const cleanDesc = hasTech ? proj.description.split(' | Stack: ')[0] : proj.description;
            const techString = hasTech ? proj.description.split(' | Stack: ')[1] : '';
            const techList = techString ? techString.split(',').map(t => t.trim()) : [];
            const githubLink = proj.links && proj.links.length > 0 ? proj.links[0] : '#';

            return (
              <div key={proj.id} className="group relative bg-surfaceHover p-4 rounded-lg border border-border hover:border-accent transition-colors flex flex-col">

                <Pressable
                  onClick={() => setDeleteTarget(proj.id)} // 🔥 MODIFIED: Opens Modal
                  className="absolute top-2 right-2 w-6 h-6 bg-dangerBg text-danger rounded text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-danger hover:text-white z-10"
                  title="Delete Project"
                >
                  ✕
                </Pressable>

                <div className="flex justify-between items-start mb-2 pr-8">
                  <h3 className="font-bold text-textPrimary leading-tight">{proj.title}</h3>
                  {githubLink !== '#' && (
                    <a href={githubLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accentHover text-xs flex items-center gap-1 bg-surface px-2 py-1 rounded shrink-0">
                      GitHub ↗
                    </a>
                  )}
                </div>

                <p className="text-sm text-textSecondary mb-4 flex-1">{cleanDesc}</p>

                {techList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-border">
                    {techList.map(tech => (
                      <span key={tech} className="text-[10px] font-mono bg-background text-textPrimary border border-border px-2 py-0.5 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🔥 NEW: The Pin Confirmation Modal */}
      <PinConfirmModal 
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteProject(deleteTarget);
          setDeleteTarget(null);
        }}
        actionText="Delete Portfolio Project"
      />
    </div>
  );
}

export default PortfolioWidget;