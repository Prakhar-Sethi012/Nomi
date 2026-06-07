import React, { useState } from 'react';

function App() {
  // State to hold form data
  const [formData, setFormData] = useState({
    name: '',
    reg_no: '',
    app_pin: ''
  });

  // State to handle success or error messages
  const [message, setMessage] = useState('');

  // Update state when you type in the boxes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Function that runs when you click "Initialize Command Center"
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    
    try {
      const response = await fetch('http://127.0.0.1:8000/profile/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData), // Convert React state to JSON
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Success! Profile created for ${data.name}. Streak: Day ${data.current_streak}`);
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.detail}`);
      }
    } catch (error) {
      setMessage(`Connection Error: Is the FastAPI server running?`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        
        <h1 className="text-3xl font-bold mb-2 text-blue-400 text-center">Setup Profile</h1>
        <p className="text-slate-400 text-center mb-6">Initialize your local Command Center</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input 
              type="text" 
              name="name"
              onChange={handleChange}
              value={formData.name}
              className="w-full p-2 bg-slate-700 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
              required 
            />
          </div>

          {/* Registration Number Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Registration Number</label>
            <input 
              type="text" 
              name="reg_no"
              onChange={handleChange}
              value={formData.reg_no}
              className="w-full p-2 bg-slate-700 rounded border border-slate-600 focus:outline-none focus:border-blue-500"
              required 
            />
          </div>

          {/* PIN Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">4-Digit Security PIN</label>
            <input 
              type="password" 
              name="app_pin"
              maxLength="4"
              onChange={handleChange}
              value={formData.app_pin}
              className="w-full p-2 bg-slate-700 rounded border border-slate-600 focus:outline-none focus:border-blue-500 text-center tracking-widest"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Initialize Command Center
          </button>

        </form>

        {/* Message Display area */}
        {message && (
          <div className="mt-4 p-3 bg-slate-700 rounded text-center text-sm font-medium border border-slate-600">
            {message}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;