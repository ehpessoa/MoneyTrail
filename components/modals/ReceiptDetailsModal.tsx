import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ScannedReceipt } from '../../services/geminiService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Receipt, Calendar, Hash, ShoppingCart, Landmark } from 'lucide-react';

interface ReceiptDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    receiptData: ScannedReceipt | null;
    onCreateTransaction: () => void;
}

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: string | React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start">
        <Icon className="w-5 h-5 mr-3 text-cyan-400 mt-1 flex-shrink-0" />
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="font-semibold text-white">{value}</p>
        </div>
    </div>
);

const ReceiptDetailsModal: React.FC<ReceiptDetailsModalProps> = ({ isOpen, onClose, receiptData, onCreateTransaction }) => {
    if (!receiptData) return null;

    const currencyFormatter = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Ensure date is valid before parsing
    const formattedDate = () => {
        try {
            // Gemini returns YYYY-MM-DD, which parseISO handles correctly.
            // Appending T00:00:00 ensures it's parsed as local time, avoiding timezone issues.
            return format(parseISO(`${receiptData.date}T00:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        } catch (error) {
            console.error("Invalid date format from receipt:", receiptData.date);
            return "Data inválida";
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Recibo">
            <div className="space-y-6">
                <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                    <DetailRow icon={Landmark} label="Estabelecimento" value={receiptData.merchant} />
                    <DetailRow 
                        icon={Calendar} 
                        label="Data" 
                        value={formattedDate()}
                    />
                    <DetailRow icon={Receipt} label="Total" value={<span className="text-2xl font-bold text-green-400">{currencyFormatter(receiptData.total)}</span>} />
                     {receiptData.tax > 0 && (
                        <DetailRow icon={Hash} label="Impostos" value={currencyFormatter(receiptData.tax)} />
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2 text-cyan-400" />
                        Itens Comprados
                    </h3>
                    {receiptData.items && receiptData.items.length > 0 ? (
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {receiptData.items.map((item, index) => (
                                <li key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
                                    <span className="text-white flex-1 mr-2 truncate">{item.name}</span>
                                    <span className="font-mono text-gray-300">{currencyFormatter(item.price)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-400 text-sm">Nenhum item individual foi identificado.</p>
                    )}
                </div>
                
                <div className="pt-4">
                    <Button onClick={onCreateTransaction} className="w-full">
                        Criar Lançamento
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ReceiptDetailsModal;
