import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { TransactionEntry, TransactionType } from '../../types';
import { format, parseISO } from 'date-fns';
import DynamicIcon from '../ui/DynamicIcon';
import { Repeat } from 'lucide-react';

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: TransactionEntry | null;
    onSuccess: (id: string) => void;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, transaction, onSuccess }) => {
    const { categories, updateTransaction } = useApp();
    
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<TransactionType>('despesa');
    const [categoryId, setCategoryId] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (transaction) {
            setDescription(transaction.description);
            setAmount(String(transaction.amount));
            setDate(format(parseISO(transaction.date), 'yyyy-MM-dd'));
            setType(transaction.type);
            setCategoryId(transaction.categoryId);
            setError('');
        }
    }, [transaction]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transaction) return;

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Por favor, insira um valor válido.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await updateTransaction(transaction.id, {
                description,
                amount: numericAmount,
                date: new Date(`${date}T00:00:00`).toISOString(),
                type,
                categoryId,
            });
            onSuccess(transaction.id);
            onClose();
        } catch (err) {
            console.error("Failed to update transaction:", err);
            setError('Falha ao atualizar a transação.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Transação">
            <form onSubmit={handleSubmit} className="space-y-4">
                 {transaction?.isRecurring && (
                    <div className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-lg text-sm text-center text-cyan-300">
                        <Repeat size={16} className="flex-shrink-0" />
                        <span>A edição afetará apenas esta ocorrência.</span>
                    </div>
                )}
                <Input
                    label="Descrição"
                    id="tx-description"
                    value={description}
                    onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
                    required
                />
                <Input
                    label="Valor"
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
                    required
                />
                <Input
                    label="Data"
                    id="tx-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate((e.target as HTMLInputElement).value)}
                    required
                />
                <Input
                    as="select"
                    label="Tipo"
                    id="tx-type"
                    value={type}
                    onChange={(e) => setType((e.target as HTMLSelectElement).value as TransactionType)}
                >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                </Input>
                
                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">Categoria</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-gray-900/50 p-3 rounded-lg max-h-48 overflow-y-auto">
                        {categories
                            .filter(c => c.type === type)
                            .map(cat => {
                                const isSelected = cat.id === categoryId;
                                
                                return (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        onClick={() => setCategoryId(cat.id)}
                                        className={`flex flex-col items-center justify-center text-center group transition-transform duration-200 ${isSelected ? 'scale-105' : 'hover:scale-105'}`}
                                        aria-pressed={isSelected}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1.5 border-2 transition-all duration-200 ${isSelected ? 'border-cyan-500' : 'border-transparent'} bg-gray-700`}>
                                            <DynamicIcon name={cat.icon} className="text-white w-6 h-6" />
                                        </div>
                                        <span className={`text-xs text-center w-full truncate transition-colors duration-200 ${isSelected ? 'text-cyan-300 font-semibold' : 'text-gray-300'}`}>{cat.name}</span>
                                    </button>
                                );
                            })}
                    </div>
                    <input type="hidden" value={categoryId} required />
                </div>
                
                {error && <p className="text-red-400 text-sm">{error}</p>}
                
                <div className="pt-4">
                    <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TransactionFormModal;