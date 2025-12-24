import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
// FIX: Import ExtractedTransaction from shared types file.
import { ExtractedTransaction } from '../../types';
import DynamicIcon from '../ui/DynamicIcon';
import { format, parseISO } from 'date-fns';

interface ImportReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    extractedTransactions: ExtractedTransaction[];
    onImport: (transactionsToImport: ExtractedTransaction[]) => void;
    isLoading: boolean;
}

const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ isOpen, onClose, extractedTransactions, onImport, isLoading }) => {
    const { categoryMap } = useApp();
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // Pre-select all transactions when the modal opens with new data
    React.useEffect(() => {
        if (isOpen && extractedTransactions.length > 0) {
            setSelectedIndices(new Set(extractedTransactions.map((_, index) => index)));
        } else if (!isOpen) {
            setSelectedIndices(new Set());
        }
    }, [isOpen, extractedTransactions]);

    const handleToggleSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };

    const handleToggleSelectAll = () => {
        if (selectedIndices.size === extractedTransactions.length) {
            setSelectedIndices(new Set()); // Deselect all
        } else {
            setSelectedIndices(new Set(extractedTransactions.map((_, index) => index))); // Select all
        }
    };
    
    const selectedTransactions = useMemo(() => {
        return extractedTransactions.filter((_, index) => selectedIndices.has(index));
    }, [extractedTransactions, selectedIndices]);

    const totalAmount = useMemo(() => {
        return selectedTransactions.reduce((sum, tx) => {
             if (tx.type === 'despesa') {
                return sum + tx.amount;
            }
            return sum;
        }, 0);
    }, [selectedTransactions]);

    const handleConfirmImport = () => {
        onImport(selectedTransactions);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Revisar Transações Importadas">
             <div className="space-y-4">
                {extractedTransactions.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center p-2 bg-gray-900 rounded-lg">
                            <label className="flex items-center space-x-3 cursor-pointer p-2">
                                <input
                                    type="checkbox"
                                    checked={selectedIndices.size > 0 && selectedIndices.size === extractedTransactions.length}
                                    onChange={handleToggleSelectAll}
                                    className="w-5 h-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                                />
                                <span className="font-medium text-white">Selecionar Tudo</span>
                            </label>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Total (despesas)</p>
                                <p className="font-bold text-lg text-red-400">
                                    {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                        </div>

                        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {extractedTransactions.map((tx, index) => {
                                const category = categoryMap.get(tx.categoryId);
                                const isSelected = selectedIndices.has(index);
                                const isIncome = tx.type === 'receita';
                                const amountColor = isIncome ? 'text-green-400' : 'text-red-400';
                                const bgColorClass = 'bg-gray-700';

                                return (
                                    <li 
                                        key={index}
                                        className={`flex items-center p-3 rounded-lg space-x-3 transition-colors cursor-pointer ${isSelected ? 'bg-gray-700' : 'bg-gray-800 opacity-60 hover:opacity-100'}`}
                                        onClick={() => handleToggleSelection(index)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelection(index)}
                                            className="w-5 h-5 text-cyan-600 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500 focus:ring-offset-gray-700 flex-shrink-0"
                                            onClick={e => e.stopPropagation()} // Prevent li click from firing too
                                        />
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgColorClass}`}>
                                            {category ? <DynamicIcon name={category.icon} className="text-white w-5 h-5" /> : <DynamicIcon name="CircleDollarSign" className="text-white w-5 h-5" />}
                                        </div>
                                        <div className="flex-grow overflow-hidden">
                                            <p className="font-semibold text-white truncate">{tx.description}</p>
                                            <p className="text-xs text-gray-400">{category?.name || 'Categoria não encontrada'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${amountColor}`}>
                                                {isIncome ? '+' : '-'} {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                            <p className="text-xs text-gray-500">{format(parseISO(`${tx.date}T00:00:00`), 'dd/MM/yy')}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        
                        <div className="pt-4">
                            <Button onClick={handleConfirmImport} className="w-full" isLoading={isLoading} disabled={selectedTransactions.length === 0}>
                                Importar {selectedTransactions.length} {selectedTransactions.length === 1 ? 'Lançamento' : 'Lançamentos'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-400">Nenhuma transação foi encontrada no arquivo.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImportReviewModal;
