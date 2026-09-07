import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import PinConfirmModal from './PinConfirmModal';

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if ((num = num.toString()).length > 9) return 'Overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() || 'Zero';
};

const StatCard = ({ title, value, subtitle, valueColor = "text-textPrimary" }) => (
  <div className="bg-surface/70 backdrop-blur-xl rounded-3xl p-6 border border-border hover:border-emerald-500/30 transition-all flex flex-col justify-center relative overflow-hidden group">
    <p className="text-textSecondary text-[10px] uppercase tracking-widest font-bold mb-1 z-10">{title}</p>
    <h2 className={`text-2xl lg:text-3xl font-black z-10 ${valueColor}`}>{value}</h2>
    {subtitle && <p className="text-[10px] text-textSecondary mt-1.5 font-bold uppercase tracking-wider z-10">{subtitle}</p>}
  </div>
);

function ExpensesView({ profile, setProfile }) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const getLocalDate = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({ amount: '', reason: '', tags: 'food', date: getLocalDate() });

  const fetchFinanceData = async () => {
    try {
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch finance data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFinanceData(); }, []);

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const isCurrentMonth = viewMonth === new Date().getMonth() && viewYear === new Date().getFullYear();

  // 🔥 EXTRACT DYNAMIC PER-MONTH BUDGET
  const viewMonthKey = `${viewYear}-${viewMonth}`;
  const budgets = profile?.monthly_budgets || {};
  const monthlyLimit = budgets[viewMonthKey] || 0;

  const handleUpdateLimit = async () => {
    const newLimit = prompt(`Set your spending limit for ${viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })} (₹):`, monthlyLimit);
    const parsedLimit = parseFloat(newLimit);
    if (!isNaN(parsedLimit) && parsedLimit >= 0) {
      const newBudgets = { ...budgets, [viewMonthKey]: parsedLimit };
      try {
        await api.updateProfile({ monthly_budgets: newBudgets });
        if (setProfile && profile) setProfile({ ...profile, monthly_budgets: newBudgets });
      } catch (err) { alert("Failed to update limit."); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalAmount = parseFloat(formData.amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert("Please enter a valid expense amount greater than 0.");
      return;
    }
    try {
      const payload = { amount: finalAmount, reason: formData.reason, date: formData.date, tags: [formData.tags] };
      await api.addExpense(payload);
      fetchFinanceData(); 
      setIsModalOpen(false); 
      setFormData({ ...formData, amount: '', reason: '' }); 
    } catch (err) { console.error('Error saving expense', err); }
  };

  const executeDeleteExpense = async (id) => {
    try {
      await api.deleteExpense(id);
      fetchFinanceData();
    } catch (err) { console.error("Failed to delete expense", err); }
  };

  // 🔥 DUAL EXPORT LOGIC
  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      
      let url = 'http://127.0.0.1:8000/expenses/export';
      if (type === 'month') url += `?year=${viewYear}&month=${viewMonth + 1}`; // Backend extracts 1-12
      else if (type === 'year') url += `?year=${viewYear}`;

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to export data.");
      
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = type === 'month' ? `Expense_Report_${viewYear}_${viewMonth + 1}.txt` : `Expense_Report_${viewYear}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error(err);
      alert("Export failed. Make sure the backend is running.");
    }
  };

  const monthlyExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });
  const monthTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);

  const todayObj = new Date();
  const daysElapsed = isCurrentMonth ? (todayObj.getDate() || 1) : new Date(viewYear, viewMonth + 1, 0).getDate();
  const dailyAverage = monthTotal / daysElapsed;

  const todayStr = getLocalDate();
  const todayTotal = expenses.filter(e => e.date === todayStr).reduce((sum, item) => sum + item.amount, 0);
  const todaySubtitle = `${todayObj.getDate()} ${todayObj.toLocaleDateString('default', { month: 'long' })}`;

  const startOfWeek = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate() - todayObj.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate() - todayObj.getDay() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const weekTotal = expenses.filter(e => {
    const d = new Date(e.date);
    d.setHours(0,0,0,0);
    return d >= startOfWeek && d <= endOfWeek;
  }).reduce((sum, item) => sum + item.amount, 0);
  const weekSubtitle = startOfWeek.getMonth() === endOfWeek.getMonth()
    ? `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('default', { month: 'long' })}`
    : `${startOfWeek.getDate()} ${startOfWeek.toLocaleDateString('default', { month: 'short' })} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('default', { month: 'short' })}`;

  const lastMonthDate = new Date(viewYear, viewMonth - 1, 1);
  const lastMonthExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });
  const lastMonthTotal = lastMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
  let change = 0;
  if (lastMonthTotal === 0 && monthTotal > 0) change = 100; 
  else if (lastMonthTotal > 0) change = ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100;

  const handlePrevMonth = () => { setViewDate(new Date(viewYear, viewMonth - 1, 1)); setSelectedCategory(null); };
  const handleNextMonth = () => { setViewDate(new Date(viewYear, viewMonth + 1, 1)); setSelectedCategory(null); };

  const categoryColors = { food: '#f97316', travel: '#3b82f6', utilities: '#a855f7', entertainment: '#ec4899', other: '#64748b' };
  const iconMap = { food: '🍔', travel: '🚌', utilities: '⚡', entertainment: '🎮', other: '🧾' };

  const categoryTotals = monthlyExpenses.reduce((acc, exp) => {
    const tag = exp.tags[0] || 'other';
    acc[tag] = (acc[tag] || 0) + exp.amount;
    return acc;
  }, {});

  let cumulativePercent = 0;
  const gradientStops = Object.entries(categoryTotals).map(([tag, amount]) => {
    const percent = (amount / monthTotal) * 100;
    const start = cumulativePercent;
    const end = cumulativePercent + percent;
    cumulativePercent = end;
    return `${categoryColors[tag]} ${start}% ${end}%`;
  }).join(', ');
  const chartStyle = monthTotal > 0 ? { background: `conic-gradient(${gradientStops})` } : { background: '#1e293b' };

  const displayedExpenses = selectedCategory ? monthlyExpenses.filter(exp => exp.tags[0] === selectedCategory) : monthlyExpenses;
  const groupedExpenses = displayedExpenses.reduce((acc, exp) => {
    const dateStr = new Date(exp.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(exp);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

  if (isLoading) return <div className="text-emerald-400 font-mono animate-pulse mt-20 text-center">Syncing Bank Records...</div>;

  return (
    <>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-8 right-8 z-40 w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-background text-3xl font-black shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-110 hover:-translate-y-1 transition-all flex items-center justify-center">
        +
      </button>

      <div className="w-full max-w-6xl pb-24 relative z-10 animate-fade-in mx-auto mt-8">
        <div className="relative overflow-hidden rounded-[32px] p-10 mb-8 bg-gradient-to-r from-emerald-600/20 via-background to-blue-600/20 border border-border shadow-2xl">
          <div className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-3 bg-background/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-border z-10">
            <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full hover:bg-surfaceHover text-textSecondary font-bold transition-colors">←</button>
            <span className="text-xs font-bold text-textPrimary uppercase tracking-widest min-w-[100px] text-center">{viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
            <button onClick={handleNextMonth} disabled={isCurrentMonth} className={`w-8 h-8 rounded-full font-bold transition-colors ${isCurrentMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-surfaceHover text-textSecondary'}`}>→</button>
          </div>

          <p className="text-textSecondary uppercase tracking-[0.3em] text-xs font-bold relative z-10">Expense Dashboard</p>
          <h1 className="text-5xl md:text-6xl font-black text-textPrimary mt-4 drop-shadow-md relative z-10">₹{monthTotal.toLocaleString('en-IN')}</h1>
          <p className="text-emerald-400/80 font-mono text-[10px] uppercase tracking-wider mt-2 relative z-10">{numberToWords(Math.floor(monthTotal))} Rupees</p>

          <div className="mt-8 max-w-md relative z-10">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-widest">Monthly Limit</span>
              <button onClick={handleUpdateLimit} className="text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors bg-background/50 px-2 py-1 rounded">
                {monthlyLimit > 0 ? `₹${monthlyLimit.toLocaleString('en-IN')}` : 'Set Limit +'}
              </button>
            </div>
            {monthlyLimit > 0 && (
              <div className="h-3 w-full bg-background rounded-full overflow-hidden shadow-inner border border-border">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${monthTotal > monthlyLimit ? 'bg-danger' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((monthTotal / monthlyLimit) * 100, 100)}%` }}
                />
              </div>
            )}
            {monthlyLimit > 0 && monthTotal > monthlyLimit && (
               <p className="text-xs text-danger font-bold mt-2">⚠️ You have exceeded your budget!</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Today" value={`₹${todayTotal.toLocaleString('en-IN')}`} subtitle={todaySubtitle} />
          <StatCard title="This Week" value={`₹${weekTotal.toLocaleString('en-IN')}`} subtitle={weekSubtitle} />
          <StatCard title="Daily Avg" value={`₹${dailyAverage.toFixed(0)}`} subtitle={`${daysElapsed} Days Elapsed`} />

          <div className="bg-surface/70 backdrop-blur-xl rounded-3xl p-6 border border-border flex flex-col justify-center relative group">
            <p className="text-textSecondary text-[10px] uppercase tracking-widest font-bold mb-1">Monthly Trend</p>
            <h2 className={`text-2xl lg:text-3xl font-black ${change > 0 ? 'text-danger' : 'text-emerald-400'}`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </h2>
            <p className="text-[10px] text-textSecondary mt-1.5 font-bold uppercase tracking-wider">vs Last Month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-surface/40 backdrop-blur-xl p-8 rounded-[32px] border border-border shadow-xl flex flex-col items-center">
            <div className="relative w-64 h-64 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 duration-700 mt-4" style={chartStyle}>
              <div className="absolute w-48 h-48 bg-background rounded-full flex flex-col items-center justify-center border-[8px] border-surface shadow-inner z-10">
                <span className="text-textSecondary text-[10px] font-bold uppercase tracking-widest mb-1">Transactions</span>
                <span className="text-5xl font-black text-textPrimary">{monthlyExpenses.length}</span>
                <span className="text-textSecondary text-xs mt-2 font-bold">Avg ₹{monthlyExpenses.length ? Math.round(monthTotal/monthlyExpenses.length).toLocaleString('en-IN') : 0}</span>
              </div>
            </div>
            <div className="w-full space-y-6 mt-12">
              {Object.entries(categoryTotals).map(([tag, amount]) => {
                const percent = monthTotal > 0 ? (amount / monthTotal) * 100 : 0;
                const isSelected = selectedCategory === tag;
                return (
                  <div key={tag} onClick={() => setSelectedCategory(isSelected ? null : tag)} className={`cursor-pointer transition-all duration-300 ${selectedCategory && !isSelected ? 'opacity-30 grayscale' : 'opacity-100 hover:scale-[1.02]'}`}>
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-textPrimary capitalize">{tag}</span>
                        <span className="text-[10px] text-textSecondary font-mono">₹{amount.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-sm font-black text-textPrimary">{percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surfaceHover overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: categoryColors[tag] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-surface/40 backdrop-blur-xl p-8 rounded-[32px] border border-border shadow-xl flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-[0.2em]">{selectedCategory ? `${selectedCategory} Activity` : 'Recent Transactions'}</h3>
                {selectedCategory && (
                  <button onClick={() => setSelectedCategory(null)} className="text-[10px] bg-surfaceHover hover:bg-border text-textPrimary px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider font-bold">Clear Filter ✕</button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => handleExport('month')} className="text-[10px] bg-surfaceHover hover:bg-emerald-600 hover:text-white text-textSecondary border border-border hover:border-emerald-500 px-3 py-1.5 rounded transition-all font-bold tracking-widest uppercase">
                  ⬇ Month .txt
                </button>
                <button onClick={() => handleExport('year')} className="text-[10px] bg-surfaceHover hover:bg-emerald-600 hover:text-white text-textSecondary border border-border hover:border-emerald-500 px-3 py-1.5 rounded transition-all font-bold tracking-widest uppercase">
                  ⬇ Year .txt
                </button>
              </div>
            </div>

            {displayedExpenses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center mt-10 animate-fade-in">
                <div className="text-7xl mb-6 drop-shadow-xl">📈</div>
                <h3 className="text-2xl font-bold text-textPrimary mb-2">No transactions yet</h3>
                <p className="text-textSecondary max-w-[250px] mx-auto text-sm">Start tracking expenses to unlock your financial insights.</p>
              </div>
            ) : (
              <div className="overflow-y-auto pr-4 custom-scrollbar flex-1 space-y-8">
                {sortedDates.map((dateStr) => {
                  const dayTotal = groupedExpenses[dateStr].reduce((sum, exp) => sum + exp.amount, 0);
                  return (
                    <div key={dateStr} className="animate-fade-in">
                      <div className="flex justify-between items-end border-b border-border pb-2 mb-4 sticky top-0 bg-surface/90 backdrop-blur-md z-10 px-1">
                        <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">{dateStr}</h4>
                        <span className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">Total: ₹{dayTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <ul className="space-y-3">
                        {groupedExpenses[dateStr].map((exp) => (
                          <li key={exp.id} className="group bg-surface/50 hover:bg-surfaceHover rounded-3xl p-5 border border-border hover:border-emerald-500/20 hover:-translate-y-1 transition-all flex justify-between items-center cursor-default shadow-sm hover:shadow-xl">
                            <div className="flex gap-4 items-center">
                              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-border" style={{ backgroundColor: categoryColors[exp.tags[0] || 'other'] + '20', color: categoryColors[exp.tags[0] || 'other'] }}>
                                {iconMap[exp.tags[0]] || '🧾'}
                              </div>
                              <div>
                                <p className="font-bold text-textPrimary text-base">{exp.reason}</p>
                                <p className="text-[10px] text-textSecondary uppercase tracking-widest mt-1">{exp.tags[0]}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-danger font-black text-xl lg:text-2xl">-₹{exp.amount.toLocaleString('en-IN')}</span>
                              <button onClick={() => setDeleteTargetId(exp.id)} className="text-textSecondary hover:bg-dangerBg hover:text-danger w-8 h-8 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100" title="Delete Record">✕</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface/95 backdrop-blur-3xl rounded-[32px] border border-border p-8 shadow-2xl w-full max-w-md relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-textSecondary hover:text-textPrimary w-8 h-8 flex items-center justify-center bg-background rounded-full hover:bg-surfaceHover transition-colors">✕</button>
            <h3 className="text-2xl font-black text-textPrimary mb-8 tracking-tight">New Transaction</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-textSecondary font-black text-2xl">₹</span>
                <input type="number" placeholder="0" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-2xl text-textPrimary font-black focus:border-emerald-500 outline-none transition-all shadow-inner" autoFocus/>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-textSecondary tracking-widest ml-2 mb-2 block">Description</label>
                <input type="text" placeholder="e.g. Swiggy Order" required value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-sm text-textPrimary focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-textSecondary tracking-widest ml-2 mb-2 block">Category</label>
                  <select value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-sm text-textPrimary focus:border-emerald-500 outline-none transition-all appearance-none">
                    <option value="food">Food</option>
                    <option value="travel">Travel</option>
                    <option value="utilities">Utilities</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-textSecondary tracking-widest ml-2 mb-2 block">Date</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-sm text-textPrimary focus:border-emerald-500 outline-none transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-background font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] text-lg hover:-translate-y-1">
                Log Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      <PinConfirmModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          executeDeleteExpense(deleteTargetId);
          setDeleteTargetId(null);
        }}
        actionText="Delete Transaction"
      />
    </>
  );
}

export default ExpensesView;