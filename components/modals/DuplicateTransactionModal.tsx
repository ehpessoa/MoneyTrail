import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { TransactionEntry } from '../../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DynamicIcon from '../ui/DynamicIcon';
import { AlertTriangle } from 'lucide-react';

interface DuplicateTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    newTransactionData: Omit<TransactionEntry, 'id'> | null;
    duplicateTransaction: TransactionEntry | null;
    onConfirmCreate: () => void;
    isLoading: boolean;
}

const TransactionDetailCard: React.FC<{
    title: string;
    transaction: Omit<TransactionEntry, 'id'> | TransactionEntry;
    isNew?: boolean;
}> = ({ title, transaction, isNew = false }) => {
    const { categoryMap } = useApp();
    const category = categoryMap.get(transaction.categoryId);
    const isIncome = transaction.type === 'receita';
    const amountColor = isIncome ? 'text-green-400' : 'text-red-400';

    return (
        <div className={`p-4 rounded-lg border-2 ${isNew ? 'bg-gray-900/50 border-cyan-500 border-dashed' : 'bg-gray-800 border-gray-700'}`}>
            <h3 className={`font-bold text-lg mb-3 ${isNew ? 'text-cyan-300' : 'text-white'}`}>{title}</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-400">Descrição:</span>
                    <span className="text-white font-medium text-right">{transaction.description}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Valor:</span>
                    <span className={`${amountColor} font-bold`}>
                        {isIncome ? '+' : '-'} {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Data:</span>
                    <span className="text-white font-medium">{format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Categoria:</span>
                    <div className="flex items-center gap-2">
                        {category && <DynamicIcon name={category.icon} className="w-4 h-4 text-gray-300" />}
                        <span className="text-white font-medium">{category?.name || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const DuplicateTransactionModal: React.FC<DuplicateTransactionModalProps> = ({
    isOpen,
    onClose,
    newTransactionData,
    duplicateTransaction,
    onConfirmCreate,
    isLoading
}) => {
    if (!isOpen || !newTransactionData || !duplicateTransaction) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Possível Transação Duplicada">
            <div className="space-y-6">
                <div className="flex items-center gap-3 text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
                    <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                    <p className="text-sm">A IA detectou que este lançamento pode ser uma duplicata de um já existente. Por favor, revise os detalhes abaixo.</p>
                </div>

                <div className="space-y-4">
                    <TransactionDetailCard title="Nova Transação" transaction={newTransactionData} isNew />
                    <TransactionDetailCard title="Possível Duplicata Existente" transaction={duplicateTransaction} />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row-reverse gap-3">
                    <Button onClick={onConfirmCreate} isLoading={isLoading} className="w-full">
                        Criar Mesmo Assim
                    </Button>
                    <Button variant="secondary" onClick={onClose} className="w-full">
                        Cancelar Lançamento
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default DuplicateTransactionModal;
