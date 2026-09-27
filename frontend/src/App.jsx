import React, { useState, useEffect, lazy, Suspense } from 'react';
import { api } from './services/api';
import { offlineSync } from './services/offlineSync';
// --- Views & Components ---
// Dashboard and AuthScreen stay as regular imports — one of them is what
// almost every session opens to first, so splitting either out would just
// trade the current single upfront download for an extra round-trip on the
// most common path. Everything else here is a tab most sessions never even
// visit, so it's split into its own chunk and only fetched the first time
// its tab is actually opened, instead of every session paying for all of it
// upfront in one bundle.
import Dashboard from './components/Dashboard';
import AuthScreen from './components/AuthScreen';
import RadialNav from './components/nav/RadialNav';
import PageTransition from './components/ui/PageTransition';
import ConfirmModal from './components/ui/ConfirmModal';

const ProfileView = lazy(() => import('./components/ProfileView'));
const LinksView = lazy(() => import('./components/LinksView'));
const ScratchpadView = lazy(() => import('./components/ScratchpadView'));
const AttendanceStrategyView = lazy(() => import('./components/AttendanceStrategyView'));
const TimetableView = lazy(() => import('./components/TimetableView'));
const ExpensesView = lazy(() => import('./components/ExpensesView'));
const SocialRadar = lazy(() => import('./components/SocialRadar'));
const CloseFriendsView = lazy(() => import('./components/CloseFriendsView'));
const Help = lazy(() => import('./components/Help'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));

// Shared fallback for every lazy-loaded tab's Suspense boundary — a tab's
// chunk is only a beat behind a warm cache, so this keeps the same
// font-mono/animate-pulse language as the full-screen loading gate below
// instead of introducing a second, different-looking spinner.
function RouteFallback() {
  return (
    <div className="w-full py-24 flex items-center justify-center font-mono text-accent animate-pulse">
      Loading...
    </div>
  );
}

