import React, { useState } from 'react';
import { api } from '../services/api';

function ProfileView({ profile, setProfile, onLogout }) {
  const [question, setQuestion] = useState(profile?.security_question || '');
  const [answer, setAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    if (newPin && newPin.length !== 4) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    
    setIsLoading(true);
    try {
      const payload = {};
      if (question && answer) {
        payload.security_question = question;
        payload.security_answer = answer;
      }
      if (newPin) {
        payload.app_pin = newPin;
      }
      
      const updated = await api.updateProfile(payload);
      setProfile(updated);
      setAnswer('');
      setNewPin('');
      alert("Security settings updated successfully!");
    } catch (err) {
      alert("Failed to update security settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelfDestruct = async () => {
    const confirm1 = window.confirm("WARNING: This will permanently delete your account, schedules, close friends, and all financial data.");
    if (!confirm1) return;
    
    const confirm2 = window.prompt(`Type your Registration Number (${profile.reg_no}) to confirm deletion:`);
    if (confirm2 !== profile.reg_no) {
      alert("Registration number did not match. Aborting self-destruct.");
      return;
    }

    try {
      await api.selfDestruct();
      alert("Account deleted. Goodbye.");
      onLogout(); // Log the user out immediately
    } catch (err) {
      alert("Failed to delete account. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-10 animate-fade-in flex flex-col gap-6">
      
      <header className="bg-slate-800 p-8 rounded-[32px] border border-slate-700 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px]"></div>
        
        <div className="w-24 h-24 bg-slate-900 border-2 border-indigo-500/50 rounded-full flex items-center justify-center text-4xl shadow-inner z-10 mb-4">
          👨‍💻
        </div>
        <h1 className="text-3xl font-black text-white z-10">{profile.name}</h1>
        <p className="text-slate-400 font-mono tracking-widest uppercase mt-1 z-10">{profile.reg_no}</p>
        
        <div className="flex gap-4 mt-6 z-10">
          <div className="bg-slate-900/50 border border-slate-700 px-4 py-2 rounded-xl">
            <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">CGPA</span>
            <span className="text-lg font-black text-white">{profile.cgpa ? profile.cgpa.toFixed(2) : "0.00"}</span>
          </div>
          <div className="bg-slate-900/50 border border-slate-700 px-4 py-2 rounded-xl">
            <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">Streak</span>
            <span className="text-lg font-black text-orange-400">🔥 {profile.current_streak}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Security Update Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">🛡️ Security Settings</h2>
          
          <form onSubmit={handleUpdateSecurity} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-1">New App PIN (Optional)</label>
              <input 
                type="password" 
                maxLength="4" 
                placeholder="****"
                value={newPin} 
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono tracking-[0.5em] focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Account Recovery Question</label>
              <p className="text-xs text-slate-400 mb-3">Set this so you can recover your account if you forget your PIN.</p>
              
              <select 
                value={question} 
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none mb-3 appearance-none"
              >
                <option value="">Select a security question...</option>
                <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                <option value="What city were you born in?">What city were you born in?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="What was the name of your first school?">What was the name of your first school?</option>
              </select>
              
              <input 
                type="text" 
                placeholder="Your Answer..."
                value={answer} 
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>

            <button disabled={isLoading} type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
              {isLoading ? 'Encrypting...' : 'Save Security Settings'}
            </button>
          </form>
        </div>

        {/* Danger Zone Card */}
        <div className="bg-red-950/20 backdrop-blur-xl p-8 rounded-3xl border border-red-900/30 shadow-xl flex flex-col">
          <h2 className="text-xl font-black text-red-400 mb-2 flex items-center gap-2">⚠️ Danger Zone</h2>
          <p className="text-sm text-slate-400 mb-6">Irreversible actions for your account.</p>
          
          <div className="mt-auto bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-white font-bold mb-2">Self-Destruct Sequence</h3>
            <p className="text-xs text-slate-500 mb-4">Permanently delete your account, timetables, finances, and all associated data. This cannot be undone.</p>
            <button onClick={handleSelfDestruct} className="w-full bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white border border-red-700 font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]">
              INITIATE SELF-DESTRUCT
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default ProfileView;