import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../services/api';
import Pressable from './ui/Pressable';
import { useAppMotion } from '../hooks/useAppMotion';
import { isBiometricSupported, hasBiometricCredential, loginWithBiometric } from '../utils/webauthn';

function AuthScreen({ onLoginSuccess }) {
  const m = useAppMotion();
  // Modes: 'login', 'register', 'recovery'
  const [authMode, setAuthMode] = useState('login');
  
  const [formData, setFormData] = useState({ name: '', reg_no: '', app_pin: '' });
  const [recoveryData, setRecoveryData] = useState({ reg_no: '', security_answer: '', new_pin: '' });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (authMode === 'recovery') {
        // Run Recovery Logic
        if (recoveryData.new_pin.length !== 4) throw new Error("PIN must be exactly 4 characters.");
        const res = await api.resetPin(recoveryData);
        setSuccessMsg(res.message);
        setAuthMode('login'); // Send them back to login screen
      } 
      else {
        // Run Normal Login / Register
        let response;
        if (authMode === 'login') {
          response = await api.login({ reg_no: formData.reg_no, app_pin: formData.app_pin });
        } else {
          response = await api.register(formData);
        }
        localStorage.setItem('token', response.token);
        onLoginSuccess(response.profile);
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // The actual "did the right person unlock this" check is the OS-level
  // biometric prompt itself — no signature gets sent anywhere for a backend
  // to verify (see utils/webauthn.js). On success this just replays the JWT
  // that was already issued the last time this device logged in normally.
  const handleBiometricLogin = async () => {
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const result = await loginWithBiometric();
      if (!result) {
        setError('No biometric login set up on this device yet. Log in with your PIN first.');
        return;
      }
      localStorage.setItem('token', result.token);
      const profile = await api.getProfile();
      onLoginSuccess(profile);
    } catch (err) {
      localStorage.removeItem('token');
      setError(err.message || 'Biometric login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div layout transition={m.gentle} className="bg-surface border border-border p-8 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in relative overflow-hidden">
        
        {/* Glow Effects */}
        {authMode === 'recovery' ? (
           <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-orange-500/20 rounded-full blur-[50px] pointer-events-none"></div>
        ) : (
           <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] pointer-events-none"></div>
        )}

        <div className="text-center mb-8 relative z-10">
          {authMode === 'recovery' && <div className="text-5xl mb-4">🗝️</div>}
          <h1 className="text-3xl font-black text-textPrimary">Nomi</h1>
          {authMode !== 'recovery' && (
            <p className="text-textSecondary text-xs font-medium mt-1">Your New Homie 🫰</p>
          )}
          <p className="text-textSecondary mt-2 text-sm">
            {authMode === 'login' && "Authenticate to access your dashboard."}
            {authMode === 'register' && "Initialize your new campus terminal."}
            {authMode === 'recovery' && "Emergency account recovery protocol."}
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger text-danger text-sm p-3 rounded-lg mb-6 font-bold text-center relative z-10">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-success/10 border border-success text-success text-sm p-3 rounded-lg mb-6 font-bold text-center relative z-10">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">

          <AnimatePresence mode="wait" initial={false}>
          {authMode === 'recovery' ? (
            <motion.div key="recovery" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={m.base} className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">Registration Number</label>
                <input 
                  type="text" required placeholder="e.g. 21BCE1234"
                  value={recoveryData.reg_no} 
                  onChange={e => setRecoveryData({...recoveryData, reg_no: e.target.value.toUpperCase()})} 
                  className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-orange-500 transition-colors uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">Secret Answer</label>
                <input 
                  type="text" required placeholder="Answer to your security question..."
                  value={recoveryData.security_answer} 
                  onChange={e => setRecoveryData({...recoveryData, security_answer: e.target.value})} 
                  className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">Create New 4-Character PIN</label>
                <input
                  type="password" required maxLength="4" pattern="[a-zA-Z0-9]{4}" placeholder="••••"
                  value={recoveryData.new_pin}
                  onChange={e => setRecoveryData({...recoveryData, new_pin: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})}
                  className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-orange-500 transition-colors tracking-[1em] font-mono text-xl text-center"
                />
              </div>
              <Pressable disabled={isLoading} type="submit" haptic="tap" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-lg mt-2 transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(234,88,12,0.3)]">
                {isLoading ? "VERIFYING..." : "RESET PIN"}
              </Pressable>
              <Pressable type="button" onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg(''); }} className="text-xs text-textSecondary hover:text-textPrimary mt-2 font-bold transition-colors">
                ← Cancel & Return to Login
              </Pressable>
            </motion.div>
          ) : (

          /* ================= LOGIN / REGISTER FLOW ================= */
            <motion.div key="login-register" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={m.base} className="flex flex-col gap-5">
              <AnimatePresence initial={false}>
                {authMode === 'register' && (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={m.base}
                  >
                    <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">Full Name</label>
                    <input
                      type="text" required placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-accent transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary mb-1 block">Registration Number</label>
                <input 
                  type="text" required placeholder="e.g. 21BCE1234"
                  value={formData.reg_no} 
                  onChange={e => setFormData({...formData, reg_no: e.target.value.toUpperCase()})} 
                  className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-accent transition-colors uppercase"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-textSecondary block">4-Character Security PIN</label>
                  {authMode === 'login' && (
                    <Pressable type="button" onClick={() => { setAuthMode('recovery'); setError(''); }} className="text-[10px] text-accent font-bold hover:underline">
                      Forgot PIN?
                    </Pressable>
                  )}
                </div>
                <input
                  type="password" required maxLength="4" pattern="[a-zA-Z0-9]{4}" placeholder="••••"
                  value={formData.app_pin}
                  onChange={e => setFormData({...formData, app_pin: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})}
                  className="w-full p-3 bg-background border border-border rounded-lg text-textPrimary outline-none focus:border-accent transition-colors tracking-[1em] font-mono text-xl text-center"
                />
              </div>

              <Pressable disabled={isLoading} type="submit" haptic="tap" className="w-full bg-accent hover:bg-accentHover text-white font-black py-4 rounded-lg mt-2 transition-colors disabled:opacity-50">
                {isLoading ? "AUTHENTICATING..." : (authMode === 'login' ? "LOGIN / DECRYPT" : "INITIALIZE PROFILE")}
              </Pressable>

              {authMode === 'login' && isBiometricSupported() && hasBiometricCredential() && (
                <Pressable
                  type="button"
                  disabled={isLoading}
                  onClick={handleBiometricLogin}
                  haptic="tap"
                  className="w-full bg-background border border-border hover:border-accent text-textPrimary font-bold py-3.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  🔓 Login with Face ID / Touch ID
                </Pressable>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </form>

        {authMode !== 'recovery' && (
          <div className="mt-8 text-center border-t border-border pt-6 relative z-10">
            <p className="text-sm text-textSecondary">
              {authMode === 'login' ? "Don't have an account?" : "Already initialized?"}
              <Pressable
                onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); setSuccessMsg(''); }}
                className="ml-2 text-accent font-bold hover:underline"
              >
                {authMode === 'login' ? "Register now" : "Login here"}
              </Pressable>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AuthScreen;