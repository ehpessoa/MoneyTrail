import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { TransactionEntry, TransactionType } from '../../types';
import { format, parseISO, subDays } from 'date-fns';
import { suggestCategoryForTransaction, findPotentialDuplicateTransaction } from '../../services/geminiService';
import DynamicIcon from '../ui/DynamicIcon';
import DuplicateTransactionModal from './DuplicateTransactionModal';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<TransactionEntry> | null;
    onSuccess: (newId: string) => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, initialData, onSuccess }) => {
    const { categories, addTransaction, transactions } = useApp();
    
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [type, setType] = useState<TransactionType>('despesa');
    const [categoryId, setCategoryId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
    
    // State for duplicate check
    const [isCheckingForDuplicate, setIsCheckingForDuplicate] = useState(false);
    const [potentialDuplicate, setPotentialDuplicate] = useState<TransactionEntry | null>(null);
    const [newTransactionData, setNewTransactionData] = useState<Omit<TransactionEntry, 'id'> | null>(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setType('despesa');
        setCategoryId('');
        setIsRecurring(false);
        setRecurrenceEndDate('');
        setError('');
        setIsLoading(false);
        setIsSuggestingCategory(false);
        setIsCheckingForDuplicate(false);
        setPotentialDuplicate(null);
        setNewTransactionData(null);
        setShowDuplicateModal(false);
    }

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setDescription(initialData.description || '');
                setAmount(initialData.amount ? String(initialData.amount) : '');
                // The date from prefill is an ISO string. It needs to be formatted to 'yyyy-MM-dd' for the input.
                setDate(initialData.date ? format(parseISO(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
                setType(initialData.type || 'despesa');
                setCategoryId(initialData.categoryId || '');
            } else {
                // Manually opened, reset to defaults
                resetForm();
            }
        } else {
            // When closing, schedule a reset after animation
            setTimeout(resetForm, 300);
        }
    }, [isOpen, initialData]);

    const filteredCategories = categories.filter(c => c.type === type);

    useEffect(() => {
        // Reset category if type changes and selected category is no longer valid
        const availableCategories = filteredCategories;
        if (!availableCategories.some(c => c.id === categoryId)) {
            setCategoryId('');
        }
    }, [type, categories, categoryId]);

    useEffect(() => {
        if (initialData?.categoryId || description.trim().length < 5) {
            return;
        }

        const handler = setTimeout(async () => {
            if (filteredCategories.length > 0) {
                setIsSuggestingCategory(true);
                try {
                    const categoriesForSuggestion = filteredCategories.map(c => ({ id: c.id, name: c.name }));
                    const suggestedId = await suggestCategoryForTransaction(description.trim(), categoriesForSuggestion);
                    if (suggestedId) {
                        setCategoryId(suggestedId);
                    }
                } catch (error) {
                    console.error("Failed to suggest category:", error);
                } finally {
                    setIsSuggestingCategory(false);
                }
            }
        }, 800); // 800ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [description, filteredCategories, initialData?.categoryId]);

    const proceedWithTransaction = async (data: Omit<TransactionEntry, 'id'>) => {
        setIsLoading(true);
        try {
            const newId = await addTransaction(data);
            onSuccess(newId);
            onClose();
        } catch (err) {
            console.error("Failed to add transaction:", err);
            setError('Falha ao adicionar a transação.');
        } finally {
            setIsLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Por favor, insira um valor válido.');
            return;
        }
        if (!categoryId) {
            setError('Por favor, selecione uma categoria.');
            return;
        }

        setError('');

        const transactionData: Omit<TransactionEntry, 'id'> = {
            description,
            amount: numericAmount,
            date: new Date(`${date}T00:00:00`).toISOString(),
            type,
            categoryId,
            isRecurring,
        };

        if (isRecurring) {
            transactionData.recurrenceEndDate = recurrenceEndDate || null;
        }

        // --- DUPLICATE CHECK ---
        setIsCheckingForDuplicate(true);
        const tenDaysAgo = subDays(new Date(), 10);
        const recentTransactions = transactions.filter(t => parseISO(t.date) >= tenDaysAgo);
        
        const duplicateId = await findPotentialDuplicateTransaction(transactionData, recentTransactions);
        setIsCheckingForDuplicate(false);

        if (duplicateId) {
            const foundDuplicate = transactions.find(t => t.id === duplicateId);
            if (foundDuplicate) {
                setNewTransactionData(transactionData);
                setPotentialDuplicate(foundDuplicate);
                setShowDuplicateModal(true);
                return; // Stop here and wait for user confirmation
            }
        }
        
        // No duplicate found, proceed as normal
        await proceedWithTransaction(transactionData);
    };

    return (
        <>
            <Modal isOpen={isOpen && !showDuplicateModal} onClose={onClose} title="Adicionar Transação">
                <p className="text-center text-gray-400 text-sm -mt-2 mb-6">
                    Registre manualmente uma nova despesa ou receita.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Descrição"
                        id="add-tx-description"
                        value={description}
                        onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
                        placeholder="Ex: Café da manhã"
                        required
                    />
                    <Input
                        label="Valor"
                        id="add-tx-amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
                        placeholder="R$ 0,00"
                        required
                    />
                    <Input
                        label="Data"
                        id="add-tx-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate((e.target as HTMLInputElement).value)}
                        required
                    />
                    <Input
                        as="select"
                        label="Tipo"
                        id="add-tx-type"
                        value={type}
                        onChange={(e) => {
                            const newType = (e.target as HTMLSelectElement).value as TransactionType;
                            setType(newType);
                            setCategoryId(''); // Reset category when type changes
                        }}
                    >
                        <option value="despesa">Despesa</option>
                        <option value="receita">Receita</option>
                    </Input>
                    
                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="add-tx-category" className="block mb-2 text-sm font-medium text-gray-300">Categoria</label>
                            {isSuggestingCategory && (
                                <svg className="animate-spin h-5 w-5 text-cyan-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                        </div>
                        <Input
                            as="select"
                            id="add-tx-category"
                            value={categoryId}
                            onChange={(e) => setCategoryId((e.target as HTMLSelectElement).value)}
                            required
                        >
                            <option value="" disabled>Selecione uma categoria...</option>
                            {filteredCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </Input>
                    </div>
                    
                    <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
                        <label htmlFor="is-recurring" className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                id="is-recurring"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="w-5 h-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                            />
                            <span className="font-medium text-white">Tornar recorrente (mensal)</span>
                        </label>
                        {isRecurring && (
                            <div className="pl-8">
                                <Input
                                    label="Data de término (opcional)"
                                    id="recurrence-end-date"
                                    type="date"
                                    value={recurrenceEndDate}
                                    onChange={(e) => setRecurrenceEndDate((e.target as HTMLInputElement).value)}
                                    min={date}
                                />
                                <p className="text-xs text-gray-500 mt-1">Deixe em branco para recorrência por 5 anos.</p>
                            </div>
                        )}
                    </div>
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    
                    <div className="pt-4">
                        <Button type="submit" variant="primary" isLoading={isLoading || isCheckingForDuplicate} className="w-full">
                            {isCheckingForDuplicate ? 'Verificando...' : 'Adicionar Transação'}
                        </Button>
                    </div>
                </form>
            </Modal>
            
            <DuplicateTransactionModal
                isOpen={showDuplicateModal}
                onClose={() => setShowDuplicateModal(false)}
                newTransactionData={newTransactionData}
                duplicateTransaction={potentialDuplicate}
                onConfirmCreate={() => {
                    if (newTransactionData) {
                        proceedWithTransaction(newTransactionData);
                    }
                }}
                isLoading={isLoading}
            />
        </>
    );
};

export default AddTransactionModal;
