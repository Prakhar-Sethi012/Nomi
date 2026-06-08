import React, { useState } from 'react';

function SetupForm({ onSetupComplete }) {
  const [formData, setFormData] = useState({ name: '', reg_no: '', app_pin: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        onSetupComplete(data); // Tells App.jsx to switch to the Dashboard!
      } else {
        const errorData = await response.json();
        setError(errorData.detail);
      }
    } catch (err) {
      setError('Connection Error: Is the FastAPI server running?');
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
      <h1 className="text-3xl font-bold mb-2 text-blue-400 text-center">Setup Profile</h1>
      <p className="text-slate-400 text-center mb-6">Initialize your local Command Center</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
          <input type="text" name="name" onChange={handleChange} value={formData.name} className="w-full p-2 bg-slate-700 rounded border border-slate-600 text-white" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Registration Number</label>
          <input type="text" name="reg_no" onChange={handleChange} value={formData.reg_no} className="w-full p-2 bg-slate-700 rounded border border-slate-600 text-white" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">4-Digit Security PIN</label>
          <input type="password" name="app_pin" maxLength="4" onChange={handleChange} value={formData.app_pin} className="w-full p-2 bg-slate-700 rounded border border-slate-600 text-center tracking-widest text-white" required />
        </div>
        <button type="submit" className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded">
          Initialize
        </button>
      </form>
      {error && <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded text-center text-sm border border-red-800">{error}</div>}
    </div>
  );
}

export default SetupForm;