import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import NumberRoll from './ui/NumberRoll';
import Skeleton from './ui/Skeleton';

function ExpensesWidget({ profile, setActiveTab }) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await api.getExpenses();
        setExpenses(data);
      } catch (err) {
        console.error('Failed to fetch expenses', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Extract the specific limit for this exact month (e.g., "2023-8")
  const currentMonthKey = `${currentYear}-${currentMonth}`;
  const budgets = profile?.monthly_budgets || {};
  const monthlyLimit = budgets[currentMonthKey] || 0;

  const thisMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  const totalSpent = thisMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const amountLeft = monthlyLimit - totalSpent;
  const progressPercentage = monthlyLimit > 0 ? Math.min((totalSpent / monthlyLimit) * 100, 100) : 0;
  
  const barColor = progressPercentage > 90 ? 'bg-red-500' : progressPercentage > 75 ? 'bg-orange-500' : 'bg-emerald-500';
  
  if (isLoading) {
    return (
      <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col justify-between h-[400px]">
        <div>
          <Skeleton className="h-6 w-40 mb-6" />
          <div className="flex flex-col items-center gap-2 mb-8">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="bg-background p-4 rounded-lg border border-border">
            <div className="flex justify-between mb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-surface p-5 rounded-xl border border-border shadow-lg flex flex-col justify-between h-[400px] relative overflow-hidden">
      <div className="absolute -right-4 -bottom-4 text-[100px] opacity-5 pointer-events-none text-emerald-500">₹</div>

      <div>
        <h2 className="text-xl font-bold text-textPrimary mb-6">Monthly Burn Rate</h2>

        <div className="flex flex-col items-center justify-center mb-8">
          <p className="text-[10px] uppercase font-bold text-textSecondary tracking-widest mb-1">Total Spent</p>
          <p className="text-5xl font-black text-textPrimary"><NumberRoll value={totalSpent} prefix="₹" /></p>
        </div>

        <div className="bg-background p-4 rounded-lg border border-border shadow-inner">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-textSecondary">Limit: ₹{monthlyLimit}</span>
            <span className={amountLeft >= 0 ? "text-emerald-400 font-bold" : "text-danger font-bold animate-pulse"}>
              {monthlyLimit === 0 ? 'No Limit Set' : (amountLeft >= 0 ? `Left: ₹${Math.abs(amountLeft).toFixed(0)}` : `Over: ₹${Math.abs(amountLeft).toFixed(0)}`)}
            </span>
          </div>
          {monthlyLimit > 0 && (
            <div className="w-full bg-surfaceHover rounded-full h-2 overflow-hidden">
              <div className={`h-2 rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${progressPercentage}%` }}></div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setActiveTab && setActiveTab('expenses')}
        className="w-full bg-surfaceHover hover:bg-border text-textPrimary font-bold py-3 rounded-lg transition-colors border border-border flex justify-center items-center gap-2"
      >
        Manage Finances →
      </button>
    </div>
  );
}

export default ExpensesWidget;