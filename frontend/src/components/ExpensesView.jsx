import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

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

const StatCard = ({ title, value, subtitle, valueColor = "text-white" }) => (
  <div className="bg-slate-900/70 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-center relative overflow-hidden group">
    <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1 z-10">{title}</p>
    <h2 className={`text-2xl lg:text-3xl font-black z-10 ${valueColor}`}>{value}</h2>
    {subtitle && <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider z-10">{subtitle}</p>}
  </div>
);

function ExpensesView() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Timezone fix for India
  const getLocalDate = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    amount: '', reason: '', tags: 'food',
    date: getLocalDate()
  });

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

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalAmount = parseFloat(formData.amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert("Please enter a valid expense amount greater than 0.");
      return;
    }

    try {
      const payload = { 
        amount: finalAmount, 
        reason: formData.reason, 
        date: formData.date, 
        tags: [formData.tags] 
      };
      await api.addExpense(payload);
      
      fetchExpenses(); 
      setIsModalOpen(false); 
      setFormData({ ...formData, amount: '', reason: '' }); 
    } catch (err) {
      console.error('Error saving expense', err);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this transaction permanently?")) return;
    try {
      await api.deleteExpense(id);
      fetchExpenses();
    } catch (err) { 
      console.error("Failed to delete expense", err); 
    }
  };

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const isCurrentMonth = viewMonth === new Date().getMonth() && viewYear === new Date().getFullYear();

  const lifetimeTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

  const monthlyExpenses = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });
  const monthTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);

  const todayObj = new Date();
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

  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const currentDay = isCurrentMonth ? (new Date().getDate() || 1) : daysInViewMonth;
  const dailyAverage = monthTotal / currentDay;

  const handlePrevMonth = () => { setViewDate(new Date(viewYear, viewMonth - 1, 1)); setSelectedCategory(null); };
  const handleNextMonth = () => { setViewDate(new Date(viewYear, viewMonth + 1, 1)); setSelectedCategory(null); };

  const categoryColors = { food: '#f97316', travel: '#3b82f6', utilities: '#a855f7', entertainment: '#ec4899', other: '#64748b' };
  const iconMap = { food: '🍔', travel: '🚌', utilities: '⚡', entertainment: '🎮', other: '🧾' };

  const categoryTotals = monthlyExpenses.reduce((acc, exp) => {
    const tag = exp.tags[0] || 'other';
    acc[tag] = (acc[tag] || 0) + exp.amount;
    return acc;
  }, {});

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const topCategoryName = topCategory ? topCategory[0] : 'None';
  const topCategoryColor = topCategory ? categoryColors[topCategoryName] : '#64748b';

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

      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-8 right-8 z-40 w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-3xl font-black shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-110 hover:-translate-y-1 transition-all flex items-center justify-center">
        +
      </button>

      <div className="w-full max-w-6xl pb-24 relative z-10 animate-fade-in mx-auto">
        <div className="relative overflow-hidden rounded-[32px] p-10 mb-8 bg-gradient-to-r from-emerald-600/20 via-slate-900 to-blue-600/20 border border-slate-700 shadow-2xl">
          <div className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-3 bg-slate-950/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50">
            <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-300 font-bold transition-colors">←</button>
            <span className="text-xs font-bold text-white uppercase tracking-widest min-w-[100px] text-center">{viewDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
            <button onClick={handleNextMonth} disabled={isCurrentMonth} className={`w-8 h-8 rounded-full font-bold transition-colors ${isCurrentMonth ? 'opacity-20 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-300'}`}>→</button>
          </div>
          <p className="text-slate-400 uppercase tracking-[0.3em] text-xs font-bold">Expense Dashboard</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mt-4 drop-shadow-md">₹{monthTotal.toLocaleString('en-IN')}</h1>
          <p className="text-emerald-400/80 font-mono text-[10px] uppercase tracking-wider mt-2">{numberToWords(Math.floor(monthTotal))} Rupees</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="bg-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-full text-sm font-bold border border-emerald-500/30">Avg ₹{dailyAverage.toFixed(0)} / day</span>
            <span className="px-5 py-2.5 rounded-full text-sm font-bold border capitalize" style={{ backgroundColor: `${topCategoryColor}20`, color: topCategoryColor, borderColor: `${topCategoryColor}40` }}>Top: {topCategoryName}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Today" value={`₹${todayTotal.toLocaleString('en-IN')}`} subtitle={todaySubtitle} />
          <StatCard title="This Week" value={`₹${weekTotal.toLocaleString('en-IN')}`} subtitle={weekSubtitle} />
          <StatCard title="Daily Avg" value={`₹${dailyAverage.toFixed(0)}`} subtitle="This Month" />
          <StatCard title="Lifetime" value={`₹${lifetimeTotal.toLocaleString('en-IN')}`} subtitle="All Time" />
          
          <div className="col-span-2 lg:col-span-1 bg-slate-900/70 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 flex flex-col justify-center">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1">Monthly Trend</p>
            <h2 className={`text-2xl lg:text-3xl font-black ${change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </h2>
            <p className="text-[10px] text-slate-500 mt-1.5 font-bold uppercase tracking-wider">vs Last Month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-xl p-8 rounded-[32px] border border-slate-800 shadow-xl flex flex-col items-center">
            <div className="relative w-64 h-64 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 duration-700 mt-4" style={chartStyle}>
              <div className="absolute w-48 h-48 bg-slate-950 rounded-full flex flex-col items-center justify-center border-[8px] border-slate-900 shadow-inner z-10">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Transactions</span>
                <span className="text-5xl font-black text-white">{monthlyExpenses.length}</span>
                <span className="text-slate-500 text-xs mt-2 font-bold">Avg ₹{monthlyExpenses.length ? Math.round(monthTotal/monthlyExpenses.length).toLocaleString('en-IN') : 0}</span>
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
                        <span className="text-sm font-bold text-slate-300 capitalize">{tag}</span>
                        <span className="text-[10px] text-slate-500 font-mono">₹{amount.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-sm font-black text-white">{percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: categoryColors[tag] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-xl p-8 rounded-[32px] border border-slate-800 shadow-xl flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">{selectedCategory ? `${selectedCategory} Activity` : 'Recent Transactions'}</h3>
              {selectedCategory && (
                <button onClick={() => setSelectedCategory(null)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider font-bold">Clear Filter ✕</button>
              )}
            </div>
            
            {displayedExpenses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center mt-10 animate-fade-in">
                <div className="text-7xl mb-6 drop-shadow-xl">📈</div>
                <h3 className="text-2xl font-bold text-white mb-2">No transactions yet</h3>
                <p className="text-slate-500 max-w-[250px] mx-auto text-sm">Start tracking expenses to unlock your financial insights.</p>
              </div>
            ) : (
              <div className="overflow-y-auto pr-4 custom-scrollbar flex-1 space-y-8">
                {sortedDates.map((dateStr) => {
                  const dayTotal = groupedExpenses[dateStr].reduce((sum, exp) => sum + exp.amount, 0);
                  return (
                    <div key={dateStr} className="animate-fade-in">
                      <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-4 sticky top-0 bg-slate-900/90 backdrop-blur-md z-10 px-1">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dateStr}</h4>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total: ₹{dayTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <ul className="space-y-3">
                        {groupedExpenses[dateStr].map((exp) => (
                          <li key={exp.id} className="group bg-slate-900/50 hover:bg-slate-800 rounded-3xl p-5 border border-slate-800 hover:border-emerald-500/20 hover:-translate-y-1 transition-all flex justify-between items-center cursor-default shadow-sm hover:shadow-xl">
                            <div className="flex gap-4 items-center">
                              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-slate-700/50" style={{ backgroundColor: categoryColors[exp.tags[0] || 'other'] + '20', color: categoryColors[exp.tags[0] || 'other'] }}>
                                {iconMap[exp.tags[0]] || '🧾'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-200 text-base">{exp.reason}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{exp.tags[0]}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-red-400 font-black text-xl lg:text-2xl">-₹{exp.amount.toLocaleString('en-IN')}</span>
                              <button onClick={() => deleteExpense(exp.id)} className="text-slate-600 hover:bg-red-500/20 hover:text-red-400 w-8 h-8 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100" title="Delete Record">✕</button>
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950/95 backdrop-blur-3xl rounded-[32px] border border-slate-800 p-8 shadow-2xl w-full max-w-md relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center bg-slate-900 rounded-full hover:bg-slate-800 transition-colors">✕</button>
            <h3 className="text-2xl font-black text-white mb-8 tracking-tight">New Transaction</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-2xl">₹</span>
                <input type="number" placeholder="0" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-2xl text-white font-black focus:border-emerald-500 outline-none transition-all shadow-inner" autoFocus/>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-2 mb-2 block">Description</label>
                <input type="text" placeholder="e.g. Swiggy Order" required value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-sm text-white focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-2 mb-2 block">Category</label>
                  <select value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-sm text-white focus:border-emerald-500 outline-none transition-all appearance-none">
                    <option value="food">Food</option>
                    <option value="travel">Travel</option>
                    <option value="utilities">Utilities</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-2 mb-2 block">Date</label>
                  <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-sm text-white focus:border-emerald-500 outline-none transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] text-lg hover:-translate-y-1">
                Log Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ExpensesView;