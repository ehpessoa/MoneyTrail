import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
// FIX: Import ExtractedTransaction from shared types file.
import { TransactionEntry, CategoryItem, TransactionType, ExtractedTransaction } from '../types';
import { Search, Camera, Send, PlusCircle, Pencil, Plus, FileText, Mic, ChevronLeft, ChevronRight, Trash2, Repeat } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths, isToday, isYesterday, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DynamicIcon from '../components/ui/DynamicIcon';
import { parseNaturalLanguageTransaction, scanReceiptWithGemini, ScannedReceipt, extractTransactionsFromFile, findPotentialDuplicateTransaction } from '../services/geminiService';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import CategoryFormModal from '../components/modals/CategoryFormModal';
import Button from '../components/ui/Button';
import TransactionFormModal from '../components/modals/TransactionFormModal';
import AddTransactionModal from '../components/modals/AddTransactionModal';
import ReceiptDetailsModal from '../components/modals/ReceiptDetailsModal';
import ImportReviewModal from '../components/modals/ImportReviewModal';
import Modal from '../components/ui/Modal';
import ImportDuplicateReviewModal from '../components/modals/ImportDuplicateReviewModal';

// Add SpeechRecognition types to the window object for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}


const TransactionItem: React.FC<{ 
    transaction: TransactionEntry, 
    onEdit: (tx: TransactionEntry) => void, 
    onDelete: (tx: TransactionEntry) => void,
    isDeleting: boolean,
    isHighlighted?: boolean 
}> = ({ transaction, onEdit, onDelete, isDeleting, isHighlighted }) => {
    const { categoryMap } = useApp();
    const category = categoryMap.get(transaction.categoryId);

    const isIncome = transaction.type === 'receita';
    const amountColor = isIncome ? 'text-green-400' : 'text-red-400';
    const bgColorClass = 'bg-gray-700';


    return (
        <div className={`flex items-center p-3 bg-gray-800 rounded-lg space-x-4 hover:bg-gray-700/50 transition-colors group ${isHighlighted ? 'animate-flash' : ''} ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bgColorClass}`}>
                {category ? (
                    <DynamicIcon name={category.icon} className="text-white w-6 h-6" />
                ) : (
                    <DynamicIcon name="CircleDollarSign" className="text-white w-6 h-6" />
                )}
            </div>
            <div className="flex-grow">
                 <p className="font-semibold text-white flex items-center gap-1.5">
                    {transaction.description}
                    {transaction.isRecurring && <Repeat size={12} className="text-gray-500" title="Transação Recorrente"/>}
                </p>
                <p className="text-sm text-gray-400">{category?.name || 'Sem Categoria'}</p>
            </div>
            <div className="text-right flex items-center gap-1">
                 <div>
                    <p className={`font-bold text-lg ${amountColor}`}>
                        {isIncome ? '+' : '-'} {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-sm text-gray-500">{format(parseISO(transaction.date), 'dd MMM', { locale: ptBR })}</p>
                </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(transaction); }} 
                    className="p-2 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-gray-700 hover:text-white transition-opacity"
                    aria-label="Editar transação"
                    disabled={isDeleting}
                 >
                    <Pencil size={16} />
                </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(transaction); }} 
                    className="p-2 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-gray-700 hover:text-red-400 transition-opacity"
                    aria-label="Excluir transação"
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

interface QuickAddBarProps {
    onReceiptScanned: (data: ScannedReceipt) => void;
    onTextParsed: (data: Partial<TransactionEntry>) => void;
    categories: CategoryItem[];
}