// Public, no-login pages live outside the whole auth/profile lifecycle —
// checked once here (not in state) since it only ever needs the URL the
// page loaded with, never a client-side navigation.
const isPrivacyRoute = window.location.pathname === '/privacy';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // =========================================
  // 1. AUTHENTICATE & FETCH PROFILE
  // =========================================
  useEffect(() => {
    // /privacy must never depend on the backend or an existing session —
    // skip the profile fetch entirely rather than let a stale token in
    // localStorage fire a network call on a page that's supposed to work
    // fully logged out.
    if (isPrivacyRoute) {
      setIsLoading(false);
      return;
    }
    if (isAuthenticated) {
      api.getProfile()
        .then(data => {
          setProfile(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Database connection failed or profile not found.", err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // =========================================
  // 2. THE GLOBAL OFFLINE-FIRST LISTENER
  // =========================================
  useEffect(() => {
    if (isPrivacyRoute) return;

    const handleOnline = () => {
      console.log("🟢 Connection restored!");
      offlineSync.processQueue();
    };

    const handleOffline = () => {
      console.log("🔴 Connection lost. Switching to IndexedDB Queue.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      offlineSync.processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // =========================================
  // 3. LOGOUT HANDLER
  // =========================================
  // `handleLogout` (passed to every logout trigger — the desktop nav button,
  // the radial wheel's Logout item, ProfileView) only opens the confirm
  // dialog now; `executeLogout` is the actual, one-way session teardown,
  // gated behind it so a stray tap can't end the session with no way back.
  const executeLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setProfile(null);
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  // =========================================
  // RENDER BLOCKS
  // =========================================

  // 🌐 PUBLIC ROUTE: no auth gate, no backend call — Google Play needs this
  // URL to load the Privacy Policy on its own, logged out.
  if (isPrivacyRoute) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PrivacyPolicy />
      </Suspense>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300 flex items-center justify-center font-mono text-accent animate-pulse">
        Decrypting Terminal...
      </div>
    );
  }

  // 🛡️ SECURITY GATE: If not authenticated, show Login/Register screen
  if (!isAuthenticated) {
    return (
      <AuthScreen onLoginSuccess={(userData) => {
        setProfile(userData);
        setIsAuthenticated(true);
      }} />
    );
  }

  // 🔥 NEW SAFETY NET: Prevents the blank screen crash if backend fails!
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-danger">
        <span className="text-4xl mb-4">🔌</span>
        <p className="font-bold">Cannot connect to backend server.</p>
        <p className="text-sm text-textSecondary mt-2">Make sure your FastAPI server is running without errors!</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-surface border border-border hover:bg-surfaceHover rounded-lg text-textPrimary font-bold transition-all">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 flex flex-col items-center pt-6 px-4 font-sans overflow-x-hidden overflow-y-auto">

      <nav className="hidden md:flex w-full max-w-6xl justify-between items-center mb-6 bg-surface p-1.5 rounded-lg border border-border shadow-lg z-10 sticky top-4 transition-colors duration-300">

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 justify-center md:justify-start items-center flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('scratchpad')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'scratchpad' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Scratchpad</button>
          <button onClick={() => setActiveTab('links')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'links' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Directory</button>
          <button onClick={() => setActiveTab('strategy')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'strategy' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Strategy</button>
          <button onClick={() => setActiveTab('timetable')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'timetable' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Timetable</button>
          <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'expenses' ? 'bg-success text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Finance</button>
          <button onClick={() => setActiveTab('radar')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'radar' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Radar</button>
          
          {/* Close Friends Directory Tab */}
          <button onClick={() => setActiveTab('closeFriends')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'closeFriends' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Close Friends</button>
          <button onClick={() => setActiveTab('help')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'help' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Help &amp; FAQ</button>
        </div>
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 ${activeTab === 'profile' ? 'bg-accent text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}`}>Profile</button>
        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="ml-2 px-4 py-2 text-danger hover:bg-danger/10 rounded-md text-sm font-bold transition-colors shrink-0"
        >
          Logout
        </button>

      </nav>

      {/* Pinned Profile shortcut (mobile only) — lives up here rather than in
          RadialNav's bottom cluster since it's anchored to the opposite
          corner of the screen, not the FAB. */}
      <button
        onClick={() => setActiveTab('profile')}
        aria-label="Profile"
        title="Profile"
        className={`md:hidden fixed z-30 w-11 h-11 rounded-full shadow-lg border-2 flex items-center justify-center text-lg transition-colors top-[calc(1rem+env(safe-area-inset-top))] right-4 ${
          activeTab === 'profile' ? 'bg-accent border-accentHover text-white' : 'bg-background border-accent text-textPrimary'
        }`}
      >
        👤
      </button>

      {/* Pinned Home shortcut (mobile only) — same treatment as the Profile
          pin above (a plain fixed corner button, not part of RadialNav's
          circular geometry at all), just anchored to the opposite bottom
          corner instead of top-right. */}
      <button
        onClick={() => setActiveTab('dashboard')}
        aria-label="Home"
        title="Home"
        className={`md:hidden fixed z-30 w-11 h-11 rounded-full shadow-lg border-2 flex items-center justify-center text-lg transition-colors bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 ${
          activeTab === 'dashboard' ? 'bg-accent border-accentHover text-white' : 'bg-background border-accent text-textPrimary'
        }`}
      >
        🏠
      </button>

      <div className="w-full max-w-6xl flex justify-center pb-[calc(120px+env(safe-area-inset-bottom))] md:pb-0">
        <PageTransition tabKey={activeTab}>
          <Suspense fallback={<RouteFallback />}>
            {activeTab === 'dashboard' && <Dashboard profile={profile} setProfile={setProfile} setActiveTab={setActiveTab} />}
            {activeTab === 'scratchpad' && <ScratchpadView userId={profile.id} />}
            {activeTab === 'links' && <LinksView userId={profile.id} />}
            {activeTab === 'timetable' && <TimetableView />}
            {activeTab === 'strategy' && <AttendanceStrategyView />}
            {activeTab === 'expenses' && <ExpensesView profile={profile} setProfile={setProfile} />}
            {activeTab === 'radar' && <SocialRadar profile={profile} setProfile={setProfile} />}
            {activeTab === 'closeFriends' && <CloseFriendsView />}
            {activeTab === 'help' && <Help />}
            {activeTab === 'profile' && <ProfileView profile={profile} setProfile={setProfile} onLogout={handleLogout} />}
          </Suspense>
        </PageTransition>
      </div>

      <RadialNav activeTab={activeTab} onSelect={setActiveTab} onLogout={handleLogout} />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => { setShowLogoutConfirm(false); executeLogout(); }}
        title="Log out?"
        message="You'll need your registration number and PIN to sign back in."
        confirmLabel="Log Out"
        danger
      />
    </div>
  );
}

export default App;