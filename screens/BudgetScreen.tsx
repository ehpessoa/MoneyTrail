import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { BudgetEntry, CategoryItem } from '../types';
import { GanttChartSquare, Plus, AlertTriangle, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseISO, startOfMonth, endOfMonth, format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DynamicIcon from '../components/ui/DynamicIcon';
import BudgetFormModal from '../components/modals/BudgetFormModal';
import BudgetDetailModal from '../components/modals/BudgetDetailModal';

interface CategorySpendingDetails {
    category: CategoryItem;
    spentAmount: number;
    budget?: BudgetEntry;
}


const CategorySpendingCard: React.FC<{ data: CategorySpendingDetails; onViewDetails: () => void; onEdit: () => void }> = ({ data, onViewDetails, onEdit }) => {
    const { category, spentAmount, budget } = data;
    const bgColorClass = 'bg-gray-700';

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit();
    };

    if (budget) {
        // Has a budget, render the progress card
        const remainingAmount = budget.limit - spentAmount;
        const progress = budget.limit > 0 ? (spentAmount / budget.limit) * 100 : 0;
        
        const getProgressBarColor = () => {
            if (progress >= 100) return 'bg-red-500';
            if (progress > 75) return 'bg-yellow-500';
            return 'bg-gradient-to-r from-cyan-400 to-blue-500';
        };
        
        const getRemainingTextColor = () => {
            if (progress >= 100) return 'text-red-400';
            if (progress > 75) return 'text-yellow-400';
            return 'text-green-400';
        };

        return (
            <div onClick={onViewDetails} className="bg-gray-800 p-4 rounded-lg shadow-md transition-transform hover:scale-105 cursor-pointer relative group">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-3">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${bgColorClass}`}>
                             <DynamicIcon name={category.icon} className="text-white w-6 h-6" />
                        </div>
                         <h3 className="font-bold text-white flex-1">{category.name}</h3>
                    </div>
                    {progress >= 100 && <AlertTriangle className="text-red-400 w-5 h-5 flex-shrink-0" />}
                </div>
                <div className="space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className={`${getProgressBarColor()} h-2.5 rounded-full`} style={{ width: `${progress > 100 ? 100 : progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-300 font-medium">
                            {spentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-gray-400">
                            de {budget.limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                     <div className="text-center pt-2 mt-2 border-t border-gray-700/50">
                        <span className={`font-semibold ${getRemainingTextColor()}`}>
                            {remainingAmount >= 0 
                                ? `${remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} restantes`
                                : `${Math.abs(remainingAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} acima`}
                        </span>
                    </div>
                </div>
                 <button onClick={handleEditClick} className="absolute top-2 right-2 p-2 rounded-full bg-gray-700/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Editar orçamento">
                    <Edit size={14} />
                </button>
            </div>
        );
    } else {
        // No budget, render a different card
        return (
             <div onClick={onViewDetails} className="bg-gray-800 p-4 rounded-lg shadow-md transition-transform hover:scale-105 cursor-pointer relative group">
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${bgColorClass}`}>
                        <DynamicIcon name={category.icon} className="text-white w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-white flex-1">{category.name}</h3>
                </div>
                <div className="text-left mb-3">
                    <p className="text-sm text-gray-400">Gasto este mês</p>
                    <p className="text-xl font-bold text-white">
                        {spentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="text-center pt-2 mt-2 border-t border-gray-700/50">
                    <span className="font-semibold text-red-400 flex items-center justify-center gap-2 text-sm">
                         <AlertTriangle size={16} />
                        Um limite precisa ser definido
                    </span>
                </div>
                 <button onClick={handleEditClick} className="absolute top-2 right-2 p-2 rounded-full bg-gray-700/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Definir orçamento">
                    <Plus size={14} />
                </button>
            </div>
        );
    }
};


const BudgetScreen: React.FC = () => {
    const { budgets, transactions, categoryMap } = useApp();
    const [isBudgetFormModalOpen, setBudgetFormModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<BudgetEntry | Partial<BudgetEntry> | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewingCategoryDetails, setViewingCategoryDetails] = useState<CategorySpendingDetails | null>(null);

    const handlePreviousMonth = () => {
        setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => addMonths(prev, 1));
    };

    const isCurrentOrFutureMonth = useMemo(() => {
        const today = new Date();
        // Compare year and month, ignoring day and time
        const currentMonthStart = startOfMonth(currentDate);
        const todayMonthStart = startOfMonth(today);
        return currentMonthStart >= todayMonthStart;
    }, [currentDate]);

    const formattedMonth = useMemo(() => {
        const formatted = format(currentDate, 'MMMM \'de\' yyyy', { locale: ptBR });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }, [currentDate]);

    const categorySpendingData = useMemo((): CategorySpendingDetails[] => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        const spentPerCategory = transactions
            .filter(t => 
                t.type === 'despesa' &&
                parseISO(t.date) >= start &&
                parseISO(t.date) <= end
            )
            .reduce((acc, t) => {
                acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const budgetsMap = new Map(budgets.map(b => [b.categoryId, b]));
        
        const allCategoryIdsWithActivity = new Set([
            ...Object.keys(spentPerCategory),
            ...budgets.map(b => b.categoryId)
        ]);

        const data: CategorySpendingDetails[] = [];
        
        allCategoryIdsWithActivity.forEach(catId => {
            const category = categoryMap.get(catId);
            if (category && category.type === 'despesa') {
                data.push({
                    category: category,
                    spentAmount: spentPerCategory[catId] || 0,
                    budget: budgetsMap.get(catId),
                });
            }
        });

        return data.sort((a, b) => {
            const progressA = a.budget ? (a.spentAmount / a.budget.limit) * 100 : -1;
            const progressB = b.budget ? (b.spentAmount / b.budget.limit) * 100 : -1;
            
            if (progressA >= 100 && progressB < 100) return -1;
            if (progressB >= 100 && progressA < 100) return 1;

            if (progressA > -1 && progressB > -1) {
                return progressB - progressA;
            }
            if (progressA > -1) return -1;
            if (progressB > -1) return 1;
            
            return b.spentAmount - a.spentAmount;
        });

    }, [transactions, budgets, categoryMap, currentDate]);

    const handleOpenBudgetForm = (data: CategorySpendingDetails) => {
        setEditingBudget(data.budget || { categoryId: data.category.id });
        setBudgetFormModalOpen(true);
    };

    const handleViewDetails = (data: CategorySpendingDetails) => {
        setViewingCategoryDetails(data);
    };

    const handleAddBudget = () => {
        setEditingBudget(null);
        setBudgetFormModalOpen(true);
    };
    
    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Orçamentos Mensais</h2>
                    <GanttChartSquare className="text-cyan-400" size={28} />
                </div>

                <div className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
                    <button onClick={handlePreviousMonth} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Mês anterior">
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-lg font-semibold text-cyan-300 w-48 text-center" aria-live="polite">{formattedMonth}</span>
                    <button onClick={handleNextMonth} disabled={isCurrentOrFutureMonth} className="p-2 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Próximo mês">
                        <ChevronRight size={24} />
                    </button>
                </div>

                {categorySpendingData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categorySpendingData.map(data => (
                            <CategorySpendingCard 
                                key={data.category.id} 
                                data={data}
                                onViewDetails={() => handleViewDetails(data)}
                                onEdit={() => handleOpenBudgetForm(data)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-800 rounded-lg">
                        <GanttChartSquare size={48} className="mx-auto text-gray-500 mb-4" />
                        <h3 className="text-xl font-semibold text-white">Nenhum orçamento ou gasto</h3>
                        <p className="text-gray-400 mt-2">Nenhuma atividade de despesa foi encontrada para este mês. Clique no '+' para adicionar um orçamento.</p>
                    </div>
                )}

                <button
                    onClick={handleAddBudget}
                    className="fixed bottom-24 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 rounded-full shadow-lg shadow-cyan-500/30 transform hover:scale-110 transition-transform z-30"
                    aria-label="Adicionar novo orçamento"
                >
                    <Plus size={28} />
                </button>
            </div>
            <BudgetFormModal 
                isOpen={isBudgetFormModalOpen} 
                onClose={() => setBudgetFormModalOpen(false)} 
                budgetToEdit={editingBudget} 
            />
            <BudgetDetailModal
                isOpen={!!viewingCategoryDetails}
                onClose={() => setViewingCategoryDetails(null)}
                details={viewingCategoryDetails}
                currentDate={currentDate}
                transactions={transactions}
            />
        </>
    );
};

export default BudgetScreen;