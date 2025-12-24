import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { TransactionEntry, ExtractedTransaction } from '../../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DynamicIcon from '../ui/DynamicIcon';
import { AlertTriangle } from 'lucide-react';

interface ImportDuplicateReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    duplicates: { transactionToImport: ExtractedTransaction, existingDuplicate: TransactionEntry }[];
    onConfirmImportAll: () => void;
    onConfirmImportNonDuplicates: () => void;
    isLoading: boolean;
}

const TransactionDetail: React.FC<{
    transaction: ExtractedTransaction | TransactionEntry;
    title: string;
    isNew?: boolean;
}> = ({ transaction, title, isNew }) => {
    const { categoryMap } = useApp();
    const category = categoryMap.get(transaction.categoryId);
    const isIncome = transaction.type === 'receita';
    const amountColor = isIncome ? 'text-green-400' : 'text-red-400';
    const date = 'date' in transaction ? transaction.date : new Date().toISOString();

    return (
        <div className={`p-3 rounded-md ${isNew ? 'bg-gray-900/50' : 'bg-gray-700/50'}`}>
             <h4 className={`font-semibold text-sm mb-2 ${isNew ? 'text-cyan-300' : 'text-gray-300'}`}>{title}</h4>
            <div className="space-y-1 text-xs">
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
                    <span className="text-white font-medium">{format(parseISO(date), 'dd/MM/yy', { locale: ptBR })}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-gray-400">Categoria:</span>
                    <span className="text-white font-medium">{category?.name || 'N/A'}</span>
                </div>
            </div>
        </div>
    );
};

const TransactionComparisonCard: React.FC<{
    transactionToImport: ExtractedTransaction;
    existingDuplicate: TransactionEntry;
}> = ({ transactionToImport, existingDuplicate }) => {
    return (
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 space-y-2">
            <TransactionDetail transaction={transactionToImport} title="Transação a ser Importada" isNew />
            <TransactionDetail transaction={existingDuplicate} title="Duplicata Existente" />
        </div>
    );
};


const ImportDuplicateReviewModal: React.FC<ImportDuplicateReviewModalProps> = ({
    isOpen,
    onClose,
    duplicates,
    onConfirmImportAll,
    onConfirmImportNonDuplicates,
    isLoading
}) => {
    const nonDuplicateCount = duplicates.length > 0 ? ` e importar as ${duplicates.length} outra(s)` : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Revisar Duplicatas na Importação">
            <div className="space-y-6">
                <div className="flex items-center gap-3 text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
                    <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                    <p className="text-sm">A IA detectou que {duplicates.length} {duplicates.length === 1 ? 'lançamento' : 'lançamentos'} que você está importando pode(m) ser duplicata(s) de um(s) já existente(s).</p>
                </div>

                <div className="max-h-64 overflow-y-auto pr-2 space-y-3">
                    {duplicates.map((pair, index) => (
                        <TransactionComparisonCard 
                            key={index} 
                            transactionToImport={pair.transactionToImport}
                            existingDuplicate={pair.existingDuplicate}
                        />
                    ))}
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button onClick={onConfirmImportNonDuplicates} isLoading={isLoading} variant="secondary">
                        Ignorar Duplicatas e Importar o Resto
                    </Button>
                    <Button onClick={onConfirmImportAll} isLoading={isLoading} variant="primary">
                        Importar Todas Mesmo Assim
                    </Button>
                    <Button onClick={onClose} variant="secondary">
                        Cancelar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ImportDuplicateReviewModal;
