import React, { useState, useEffect } from 'react';

function ExpensesWidget() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    date: new Date().toISOString().split('T')[0], // Defaults to today's date
    tags: 'food' 
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/expenses/');
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        date: formData.date,
        tags: [formData.tags] // Backend expects a list of strings
      };

      const response = await fetch('http://127.0.0.1:8000/expenses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchExpenses(); // Refresh the list instantly
        setShowForm(false); // Hide the form
        setFormData({ ...formData, amount: '', reason: '' }); // Clear inputs
      }
    } catch (err) {
      console.error('Error saving expense');
    }
  };

  // Calculate the total amount spent
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex items-center justify-center text-blue-400 animate-pulse">
        Loading Ledger...
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex flex-col shadow-lg">
      
      {/* Header & Total Tracker */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Money Manager</h2>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Spent</p>
          <p className="text-lg font-bold text-red-400">₹{totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* The Smart UI Toggle: Show Form OR Show List */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
          <input type="number" placeholder="Amount (₹)" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          <input type="text" placeholder="What did you buy?" required value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 focus:border-blue-500 outline-none" />
          
          <div className="flex gap-2">
            <select value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 outline-none flex-1">
              <option value="food">Food</option>
              <option value="travel">Travel</option>
              <option value="utilities">Utilities</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other</option>
            </select>
            <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="p-2 bg-slate-700 rounded text-sm text-white border border-slate-600 outline-none w-32" />
          </div>
          
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm py-2 rounded transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded font-bold transition-colors">Save</button>
          </div>
        </form>
      ) : (
        <>
          <button onClick={() => setShowForm(true)} className="w-full mb-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-sm py-1.5 rounded transition-colors flex items-center justify-center gap-2">
            + Log Expense
          </button>
          
          {expenses.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              No expenses logged yet.
            </div>
          ) : (
            <ul className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {expenses.map((exp) => (
                <li key={exp.id} className="flex justify-between items-center bg-slate-700 p-2.5 rounded border border-slate-600 hover:border-slate-500 transition-colors">
                  <div className="truncate pr-2">
                    <p className="font-medium text-slate-200 text-sm truncate">{exp.reason}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{exp.tags[0]} • {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="font-bold text-red-300 text-sm whitespace-nowrap">
                    ₹{exp.amount}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default ExpensesWidget;