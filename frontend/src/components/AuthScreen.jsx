import React, { useState } from 'react';
import { api } from '../services/api';

function AuthScreen({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', reg_no: '', app_pin: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await api.login({ reg_no: formData.reg_no, app_pin: formData.app_pin });
      } else {
        response = await api.register(formData);
      }
      
      // Save the token to the browser's local storage
      localStorage.setItem('token', response.token);
      
      // Pass the profile up to the main App component
      onLoginSuccess(response.profile);
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
      <div className="bg-surface border border-border p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-3xl font-black text-textPrimary">Command Center</h1>
          <p className="text-textSecondary mt-2 text-sm">
            {isLogin ? "Authenticate to access your dashboard." : "Initialize your new campus terminal."}
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger text-danger text-sm p-3 rounded-lg mb-6 font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">Full Name</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. John Doe"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">Registration Number</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. 21BCE1234"
              value={formData.reg_no} 
              onChange={e => setFormData({...formData, reg_no: e.target.value.toUpperCase()})} 
              className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-accent transition-colors uppercase"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">4-Digit Security PIN</label>
            <input 
              type="password" 
              required 
              maxLength="4"
              pattern="\d{4}"
              placeholder="••••"
              value={formData.app_pin} 
              onChange={e => setFormData({...formData, app_pin: e.target.value})} 
              className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-accent transition-colors tracking-[1em] font-mono text-xl text-center"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-accent hover:bg-accentHover text-white font-black py-4 rounded-lg mt-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? "AUTHENTICATING..." : (isLogin ? "LOGIN / DECRYPT" : "INITIALIZE PROFILE")}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border pt-6">
          <p className="text-sm text-textSecondary">
            {isLogin ? "Don't have an account?" : "Already initialized?"}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }} 
              className="ml-2 text-accent font-bold hover:underline"
            >
              {isLogin ? "Register now" : "Login here"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;