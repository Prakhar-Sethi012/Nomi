import React, { useState, useEffect } from 'react';

// ✅ Pass in setActiveTab as a prop from Dashboard
function ExpensesWidget({ setActiveTab }) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const monthlyLimit = parseFloat(localStorage.getItem('command_center_budget')) || 5000;

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/expenses/');
        if (response.ok) setExpenses(await response.json());
      } catch (err) {
        console.error('Failed to fetch expenses');
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  const totalSpent = thisMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const amountLeft = monthlyLimit - totalSpent;
  const progressPercentage = monthlyLimit > 0 ? Math.min((totalSpent / monthlyLimit) * 100, 100) : 0;
  
  const barColor = progressPercentage > 90 ? 'bg-red-500' : progressPercentage > 75 ? 'bg-orange-500' : 'bg-emerald-500';
  
  if (isLoading) return <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80 flex items-center justify-center text-emerald-400 animate-pulse">Scanning Ledger...</div>;

  return (
    // Replace the top wrapper div with this:
<div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-between h-[300px] relative overflow-hidden">  
      {/* Background Icon */}
      <div className="absolute -right-4 -bottom-4 text-[100px] opacity-5 pointer-events-none text-emerald-500">₹</div>

      <div>
        <h2 className="text-xl font-bold text-white mb-6">Monthly Burn Rate</h2>
        
        <div className="flex flex-col items-center justify-center mb-8">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Spent</p>
          <p className="text-5xl font-black text-white">₹{totalSpent.toFixed(0)}</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 shadow-inner">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Limit: ₹{monthlyLimit}</span>
            <span className={amountLeft >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold animate-pulse"}>
              {amountLeft >= 0 ? 'Left:' : 'Over:'} ₹{Math.abs(amountLeft).toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => setActiveTab && setActiveTab('expenses')}
        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors border border-slate-600 flex justify-center items-center gap-2"
      >
        Manage Finances →
      </button>

    </div>
  );
}

export default ExpensesWidget;