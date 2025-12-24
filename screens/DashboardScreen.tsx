import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowUpRight, ArrowDownLeft, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
    ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { CategoryItem, TransactionEntry } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, startOfYear, endOfYear, eachMonthOfInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimeView = 'monthly' | 'yearly';

const StatCard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => {
    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center space-x-4">
            <div className={`p-3 rounded-full ${color} bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-white">
                    {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const currencyFormatter = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // For Pie Chart (or data with name key)
    if (payload[0].name && payload[0].payload?.name) {
         return (
          <div className="bg-gray-700/90 backdrop-blur-sm p-3 rounded-lg border border-gray-600 shadow-xl">
            <p className="label text-white font-semibold">{`${payload[0].name}`}</p>
            <p className="intro" style={{color: payload[0].fill}}>{`${currencyFormatter(payload[0].value)}`}</p>
          </div>
        );
    }

    // For Bar Chart
    if (label) {
        return (
          <div className="bg-gray-700/90 backdrop-blur-sm p-3 rounded-lg border border-gray-600 shadow-xl">
            <p className="text-sm font-bold text-white mb-2">{`${label}`}</p>
            {payload.map((pld: any) => (
              <div key={pld.dataKey} className="flex items-center text-xs">
                 <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pld.fill }}></div>
                <span className="text-gray-300 mr-2">{`${pld.name}:`}</span>
                <span className="font-semibold" style={{ color: pld.fill }}>{`${currencyFormatter(pld.value)}`}</span>
              </div>
            ))}
          </div>
        );
    }
  }
  return null;
};

const tailwindColorToHex: { [key: string]: string } = {
  'text-red-400': '#f87171',
  'text-orange-400': '#fb923c',
  'text-yellow-400': '#facc15',
  'text-green-400': '#4ade80',
  'text-cyan-400': '#22d3ee',
  'text-blue-400': '#60a5fa',
  'text-purple-400': '#c084fc',
  'text-pink-400': '#f472b6',
};

const DashboardScreen: React.FC = () => {
    const { transactions, categoryMap } = useApp();
    const [timeView, setTimeView] = useState<TimeView>('monthly');
    const [currentDate, setCurrentDate] = useState(new Date());

    const handlePreviousMonth = () => {
        setTimeView('monthly');
        setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setTimeView('monthly');
        setCurrentDate(prev => addMonths(prev, 1));
    };

    const isCurrentOrFutureMonth = useMemo(() => {
        const today = new Date();
        const currentMonthStart = startOfMonth(currentDate);
        const todayMonthStart = startOfMonth(today);
        return currentMonthStart >= todayMonthStart;
    }, [currentDate]);

    const formattedMonth = useMemo(() => {
        const formatted = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }, [currentDate]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let start, end;

        switch (timeView) {
            case 'yearly':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case 'monthly':
            default:
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
                break;
        }

        return transactions.filter(t => {
            const transactionDate = parseISO(t.date);
            return transactionDate >= start && transactionDate <= end;
        });
    }, [transactions, timeView, currentDate]);

    const periodSummary = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.type === 'receita') {
                acc.periodIncome += t.amount;
            } else {
                acc.periodExpense += t.amount;
            }
            return acc;
        }, { periodIncome: 0, periodExpense: 0 });
    }, [filteredTransactions]);
    
    const balance = periodSummary.periodIncome - periodSummary.periodExpense;

    const expensesChartData = useMemo(() => {
        const expensesByCatName: Record<string, { name: string, value: number, color: string }> = {};

        filteredTransactions
            .filter(t => t.type === 'despesa')
            .forEach(transaction => {
                const category = categoryMap.get(transaction.categoryId);
                if (category) {
                    if (!expensesByCatName[category.name]) {
                        expensesByCatName[category.name] = { name: category.name, value: 0, color: category.color };
                    }
                    expensesByCatName[category.name].value += transaction.amount;
                }
            });

        return Object.values(expensesByCatName)
            .sort((a, b) => b.value - a.value)
            .map(data => ({
                name: data.name,
                value: data.value,
                fill: tailwindColorToHex[data.color] || '#8884d8'
            }));
    }, [filteredTransactions, categoryMap]);

    const activityChartData = useMemo(() => {
        const now = new Date();
        const isYearlyView = timeView === 'yearly';

        if (isYearlyView) {
            const dataMap = new Map<string, { date: string; income: number; expense: number }>();
            const months = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
            months.forEach(month => {
                const monthKey = format(month, 'MMM', { locale: ptBR });
                dataMap.set(monthKey, { date: monthKey, income: 0, expense: 0 });
            });

            filteredTransactions.forEach(t => {
                const monthKey = format(parseISO(t.date), 'MMM', { locale: ptBR });
                const monthData = dataMap.get(monthKey);
                if (monthData) {
                    if (t.type === 'receita') monthData.income += t.amount;
                    else monthData.expense += t.amount;
                }
            });
            return Array.from(dataMap.values());
        } else {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            const daysInInterval = eachDayOfInterval({ start, end });
            
            const dataMap = new Map<string, { date: string; income: number; expense: number }>();
            daysInInterval.forEach(day => {
                const dayKey = format(day, 'dd');
                dataMap.set(dayKey, { date: dayKey, income: 0, expense: 0 });
            });

            filteredTransactions.forEach(t => {
                const dayKey = format(parseISO(t.date), 'dd');
                const dayData = dataMap.get(dayKey);
                if (dayData) {
                    if (t.type === 'receita') dayData.income += t.amount;
                    else dayData.expense += t.amount;
                }
            });
            return Array.from(dataMap.values()).sort((a, b) => parseInt(a.date) - parseInt(b.date));
        }
    }, [filteredTransactions, timeView, currentDate]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h2 className="text-2xl font-bold text-white">Resumo Financeiro</h2>
                 <div className="flex w-full sm:w-auto overflow-x-auto pb-2">
                    <div className="flex flex-nowrap bg-gray-800 p-1 rounded-lg space-x-1 items-center">
                        <button onClick={handlePreviousMonth} className="p-1.5 rounded-full text-gray-300 hover:bg-gray-700 transition-colors" aria-label="Mês anterior">
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setTimeView('monthly')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${
                            timeView === 'monthly'
                                ? 'bg-cyan-500 text-white'
                                : 'text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {formattedMonth}
                        </button>
                         <button onClick={handleNextMonth} disabled={isCurrentOrFutureMonth} className="p-1.5 rounded-full text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Próximo mês">
                            <ChevronRight size={20} />
                        </button>

                        <div className="w-px h-6 bg-gray-700 mx-1"></div>

                        <button
                            onClick={() => setTimeView('yearly')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${
                            timeView === 'yearly'
                                ? 'bg-cyan-500 text-white'
                                : 'text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            Este Ano
                        </button>
                    </div>
                </div>
            </div>
            
            <StatCard title="Saldo no Período" value={balance} icon={Wallet} color="text-cyan-400" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Receitas no Período" value={periodSummary.periodIncome} icon={ArrowUpRight} color="text-green-400" />
                <StatCard title="Despesas no Período" value={periodSummary.periodExpense} icon={ArrowDownLeft} color="text-red-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-4">Despesas por Categoria (Período)</h3>
                    {expensesChartData.length > 0 ? (
                        <div className="flex-grow flex flex-col" style={{ minHeight: '300px' }}>
                            <div className="space-y-4 pr-2 overflow-y-auto flex-grow">
                                {expensesChartData.map((entry) => {
                                    const percentage = periodSummary.periodExpense > 0
                                        ? (entry.value / periodSummary.periodExpense) * 100
                                        : 0;

                                    return (
                                        <div key={entry.name} className="group" aria-label={`${entry.name}: ${entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, ${percentage.toFixed(0)}% do total`}>
                                            <div className="flex justify-between items-baseline text-sm mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                                                    <span className="font-medium text-white">{entry.name}</span>
                                                </div>
                                                <div className="font-semibold text-gray-300">
                                                {entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-full bg-gray-700 rounded-full h-2.5 group-hover:bg-gray-600 transition-colors">
                                                    <div 
                                                        className="h-2.5 rounded-full transition-all duration-500 ease-out" 
                                                        style={{ 
                                                            width: `${percentage > 100 ? 100 : percentage}%`, 
                                                            backgroundColor: entry.fill 
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="w-12 text-right text-sm font-semibold text-white">{percentage.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-center text-gray-400 py-10">Nenhuma despesa registrada neste período.</p>
                        </div>
                    )}
                </div>

                <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-4">Atividade no Período</h3>
                    {activityChartData.some(d => d.income > 0 || d.expense > 0) ? (
                        <div className="flex-grow" style={{ minHeight: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis dataKey="date" stroke="#A0AEC0" fontSize={12} />
                                    <YAxis stroke="#A0AEC0" fontSize={12} tickFormatter={(value) => typeof value === 'number' && value > 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(113, 128, 150, 0.1)' }} />
                                    <Bar dataKey="income" name="Receita" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="Despesa" fill="#f87171" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                         <div className="flex-grow flex items-center justify-center">
                            <p className="text-center text-gray-400 py-10">Nenhuma atividade registrada neste período.</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardScreen;