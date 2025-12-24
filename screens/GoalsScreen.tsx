import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Target, Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GoalFormModal from '../components/modals/GoalFormModal';
import { GoalEntry } from '../types';

const GoalCard: React.FC<{ 
    goal: GoalEntry & { categoryName: string; progressAmount: number; };
    onEdit: (goal: GoalEntry) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}> = ({ goal, onEdit, onDelete, isDeleting }) => {
    const { name: goalName, targetAmount: target, deadline, categoryName, progressAmount: current } = goal;
    const progress = target > 0 ? (current / target) * 100 : 0;
    
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md transition-transform hover:scale-[1.02] flex flex-col justify-between min-h-[160px] group relative">
            <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-white flex-1">{goalName}</h3>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full whitespace-nowrap">{categoryName}</span>
                </div>
                <div className="space-y-2">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${progress > 100 ? 100 : progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-green-400 font-medium">{current.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-gray-400">{target.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            </div>
             {deadline && (
                <div className="flex items-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-700/50">
                    <Calendar size={14} className="mr-2 flex-shrink-0" />
                    <span>Vence em: {format(parseISO(deadline), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
            )}
             <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onEdit(goal)}
                    className="p-2 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-cyan-400"
                    aria-label="Editar meta"
                    disabled={isDeleting}
                >
                    <Edit size={16} />
                </button>
                <button 
                    onClick={() => onDelete(goal.id)}
                    className="p-2 rounded-full bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-red-400 flex items-center justify-center"
                    aria-label="Excluir meta"
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : <Trash2 size={16} />}
                </button>
            </div>
        </div>
    );
};

const GoalsScreen: React.FC = () => {
    const { goals, categoryMap, transactions, deleteGoal } = useApp();
    const [isGoalModalOpen, setGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<GoalEntry | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const goalsWithProgress = goals.map(goal => {
        const category = categoryMap.get(goal.categoryId);
        let progressAmount = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (category) {
            const relevantTransactions = transactions.filter(t => {
                const transactionDate = parseISO(t.date);
                return t.categoryId === goal.categoryId &&
                       t.type === category.type &&
                       transactionDate.getMonth() === currentMonth &&
                       transactionDate.getFullYear() === currentYear;
            });
            
            progressAmount = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);
        }

        return {
            ...goal,
            categoryName: category?.name || 'Desconhecida',
            progressAmount: progressAmount
        };
    }).sort((a, b) => (a.deadline && b.deadline) ? parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime() : a.deadline ? -1 : b.deadline ? 1 : 0);
    
    const handleOpenAddModal = () => {
        setEditingGoal(null);
        setGoalModalOpen(true);
    };

    const handleOpenEditModal = (goal: GoalEntry) => {
        setEditingGoal(goal);
        setGoalModalOpen(true);
    };

    const handleCloseModal = () => {
        setGoalModalOpen(false);
        setEditingGoal(null);
    };

    const handleDeleteGoal = async (goalId: string) => {
        const goalToDelete = goals.find(g => g.id === goalId);
        if (!goalToDelete) return;

        if (window.confirm(`Tem certeza de que deseja excluir a meta "${goalToDelete.name}"?`)) {
            setDeletingId(goalId);
            try {
                await deleteGoal(goalId);
            } catch (error) {
                console.error("Error deleting goal:", error);
                alert("Erro ao excluir a meta.");
            } finally {
                setDeletingId(null);
            }
        }
    };


    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Metas Financeiras</h2>
                    <Target className="text-cyan-400" size={28} />
                </div>

                {goalsWithProgress.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {goalsWithProgress.map(goal => (
                            <GoalCard 
                                key={goal.id} 
                                goal={goal}
                                onEdit={handleOpenEditModal}
                                onDelete={handleDeleteGoal}
                                isDeleting={deletingId === goal.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-800 rounded-lg">
                        <Target size={48} className="mx-auto text-gray-500 mb-4" />
                        <h3 className="text-xl font-semibold text-white">Nenhuma meta criada</h3>
                        <p className="text-gray-400 mt-2">Clique no botão '+' para adicionar sua primeira meta.</p>
                    </div>
                )}

                <button
                    onClick={handleOpenAddModal}
                    className="fixed bottom-24 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 rounded-full shadow-lg shadow-cyan-500/30 transform hover:scale-110 transition-transform z-30"
                    aria-label="Adicionar nova meta"
                >
                    <Plus size={28} />
                </button>
            </div>
            <GoalFormModal 
                isOpen={isGoalModalOpen} 
                onClose={handleCloseModal} 
                goalToEdit={editingGoal} 
            />
        </>
    );
};

export default GoalsScreen;