const QuickAddBar: React.FC<QuickAddBarProps> = ({ onReceiptScanned, onTextParsed, categories }) => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null); // Using 'any' for SpeechRecognition
    const isSpeechSupported = useRef(false);

    const handleTextSubmit = useCallback(async (textToSubmit?: string) => {
        const submissionText = (textToSubmit || text).trim();
        if (!submissionText) return;

        setIsLoading(true);
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
        
        try {
            const categoriesForAI = categories.map(c => ({ id: c.id, name: c.name, type: c.type }));
            const result = await parseNaturalLanguageTransaction(submissionText, categoriesForAI);
            
            onTextParsed({
                amount: result.amount,
                description: result.description,
                date: result.date ? new Date(`${result.date}T00:00:00`).toISOString() : new Date().toISOString(),
                type: result.type,
                categoryId: result.categoryId,
            });
            setText('');
        } catch (error) {
            console.error(error);
            alert((error as Error).message || 'Não foi possível processar a anotação.');
        } finally {
            setIsLoading(false);
        }
    }, [text, categories, onTextParsed, isListening]);

    const textSubmitHandlerRef = useRef(handleTextSubmit);
    useEffect(() => {
        textSubmitHandlerRef.current = handleTextSubmit;
    });

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            isSpeechSupported.current = true;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'pt-BR';
            recognition.interimResults = true;

            recognition.onresult = (event: any) => {
                let interim_transcript = '';
                let final_transcript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final_transcript += event.results[i][0].transcript;
                    } else {
                        interim_transcript += event.results[i][0].transcript;
                    }
                }
                setText(final_transcript || interim_transcript);
                
                if (final_transcript) {
                    textSubmitHandlerRef.current(final_transcript);
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    alert('A permissão do microfone é necessária para usar a entrada de voz.');
                }
                setIsListening(false);
            };
            recognitionRef.current = recognition;
        } else {
            console.warn('Speech recognition not supported in this browser.');
        }
    }, []);

    const handleVoiceInput = () => {
        if (!isSpeechSupported.current || !recognitionRef.current) {
            alert('O reconhecimento de voz não é suportado neste navegador.');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setText('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleReceiptScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const base64String = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
            const result = await scanReceiptWithGemini(base64String, file.type);
            onReceiptScanned(result);
        } catch (error) {
            console.error(error);
            alert((error as Error).message);
        } finally {
            setIsLoading(false);
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    return (
        <div className="fixed bottom-14 left-4 right-4 bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl z-30 flex items-center p-2 gap-2">
            <textarea
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTextSubmit();
                    }
                }}
                placeholder={isListening ? "Ouvindo..." : "Digite ou fale... Exemplo: Almoço no kilo 50,00"}
                className="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none px-2 py-2 resize-none leading-tight"
                disabled={isLoading || isListening}
            />
            {isLoading ? <Spinner /> :
                <button onClick={() => handleTextSubmit()} disabled={!text.trim() || isListening} className="text-cyan-400 p-2 rounded-full hover:bg-gray-700 disabled:text-gray-600 transition-colors">
                    <Send size={20} />
                </button>
            }
             <div className="w-px h-8 bg-gray-600" />
            <button onClick={handleVoiceInput} disabled={isLoading} className={`${isListening ? 'text-red-400 animate-pulse' : 'text-cyan-400'} p-2 rounded-full hover:bg-gray-700 disabled:text-gray-600 transition-colors`} aria-label="Adicionar por voz">
                <Mic size={20} />
            </button>
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleReceiptScan} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isListening} className="text-cyan-400 p-2 rounded-full hover:bg-gray-700 disabled:text-gray-600 transition-colors" aria-label="Escanear recibo">
                <Camera size={20} />
            </button>
        </div>
    );
};

