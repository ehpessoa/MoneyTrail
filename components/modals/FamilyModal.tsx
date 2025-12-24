import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { User, Check, Share2, SquareArrowUp, PlusSquare, MoreVertical, Download } from 'lucide-react';
import Button from '../ui/Button';

interface FamilyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'ios' | 'android';

const FamilyModal: React.FC<FamilyModalProps> = ({ isOpen, onClose }) => {
    const { family, userProfile } = useApp();
    const [feedbackText, setFeedbackText] = useState('Compartilhar');
    const [activeTab, setActiveTab] = useState<Tab>('ios');

    const handleShare = async () => {
        if (!userProfile?.familyId) return;

        const shareText = `Olá! Use este código para entrar na minha família no MoneyTrail: ${userProfile.familyId}\n\nLink do app: ${window.location.href}\n\nDica: Para acesso rápido, adicione o app à sua tela inicial!\n- iOS (Safari): Compartilhar > "Adicionar à Tela de Início"\n- Android (Chrome): Menu (⋮) > "Instalar aplicativo"`;
        const shareData = {
            title: 'Convite para Família MoneyTrail',
            text: shareText,
        };

        // --- First, try the Web Share API ---
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return; // Success, we're done.
            } catch (error) {
                // Log the error, but fall through to clipboard methods
                console.error('Erro ao usar Web Share API:', error);
            }
        }

        // --- Fallback 1: Clipboard API ---
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(shareText);
                setFeedbackText('Copiado!');
                setTimeout(() => setFeedbackText('Compartilhar'), 2000);
                return; // Success, we're done.
            } catch (error) {
                // Log the error, but fall through to the next fallback
                console.error('Erro ao usar Clipboard API:', error);
            }
        }

        // --- Fallback 2: document.execCommand (deprecated) ---
        try {
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            textArea.style.position = 'fixed'; // Prevent scrolling to bottom
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            setFeedbackText('Copiado!');
            setTimeout(() => setFeedbackText('Compartilhar'), 2000);
        } catch (error) {
            console.error('Erro ao usar execCommand:', error);
            // If all else fails, inform the user.
            alert('Não foi possível copiar ou compartilhar automaticamente. Por favor, copie o código manualmente.');
            setFeedbackText('Falhou!');
            setTimeout(() => setFeedbackText('Compartilhar'), 2000);
        }
    };

    const InstructionStep: React.FC<{ icon: React.ElementType, step: number, text: React.ReactNode }> = ({ icon: Icon, step, text }) => (
        <li className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-700 text-cyan-400 rounded-full flex items-center justify-center font-bold text-sm">
                {step}
            </div>
            <div className="flex-grow pt-1">
                <p className="text-gray-300">
                    {text}
                </p>
            </div>
        </li>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Minha Família">
            <div className="space-y-8">
                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Membros</h3>
                    <ul className="space-y-3">
                        {family?.members.map(member => (
                            <li key={member.uid} className="flex items-center p-3 bg-gray-700/60 rounded-lg">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-900/50 mr-3 flex-shrink-0">
                                    <User className="w-5 h-5 text-cyan-400" />
                                </div>
                                <span className="text-white font-medium">{member.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Convidar para a Família</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Compartilhe o código e o link do app para que outras pessoas possam entrar na sua família.
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg border border-dashed border-gray-600">
                        <span className="flex-grow text-cyan-300 font-mono text-center tracking-widest">{userProfile?.familyId}</span>
                        <Button variant="secondary" size="sm" onClick={handleShare} className="w-36">
                            {feedbackText === 'Copiado!' ? <Check size={16} className="mr-1" /> : <Share2 size={16} className="mr-1" />}
                            {feedbackText}
                        </Button>
                    </div>
                </div>

                <div>
                     <h3 className="text-lg font-semibold text-gray-300 mb-3">Acesso Rápido (App na Tela de Início)</h3>
                     <p className="text-gray-400 text-sm mb-4">
                        Adicione o MoneyTrail à sua tela inicial para acessar como um aplicativo nativo.
                    </p>
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <div className="flex border-b border-gray-700 mb-4">
                             <button
                                onClick={() => setActiveTab('ios')}
                                className={`flex-1 py-2 text-center text-sm font-semibold transition-colors ${activeTab === 'ios' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                iOS (Safari)
                            </button>
                             <button
                                onClick={() => setActiveTab('android')}
                                className={`flex-1 py-2 text-center text-sm font-semibold transition-colors ${activeTab === 'android' ? 'text-gray-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                            >
                                Android (Chrome)
                            </button>
                        </div>
                        
                        {activeTab === 'ios' && (
                            <ol className="space-y-4">
                               <InstructionStep 
                                    step={1} 
                                    text={<>Toque no ícone de <strong>Compartilhar</strong> <SquareArrowUp className="inline-block h-4 w-4 mx-1" /> na barra de navegação.</>}
                                />
                                <InstructionStep 
                                    step={2} 
                                    text={<>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> <PlusSquare className="inline-block h-4 w-4 mx-1" />.</>}
                                />
                                <InstructionStep 
                                    step={3} 
                                    text={<>Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito.</>}
                                />
                            </ol>
                        )}

                        {activeTab === 'android' && (
                            <ol className="space-y-4">
                                <InstructionStep 
                                    step={1} 
                                    text={<>Toque no menu de três pontos <MoreVertical className="inline-block h-4 w-4 mx-1" /> no canto superior direito.</>}
                                />
                                <InstructionStep 
                                    step={2} 
                                    text={<>Selecione <strong>"Instalar aplicativo"</strong> <Download className="inline-block h-4 w-4 mx-1" /> ou <strong>"Adicionar à tela inicial"</strong>.</>}
                                />
                                <InstructionStep 
                                    step={3} 
                                    text={<>Siga as instruções na tela para confirmar a instalação.</>}
                                />
                            </ol>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default FamilyModal;