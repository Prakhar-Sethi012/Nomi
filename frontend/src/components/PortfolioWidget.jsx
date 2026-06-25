import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function PortfolioWidget() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
    return <div className="mt-6 bg-slate-800 p-6 rounded-xl border border-slate-700 h-48 flex items-center justify-center text-blue-400 animate-pulse">Loading Developer Showcase...</div>;
  }

  return (
    <div className="mt-6 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Project Showcase</h2>
          <p className="text-xs text-slate-400 mt-1">Track and display your engineering portfolio</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold transition-colors"
          >
            + Add Project
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Project Title (e.g., Command Center PWA)" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
            <input type="url" placeholder="GitHub Link (https://...)" value={formData.github_link} onChange={(e) => setFormData({...formData, github_link: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          </div>
          
          <input type="text" placeholder="Tech Stack (comma separated: React, FastAPI, PostgreSQL)" required value={formData.tech_stack} onChange={(e) => setFormData({...formData, tech_stack: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          
          <textarea placeholder="Briefly describe what this project does and the problem it solves..." required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="2" className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none resize-none" />
          
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 bg-slate-600 hover:bg-slate-500 text-white text-sm py-2 rounded transition-colors">Cancel</button>
            <button type="submit" className="px-6 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded font-bold transition-colors">Save to Portfolio</button>
          </div>
        </form>
      ) : projects.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
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
              <div key={proj.id} className="group relative bg-slate-700 p-4 rounded-lg border border-slate-600 hover:border-blue-500 transition-colors flex flex-col">
                
                <button 
                  onClick={() => deleteProject(proj.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-900/80 text-red-200 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
                  title="Delete Project"
                >
                  ✕
                </button>

                <div className="flex justify-between items-start mb-2 pr-8">
                  <h3 className="font-bold text-slate-200 leading-tight">{proj.title}</h3>
                  {githubLink !== '#' && (
                    <a href={githubLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 bg-slate-800 px-2 py-1 rounded shrink-0">
                      GitHub ↗
                    </a>
                  )}
                </div>
                
                <p className="text-sm text-slate-400 mb-4 flex-1">{cleanDesc}</p>
                
                {techList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-slate-600/50">
                    {techList.map(tech => (
                      <span key={tech} className="text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-600 px-2 py-0.5 rounded">
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
    </div>
  );
}

export default PortfolioWidget;