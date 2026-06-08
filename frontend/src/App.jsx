import React, { useState, useEffect } from 'react';
import SetupForm from './components/SetupForm';
import Dashboard from './components/Dashboard';

function App() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect runs automatically when the app opens
  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/profile/');
      if (response.ok) {
        const data = await response.json();
        setProfile(data); // Profile found! Save it to state.
      }
      // If response is 404, profile stays null.
    } catch (error) {
      console.error("Backend not running");
    } finally {
      setIsLoading(false); // Stop the loading spinner
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-blue-400 text-xl font-bold animate-pulse">
        Initializing Command Center...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      {/* The Smart Router: If profile exists, show Dashboard. Else, show SetupForm */}
      {profile ? (
        <Dashboard profile={profile} />
      ) : (
        <SetupForm onSetupComplete={(data) => setProfile(data)} />
      )}
    </div>
  );
}

export default App;