import React, { useMemo } from 'react';
import Modal from '../ui/Modal';
import { TransactionEntry, CategoryItem, BudgetEntry } from '../../types';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DynamicIcon from '../ui/DynamicIcon';

interface CategorySpendingDetails {
    category: CategoryItem;
    spentAmount: number;
    budget?: BudgetEntry;
}

interface BudgetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    details: CategorySpendingDetails | null;
    currentDate: Date;
    transactions: TransactionEntry[];
}

const TransactionRow: React.FC<{ transaction: TransactionEntry }> = ({ transaction }) => {
    return (
        <li className="flex justify-between items-center p-2 bg-gray-700/60 rounded-md">
            <div>
                <p className="text-white font-medium">{transaction.description}</p>
                <p className="text-xs text-gray-400">{format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
            <span className="font-mono text-red-400">
                {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
        </li>
    );
};

const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ isOpen, onClose, details, currentDate, transactions }) => {
    const relevantTransactions = useMemo(() => {
        if (!details || !currentDate) return [];
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        return transactions
            .filter(t => 
                t.categoryId === details.category.id &&
                t.type === 'despesa' &&
                parseISO(t.date) >= start &&
                parseISO(t.date) <= end
            )
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [details, currentDate, transactions]);

    if (!details) return null;

    const { category, spentAmount, budget } = details;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes de ${category.name}`}>
            <div className="space-y-6">
                <div className="flex items-center p-4 bg-gray-900/50 rounded-lg space-x-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-700 flex-shrink-0">
                        <DynamicIcon name={category.icon} className="text-white w-8 h-8" />
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm text-gray-400">Total Gasto no Mês</p>
                        <p className="text-3xl font-bold text-red-400">
                            {spentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        {budget && (
                            <p className="text-sm text-gray-400 mt-1">
                                / {budget.limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de limite
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">
                        Lançamentos ({relevantTransactions.length})
                    </h3>
                    {relevantTransactions.length > 0 ? (
                        <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {relevantTransactions.map(tx => (
                                <TransactionRow key={tx.id} transaction={tx} />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-400 py-8">
                            Nenhum lançamento encontrado para esta categoria no período.
                        </p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default BudgetDetailModal;
