import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../services/api';
import PinConfirmModal from './PinConfirmModal';
import HoldToConfirm from './ui/HoldToConfirm';
import NumberRoll from './ui/NumberRoll';
import SlotMachineText from './ui/SlotMachineText';
import { useAppMotion } from '../hooks/useAppMotion';
import { isBiometricSupported, hasBiometricCredential, registerBiometric, clearBiometricCredential } from '../utils/webauthn';

function ProfileView({ profile, setProfile, onLogout }) {
  const m = useAppMotion();
  const [question, setQuestion] = useState(profile?.security_question || '');
  const [answer, setAnswer] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSelfDestructPin, setShowSelfDestructPin] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(hasBiometricCredential());

  const handleToggleBiometrics = async () => {
    if (biometricEnrolled) {
      clearBiometricCredential();
      setBiometricEnrolled(false);
      return;
    }
    try {
      await registerBiometric({ regNo: profile.reg_no, token: localStorage.getItem('token') });
      setBiometricEnrolled(true);
      alert('Face ID / Touch ID enabled on this device!');
    } catch (err) {
      alert(err.message || 'Failed to enable biometric login.');
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    
    // Formatting Checks
    if (newPin && newPin.length !== 4) return alert("New PIN must be exactly 4 characters.");
    if (answer && answer.includes(" ")) return alert("Answer must be strictly ONE word. No spaces.");
    
    // 🔥 NEW: Frontend Guard (Requires either current PIN or security answer if changing PIN)
    if (newPin && !currentPin && !answer) {
      alert("You MUST provide either your Current PIN or your Security Answer to authorize a PIN change.");
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
      if (currentPin) {
        payload.previous_pin = currentPin;
      }
      
      const updated = await api.updateProfile(payload);
      setProfile(updated);
      setAnswer('');
      setCurrentPin('');
      setNewPin('');
      alert("Security settings updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update security settings. Authorization failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // The hold gesture is the first layer of friction for the single most
  // destructive action in the app; the PIN modal below is the actual Master Lock gate.
  const handleSelfDestruct = () => setShowSelfDestructPin(true);

  const executeSelfDestruct = async () => {
    try {
      await api.selfDestruct();
      alert("Account deleted. Goodbye.");
      onLogout();
    } catch (err) {
      alert("Failed to delete account. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-10 animate-fade-in flex flex-col gap-6">
      
      <header className="bg-surface p-8 rounded-[32px] border border-border shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px]"></div>

        <div className="w-24 h-24 bg-background border-2 border-indigo-500/50 rounded-full flex items-center justify-center text-4xl shadow-inner z-10 mb-4">
          👨‍💻
        </div>
        <h1 className="text-3xl font-black text-textPrimary z-10">
          <SlotMachineText key={profile?.name} text={profile?.name || ''} />
        </h1>
        <p className="text-textSecondary font-mono tracking-widest uppercase mt-1 z-10">{profile.reg_no}</p>

        <div className="flex gap-4 mt-6 z-10">
          <div className="bg-background border border-border px-4 py-2 rounded-xl">
            <span className="block text-[10px] text-textSecondary uppercase font-bold tracking-widest">CGPA</span>
            <span className="text-lg font-black text-textPrimary"><NumberRoll value={profile?.cgpa || 0} decimals={2} /></span>
          </div>
          <div className="bg-background border border-border px-4 py-2 rounded-xl">
            <span className="block text-[10px] text-textSecondary uppercase font-bold tracking-widest">Streak</span>
            <span className="text-lg font-black text-orange-400">🔥 <NumberRoll value={profile?.current_streak || 0} /></span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-surface backdrop-blur-xl p-8 rounded-3xl border border-border shadow-xl">
          <h2 className="text-xl font-black text-textPrimary mb-6 flex items-center gap-2">🛡️ Security Settings</h2>

          <form onSubmit={handleUpdateSecurity} className="flex flex-col gap-5">

            {/* PIN CHANGE BLOCK */}
            <motion.div layout transition={m.gentle} className="bg-background p-5 rounded-2xl border border-border">
              <h3 className="text-[10px] uppercase font-bold text-textSecondary tracking-widest block mb-3">Change App PIN</h3>
              {/* flex-col on mobile: two w-full inputs side by side in a plain
                  `flex` row hit the classic flexbox min-width:auto trap — each
                  input refused to shrink below its placeholder's natural
                  width, so on a narrow screen the row overflowed and bled
                  past the card edge instead of the inputs just getting
                  narrower. Stacking them on mobile sidesteps that entirely. */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text" maxLength="4" placeholder="Current PIN"
                  value={currentPin} onChange={(e) => { setCurrentPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '')); setAnswer(''); }}
                  className={`w-full bg-surface border rounded-xl px-3 py-3 text-textPrimary font-mono tracking-[0.2em] focus:outline-none transition-all uppercase text-sm ${newPin && !currentPin && !answer ? 'border-danger shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-border focus:border-accent'}`}
                />
                <input
                  type="text" maxLength="4" placeholder="New PIN"
                  value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-3 text-textPrimary font-mono tracking-[0.2em] focus:border-accent outline-none transition-all uppercase text-sm"
                />
              </div>
              <AnimatePresence initial={false}>
                {newPin && !currentPin && !answer && (
                  <motion.p
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={m.base}
                    className="text-danger text-[9px] font-bold mt-2 uppercase tracking-wider"
                  >
                    Provide Current PIN or Security Answer below to authorize.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* SECURITY QUESTION BLOCK */}
            <div className="bg-background p-5 rounded-2xl border border-border">
              <h3 className="text-[10px] uppercase font-bold text-textSecondary tracking-widest block mb-1">Account Recovery setup</h3>
              <p className="text-xs text-textSecondary mb-3">Fallback if you forget your PIN.</p>

              <input
                type="text" placeholder="e.g. What is my dog's name?"
                value={question} onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-textPrimary focus:border-accent outline-none transition-all text-sm mb-3"
              />
              <input
                type="text" placeholder="Strictly ONE word answer..."
                value={answer} onChange={(e) => { setAnswer(e.target.value.replace(/\s/g, '')); setCurrentPin(''); }}
                className={`w-full bg-surface border rounded-xl px-4 py-3 text-textPrimary focus:outline-none transition-all text-sm ${newPin && !currentPin && !answer ? 'border-danger shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-border focus:border-accent'}`}
              />
            </div>

            <button disabled={isLoading} type="submit" className="w-full mt-2 bg-accent hover:bg-accentHover text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50">
              {isLoading ? 'Encrypting...' : 'Save Security Settings'}
            </button>
          </form>

          {isBiometricSupported() && (
            <div className="bg-background p-5 rounded-2xl border border-border mt-5">
              <h3 className="text-[10px] uppercase font-bold text-textSecondary tracking-widest block mb-1">Face ID / Touch ID</h3>
              <p className="text-xs text-textSecondary mb-3">
                {biometricEnrolled ? 'Biometric login is enabled on this device.' : 'Skip typing your PIN on this device next time.'}
              </p>
              <button
                type="button"
                onClick={handleToggleBiometrics}
                className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg ${
                  biometricEnrolled ? 'bg-dangerBg text-danger border border-danger/30' : 'bg-accent hover:bg-accentHover text-white'
                }`}
              >
                {biometricEnrolled ? 'Disable Biometric Login' : '🔓 Enable Face ID / Touch ID'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-dangerBg backdrop-blur-xl p-8 rounded-3xl border border-danger/30 shadow-xl flex flex-col">
          <h2 className="text-xl font-black text-danger mb-2 flex items-center gap-2">⚠️ Danger Zone</h2>
          <p className="text-sm text-textSecondary mb-6">Irreversible actions for your account.</p>

          <div className="mt-auto bg-background p-6 rounded-2xl border border-border">
            <h3 className="text-textPrimary font-bold mb-2">Self-Destruct Sequence</h3>
            <p className="text-xs text-textSecondary mb-4">Permanently delete your account, timetables, finances, and all associated data. This cannot be undone.</p>
            <HoldToConfirm onConfirm={handleSelfDestruct} className="w-full bg-dangerBg text-danger border border-danger font-bold text-sm py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              HOLD TO SELF-DESTRUCT
            </HoldToConfirm>
          </div>
        </div>

      </div>

      <PinConfirmModal
        isOpen={showSelfDestructPin}
        onClose={() => setShowSelfDestructPin(false)}
        onConfirm={() => {
          setShowSelfDestructPin(false);
          executeSelfDestruct();
        }}
        actionText="Permanently Delete Account"
      />
    </div>
  );
}

export default ProfileView;