const TransactionGroup: React.FC<{
    date: string;
    transactions: TransactionEntry[];
    total: number;
    type: TransactionType;
    onEdit: (tx: TransactionEntry) => void;
    onDelete: (tx: TransactionEntry) => void;
    deletingId: string | null;
    highlightedTxId: string | null;
}> = ({ date, transactions, total, type, onEdit, onDelete, deletingId, highlightedTxId }) => {

    const formattedDate = useMemo(() => {
        // Add T00:00:00 to parse as local date, not UTC, preventing off-by-one day errors.
        const transactionDate = parseISO(`${date}T00:00:00`);
        
        if (isToday(transactionDate)) {
            return `Hoje, ${format(transactionDate, "d 'de' MMMM", { locale: ptBR })}`;
        }
        if (isYesterday(transactionDate)) {
            return `Ontem, ${format(transactionDate, "d 'de' MMMM", { locale: ptBR })}`;
        }
        const formatted = format(transactionDate, "EEEE, d 'de' MMMM", { locale: ptBR });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }, [date]);

    const isIncome = type === 'receita';
    const totalColor = isIncome ? 'text-green-400' : 'text-red-400';

    return (
        <div className="pt-4 first:pt-0">
            <div className="flex justify-between items-baseline pb-2 border-b border-gray-700/50 mb-3">
                <h3 className="font-semibold text-white text-md">{formattedDate}</h3>
                <span className={`font-medium text-sm ${totalColor}`}>
                    {isIncome ? '+' : '-'} {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
            <div className="space-y-3">
                {transactions.map(tx => (
                    <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isDeleting={deletingId === tx.id}
                        isHighlighted={tx.id === highlightedTxId}
                    />
                ))}
            </div>
        </div>
    );
};


const TransactionsScreen: React.FC = () => {
    const { transactions, categoryMap, categories, addTransaction, deleteTransactions } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TransactionType>('despesa');
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionEntry | null>(null);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [scannedData, setScannedData] = useState<Partial<TransactionEntry> | null>(null);
    const [isReceiptDetailsModalOpen, setIsReceiptDetailsModalOpen] = useState(false);
    const [scannedReceiptData, setScannedReceiptData] = useState<ScannedReceipt | null>(null);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);
    const fileImportRef = React.useRef<HTMLInputElement>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<TransactionEntry | null>(null);
    const [deletingMode, setDeletingMode] = useState<'one' | 'future' | 'all' | null>(null);

    // State for import duplicate check
    const [transactionsToImportForConfirmation, setTransactionsToImportForConfirmation] = useState<ExtractedTransaction[]>([]);
    const [potentialImportDuplicates, setPotentialImportDuplicates] = useState<{ transactionToImport: ExtractedTransaction, existingDuplicate: TransactionEntry }[]>([]);
    const [isImportDuplicateModalOpen, setImportDuplicateModalOpen] = useState(false);

    const handleDeleteRequest = (tx: TransactionEntry) => {
        setTransactionToDelete(tx);
    };

    const handleConfirmDelete = async (mode: 'one' | 'future' | 'all') => {
        if (!transactionToDelete) return;

        setDeletingId(transactionToDelete.id);
        setDeletingMode(mode);
        try {
            await deleteTransactions(transactionToDelete, mode);
        } catch (error) {
            console.error("Error deleting transaction(s):", error);
            alert("Ocorreu um erro ao excluir a(s) transação(ões).");
        } finally {
            setTransactionToDelete(null);
            setDeletingId(null);
            setDeletingMode(null);
        }
    };

    const handlePreviousMonth = () => {
        setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => addMonths(prev, 1));
    };

    const isCurrentOrFutureMonth = useMemo(() => {
        const today = new Date();
        const currentMonthStart = startOfMonth(currentDate);
        const todayMonthStart = startOfMonth(today);
        return currentMonthStart >= todayMonthStart;
    }, [currentDate]);

    const formattedMonth = useMemo(() => {
        const formatted = format(currentDate, 'MMMM \'de\' yyyy', { locale: ptBR });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }, [currentDate]);

    useEffect(() => {
        if (highlightedTxId) {
            const timer = setTimeout(() => {
                setHighlightedTxId(null);
            }, 1500); // Should match animation duration
            return () => clearTimeout(timer);
        }
    }, [highlightedTxId]);

    const baseFilteredTransactions = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        return transactions
            .filter(t => {
                const transactionDate = parseISO(t.date);
                const isInMonth = transactionDate >= start && transactionDate <= end;
                if (!isInMonth) return false;

                const category = categoryMap.get(t.categoryId);
                const matchesSearch = (
                    t.description.toLowerCase().includes(lowercasedFilter) ||
                    (t.merchant && t.merchant.toLowerCase().includes(lowercasedFilter)) ||
                    (category && category.name.toLowerCase().includes(lowercasedFilter))
                );
                return matchesSearch;
            })
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [transactions, searchTerm, categoryMap, currentDate]);

    const filteredExpenses = useMemo(() => {
        return baseFilteredTransactions.filter(t => t.type === 'despesa');
    }, [baseFilteredTransactions]);

    const filteredIncomes = useMemo(() => {
        return baseFilteredTransactions.filter(t => t.type === 'receita');
    }, [baseFilteredTransactions]);

    const groupTransactionsByDate = (transactions: TransactionEntry[]) => {
        if (!transactions.length) {
            return [];
        }
        
        const groups: { [key: string]: { transactions: TransactionEntry[], total: number } } = {};

        transactions.forEach(tx => {
            const dateKey = format(parseISO(tx.date), 'yyyy-MM-dd');
            if (!groups[dateKey]) {
                groups[dateKey] = { transactions: [], total: 0 };
            }
            groups[dateKey].transactions.push(tx);
            groups[dateKey].total += tx.amount;
        });

        return Object.entries(groups).map(([date, groupData]) => ({
            date: date,
            ...groupData
        }));
    };

    const groupedExpenses = useMemo(() => groupTransactionsByDate(filteredExpenses), [filteredExpenses]);
    const groupedIncomes = useMemo(() => groupTransactionsByDate(filteredIncomes), [filteredIncomes]);


    const handleEditTransaction = (tx: TransactionEntry) => {
        setEditingTransaction(tx);
    };
    
    const handleCloseEditModal = () => {
        setEditingTransaction(null);
    };

    const handleReceiptProcessed = (data: ScannedReceipt) => {
        setScannedReceiptData(data);
        setIsReceiptDetailsModalOpen(true);
    };

    const handleTextParsed = (data: Partial<TransactionEntry>) => {
        setScannedData(data);
        setAddModalOpen(true);
    };

    const handleCreateTransactionFromReceipt = () => {
        if (!scannedReceiptData) return;

        const categorySuggestionLower = scannedReceiptData.categorySuggestion.toLowerCase();
        const suggestedCategory = categories.find(c => c.name.toLowerCase() === categorySuggestionLower && c.type === 'despesa');

        const prefillData: Partial<TransactionEntry> = {
            amount: scannedReceiptData.total,
            description: scannedReceiptData.merchant,
            date: new Date(`${scannedReceiptData.date}T00:00:00`).toISOString(),
            type: 'despesa',
            categoryId: suggestedCategory?.id,
        };
        
        setScannedData(prefillData);
        setIsReceiptDetailsModalOpen(false);
        setAddModalOpen(true);
    };

    const handleOpenAddModal = () => {
        setScannedData(null); // Clear any previous scanned data
        setAddModalOpen(true);
    }

    const handleCloseAddModal = () => {
        setAddModalOpen(false);
        setScannedData(null); // Clear data on close
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/plain' && file.type !== 'application/pdf') {
            alert('Por favor, carregue apenas arquivos de texto (.txt) ou PDF (.pdf).');
            return;
        }

        setIsImporting(true);
        try {
            let fileInput: string | { data: string; mimeType: string };

            if (file.type === 'application/pdf') {
                const base64String = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
                fileInput = { data: base64String, mimeType: file.type };
            } else { // text/plain
                fileInput = await file.text();
            }
            
            const categoriesForAI = categories.map(c => ({ id: c.id, name: c.name, type: c.type }));
            const results = await extractTransactionsFromFile(fileInput, categoriesForAI);
            setExtractedTransactions(results);
            setReviewModalOpen(true);
        } catch (error) {
            console.error("Error extracting from file:", error);
            alert('Ocorreu um erro ao processar o arquivo. Verifique o console para mais detalhes.');
        } finally {
            setIsImporting(false);
            if (event.target) {
                event.target.value = ''; // Allow re-selecting the same file
            }
        }
    };
    
    const batchAddTransactions = useCallback(async (transactionsToAdd: ExtractedTransaction[]) => {
        if (transactionsToAdd.length === 0) {
            alert("Nenhuma transação nova para importar.");
            return;
        }
        setIsImporting(true);
        try {
            const promises = transactionsToAdd.map(tx => 
                addTransaction({
                    description: tx.description,
                    amount: tx.amount,
                    date: new Date(`${tx.date}T00:00:00`).toISOString(),
                    type: tx.type,
                    categoryId: tx.categoryId,
                })
            );
            await Promise.all(promises);
            setExtractedTransactions([]);
        } catch (error) {
            console.error("Error batch adding transactions:", error);
            alert("Ocorreu um erro ao salvar as transações importadas.");
        } finally {
            setIsImporting(false);
        }
    }, [addTransaction]);


    const handleConfirmImport = async (selectedTxs: ExtractedTransaction[]) => {
        setIsImporting(true);

        const tenDaysAgo = subDays(new Date(), 10);
        const recentTransactions = transactions.filter(t => parseISO(t.date) >= tenDaysAgo);
    
        const duplicatesFound: { transactionToImport: ExtractedTransaction, existingDuplicate: TransactionEntry }[] = [];
        const nonDuplicates: ExtractedTransaction[] = [];
    
        for (const tx of selectedTxs) {
            const transactionData: Omit<TransactionEntry, 'id'> = {
                ...tx,
                date: new Date(`${tx.date}T00:00:00`).toISOString(),
            };
    
            const duplicateId = await findPotentialDuplicateTransaction(transactionData, recentTransactions);
            const foundDuplicate = duplicateId ? transactions.find(t => t.id === duplicateId) : undefined;
    
            if (foundDuplicate) {
                duplicatesFound.push({ transactionToImport: tx, existingDuplicate: foundDuplicate });
            } else {
                nonDuplicates.push(tx);
            }
        }
    
        setReviewModalOpen(false);
    
        if (duplicatesFound.length > 0) {
            setPotentialImportDuplicates(duplicatesFound);
            setTransactionsToImportForConfirmation(selectedTxs); // Store all selected
            setImportDuplicateModalOpen(true);
            setIsImporting(false); // Stop loading, wait for user decision
        } else {
            await batchAddTransactions(selectedTxs);
            setIsImporting(false);
        }
    };

    const handleTransactionSuccess = (id: string) => {
        setHighlightedTxId(id);
    };

    return (
        <>
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <Input
                        type="text"
                        placeholder="Buscar transações..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                </div>

                <input type="file" accept=".txt,.pdf" ref={fileImportRef} onChange={handleFileImport} className="hidden" />

                <button
                    onClick={() => fileImportRef.current?.click()}
                    disabled={isImporting}
                    className="flex-shrink-0 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Importar de arquivo de texto ou PDF"
                >
                    {isImporting ? (
                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : <FileText size={20} />}
                </button>
                
                <button
                    onClick={() => setCategoryModalOpen(true)}
                    className="flex-shrink-0 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-cyan-400 transition-colors"
                    title="Adicionar nova categoria"
                >
                    <PlusCircle size={20} />
                </button>
                
                <button
                    onClick={handleOpenAddModal}
                    className="flex-shrink-0 p-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
                    title="Adicionar nova transação"
                >
                    <Plus size={20} />
                </button>
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

            <div className="flex bg-gray-800 p-1 rounded-full">
                <button
                    onClick={() => setActiveTab('despesa')}
                    className={`flex-1 py-2 text-center font-semibold rounded-full transition-colors ${activeTab === 'despesa' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                    Despesas
                </button>
                <button
                    onClick={() => setActiveTab('receita')}
                    className={`flex-1 py-2 text-center font-semibold rounded-full transition-colors ${activeTab === 'receita' ? 'bg-cyan-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                    Receitas
                </button>
            </div>
            
            <div className="space-y-3 pb-40">
                {activeTab === 'despesa' && (
                    groupedExpenses.length > 0 ? (
                        groupedExpenses.map(group => <TransactionGroup 
                            key={group.date} 
                            date={group.date} 
                            transactions={group.transactions} 
                            total={group.total}
                            type="despesa"
                            onEdit={handleEditTransaction}
                            onDelete={handleDeleteRequest}
                            deletingId={deletingId}
                            highlightedTxId={highlightedTxId}
                        />)
                    ) : (
                        <p className="text-center text-gray-400 pt-10">Nenhuma despesa encontrada para {formattedMonth}.</p>
                    )
                )}
                 {activeTab === 'receita' && (
                    groupedIncomes.length > 0 ? (
                        groupedIncomes.map(group => <TransactionGroup 
                            key={group.date} 
                            date={group.date} 
                            transactions={group.transactions} 
                            total={group.total}
                            type="receita"
                            onEdit={handleEditTransaction}
                            onDelete={handleDeleteRequest}
                            deletingId={deletingId}
                            highlightedTxId={highlightedTxId}
                        />)
                    ) : (
                        <p className="text-center text-gray-400 pt-10">Nenhuma receita encontrada para {formattedMonth}.</p>
                    )
                )}
            </div>
            <QuickAddBar 
                onReceiptScanned={handleReceiptProcessed}
                onTextParsed={handleTextParsed}
                categories={categories}
            />
        </div>
        <CategoryFormModal isOpen={isCategoryModalOpen} onClose={() => setCategoryModalOpen(false)} />
        <TransactionFormModal 
            isOpen={!!editingTransaction} 
            onClose={handleCloseEditModal} 
            transaction={editingTransaction} 
            onSuccess={handleTransactionSuccess}
        />
        <AddTransactionModal 
            isOpen={isAddModalOpen} 
            onClose={handleCloseAddModal} 
            initialData={scannedData} 
            onSuccess={handleTransactionSuccess} 
        />
        <ReceiptDetailsModal 
            isOpen={isReceiptDetailsModalOpen}
            onClose={() => setIsReceiptDetailsModalOpen(false)}
            receiptData={scannedReceiptData}
            onCreateTransaction={handleCreateTransactionFromReceipt}
        />
        <ImportReviewModal 
            isOpen={isReviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            extractedTransactions={extractedTransactions}
            onImport={handleConfirmImport}
            isLoading={isImporting}
        />
        <ImportDuplicateReviewModal
            isOpen={isImportDuplicateModalOpen}
            onClose={() => setImportDuplicateModalOpen(false)}
            duplicates={potentialImportDuplicates}
            isLoading={isImporting}
            onConfirmImportAll={async () => {
                setImportDuplicateModalOpen(false);
                await batchAddTransactions(transactionsToImportForConfirmation);
            }}
            onConfirmImportNonDuplicates={async () => {
                const duplicateKeys = new Set(potentialImportDuplicates.map(d => `${d.transactionToImport.description}-${d.transactionToImport.amount}-${d.transactionToImport.date}`));
                const nonDuplicates = transactionsToImportForConfirmation.filter(tx => !duplicateKeys.has(`${tx.description}-${tx.amount}-${tx.date}`));
                setImportDuplicateModalOpen(false);
                await batchAddTransactions(nonDuplicates);
            }}
        />
        <Modal
            isOpen={!!transactionToDelete}
            onClose={() => setTransactionToDelete(null)}
            title="Confirmar Exclusão"
        >
            {transactionToDelete?.isRecurring ? (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Esta é uma transação recorrente. Como você deseja excluí-la?
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                        <Button variant="secondary" onClick={() => handleConfirmDelete('one')} isLoading={deletingId === transactionToDelete.id && deletingMode === 'one'}>
                            Excluir apenas esta
                        </Button>
                        <Button variant="secondary" onClick={() => handleConfirmDelete('future')} isLoading={deletingId === transactionToDelete.id && deletingMode === 'future'}>
                            Excluir esta e as futuras
                        </Button>
                        <Button variant="danger" onClick={() => handleConfirmDelete('all')} isLoading={deletingId === transactionToDelete.id && deletingMode === 'all'}>
                            Excluir toda a série
                        </Button>
                        <Button variant="secondary" onClick={() => setTransactionToDelete(null)} className="mt-4">
                            Cancelar
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Tem certeza de que deseja excluir permanentemente a transação <strong className="text-white">"{transactionToDelete?.description}"</strong>?
                    </p>
                    <p className="text-sm text-yellow-400">Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setTransactionToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={() => handleConfirmDelete('one')} isLoading={deletingId === transactionToDelete?.id}>
                            Excluir
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
        </>
    );
};

export default TransactionsScreen;
