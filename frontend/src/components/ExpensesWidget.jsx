import React, { useState, useEffect } from 'react';

function ExpensesWidget() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Budget Limit State (Saved to the device's local storage)
  const [monthlyLimit, setMonthlyLimit] = useState(() => {
    const saved = localStorage.getItem('command_center_budget');
    return saved ? parseFloat(saved) : 5000; // Defaults to ₹5000 if not set
  });
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(monthlyLimit);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    tags: 'food' 
  });

  // Fetch data on load
  useEffect(() => {
    fetchExpenses();
  }, []);

  // Auto-save the budget limit whenever it changes
  useEffect(() => {
    localStorage.setItem('command_center_budget', monthlyLimit);
  }, [monthlyLimit]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/expenses/');
      if (response.ok) {
        setExpenses(await response.json());
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
        tags: [formData.tags] 
      };

      const response = await fetch('http://127.0.0.1:8000/expenses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchExpenses(); 
        setShowForm(false); 
        setFormData({ ...formData, amount: '', reason: '' }); 
      }
    } catch (err) {
      console.error('Error saving expense');
    }
  };

  const handleLimitSave = (e) => {
    e.preventDefault();
    setMonthlyLimit(parseFloat(tempLimit) || 0);
    setIsEditingLimit(false);
  };

  // --- The Financial Math ---
// --- The Time-Filtered Financial Math ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // ONLY grab expenses that happened this month
  const thisMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  // Calculate totals using ONLY this month's data
  const totalSpent = thisMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const amountLeft = monthlyLimit - totalSpent;
  const progressPercentage = monthlyLimit > 0 ? Math.min((totalSpent / monthlyLimit) * 100, 100) : 0;
  
  const barColor = progressPercentage > 90 ? 'bg-red-500' : progressPercentage > 75 ? 'bg-orange-500' : 'bg-blue-500';
  if (isLoading) {
    return <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex items-center justify-center text-blue-400 animate-pulse">Loading Ledger...</div>;
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex flex-col shadow-lg">
      
      {/* Header & Editable Limit */}
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-bold text-white">Money Manager</h2>
        
        {isEditingLimit ? (
          <form onSubmit={handleLimitSave} className="flex gap-2">
            <input 
              type="number" 
              value={tempLimit} 
              onChange={(e) => setTempLimit(e.target.value)} 
              className="w-20 p-1 bg-slate-700 rounded text-xs text-white border border-slate-600 focus:border-blue-500 outline-none" 
              autoFocus 
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded transition-colors">Save</button>
          </form>
        ) : (
          <div 
            className="text-right cursor-pointer group" 
            onClick={() => { setIsEditingLimit(true); setTempLimit(monthlyLimit); }}
            title="Click to edit budget"
          >
            <p className="text-[10px] text-slate-400 uppercase tracking-wider group-hover:text-blue-400 transition-colors">Monthly Limit ✎</p>
            <p className="text-sm font-bold text-slate-300">₹{monthlyLimit}</p>
          </div>
        )}
      </div>

      {/* The Budget Progress Tracker */}
      <div className="mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700 shadow-inner">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400">Spent: <span className="text-white font-bold">₹{totalSpent.toFixed(0)}</span></span>
          <span className={amountLeft >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold animate-pulse"}>
            {amountLeft >= 0 ? 'Left:' : 'Over:'} ₹{Math.abs(amountLeft).toFixed(0)}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progressPercentage}%` }}></div>
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
              {thisMonthExpenses.map((exp) => (
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