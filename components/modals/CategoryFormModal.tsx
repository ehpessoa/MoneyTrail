import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { TransactionType, CategoryItem } from '../../types';
import DynamicIcon from '../ui/DynamicIcon';
import { Trash2, Pencil } from 'lucide-react';

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const icons = [
    'Landmark', 'Utensils', 'Bus', 'Home', 'Ticket', 'Pizza', 'Plane', 'Heart',
    'Gift', 'Book', 'Film', 'Wallet', 'ShoppingBag', 'Car', 'GraduationCap',
    'HeartPulse', 'PawPrint', 'Receipt', 'CircleDollarSign'
];

const colors = [
    'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400',
    'text-cyan-400', 'text-blue-400', 'text-purple-400', 'text-pink-400',
];

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose }) => {
    const { addCategory, categories, deleteCategory, updateCategory } = useApp();
    const [name, setName] = useState('');
    const [type, setType] = useState<TransactionType>('despesa');
    const [selectedIcon, setSelectedIcon] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

    const formRef = useRef<HTMLFormElement>(null);

    const resetForm = () => {
        setName('');
        setType('despesa');
        setSelectedIcon('');
        setSelectedColor('');
        setError('');
        setIsLoading(false);
        setDeletingId(null);
        setEditingCategory(null);
    };

    useEffect(() => {
        if (!isOpen) {
            setTimeout(resetForm, 300);
        }
    }, [isOpen]);

    const handleStartEditing = (category: CategoryItem) => {
        setEditingCategory(category);
        setName(category.name);
        setSelectedIcon(category.icon);
        setSelectedColor(category.color);
        setType(category.type);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name || !selectedIcon || !selectedColor) {
            setError('Por favor, preencha o nome e selecione um ícone e uma cor.');
            return;
        }

        const nameExists = categories.some(cat => 
            cat.name.toLowerCase() === name.trim().toLowerCase() && 
            cat.type === type &&
            cat.id !== editingCategory?.id
        );
        if (nameExists) {
            setError(`A categoria "${name.trim()}" já existe para este tipo.`);
            return;
        }
        
        setIsLoading(true);
        try {
            if (editingCategory) {
                const dataToUpdate = {
                    name: name.trim(),
                    icon: selectedIcon,
                    color: selectedColor,
                    // O 'tipo' da categoria é omitido intencionalmente, pois não deve ser alterado.
                };
                await updateCategory(editingCategory.id, dataToUpdate);
                onClose(); // Fecha o modal após a atualização bem-sucedida
            } else {
                await addCategory({
                    name: name.trim(),
                    type,
                    icon: selectedIcon,
                    color: selectedColor,
                });
                onClose();
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message || 'Falha ao salvar categoria.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        if (window.confirm(`Tem certeza de que deseja excluir a categoria "${categoryName}"? Esta ação não pode ser desfeita.`)) {
            setDeletingId(categoryId);
            setError('');
            try {
                await deleteCategory(categoryId);
            } catch (err)
 {
                console.error(err);
                setError((err as Error).message || 'Falha ao excluir a categoria.');
            } finally {
                setDeletingId(null);
            }
        }
    };

    const existingCategories = useMemo(() => {
        return categories
            .filter(c => c.type === type)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [categories, type]);

    const previewBgColor = 'bg-gray-700';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingCategory ? "Editar Categoria" : "Nova Categoria"}>
            <p className="text-center text-gray-400 text-sm -mt-2 mb-6">
                Crie e personalize categorias para organizar suas transações.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6" ref={formRef}>
                 <div className="flex flex-col items-center justify-center space-y-3 bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Pré-visualização</p>
                    <div className="flex items-center p-3 bg-gray-800 rounded-lg space-x-4 w-full">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${previewBgColor}`}>
                            <DynamicIcon name={selectedIcon || 'CircleDollarSign'} className="text-white w-6 h-6" />
                        </div>
                        <div className="flex-grow">
                            <p className="font-semibold text-white truncate">{name || "Nome da Categoria"}</p>
                            <p className="text-sm text-gray-400">{type === 'despesa' ? 'Despesa' : 'Receita'}</p>
                        </div>
                        <div className="text-right">
                             <p className={`font-bold text-lg ${type === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                                {type === 'receita' ? '+' : '-'} R$ 123,45
                            </p>
                            <p className="text-sm text-gray-500">Exemplo</p>
                        </div>
                    </div>
                </div>

                <Input
                    label="Nome da Categoria"
                    id="category-name"
                    value={name}
                    onChange={(e) => setName((e.target as HTMLInputElement).value)}
                    placeholder="Ex: Supermercado"
                    required
                />
                
                <Input
                    as="select"
                    label="Tipo"
                    id="category-type"
                    value={type}
                    onChange={(e) => setType((e.target as HTMLSelectElement).value as TransactionType)}
                    disabled={!!editingCategory}
                >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                </Input>

                 <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">Ícone</label>
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 bg-gray-900/50 p-3 rounded-lg max-h-40 overflow-y-auto">
                        {icons.map(iconName => {
                            const isSelected = iconName === selectedIcon;
                            return (
                                <button
                                    type="button"
                                    key={iconName}
                                    onClick={() => setSelectedIcon(iconName)}
                                    className={`flex items-center justify-center aspect-square rounded-full border-2 transition-all duration-200 ${
                                        isSelected ? 'border-cyan-500 bg-gray-700 scale-110' : 'border-transparent bg-gray-700/50 hover:bg-gray-700'
                                    }`}
                                    aria-pressed={isSelected}
                                >
                                    <DynamicIcon name={iconName} className="w-6 h-6 text-gray-300" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="block mb-2 text-sm font-medium text-gray-300">Cor</label>
                     <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="grid grid-cols-8 gap-2">
                            {colors.map(color => (
                                <button
                                    type="button"
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-full h-10 rounded-lg transition-all ${color.replace('text', 'bg')} ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''}`}
                                    aria-label={`Selecionar cor ${color}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    {editingCategory && (
                        <Button type="button" variant="secondary" onClick={resetForm} className="w-full">
                            Cancelar Edição
                        </Button>
                    )}
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        {editingCategory ? 'Salvar Alterações' : 'Salvar Categoria'}
                    </Button>
                </div>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Categorias de {type === 'despesa' ? 'Despesa' : 'Receita'} Existentes</h3>
                {existingCategories.length > 0 ? (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {existingCategories.map(cat => (
                            <li key={cat.id} className="flex items-center p-2 bg-gray-700/50 rounded-lg group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mr-3 bg-gray-700`}>
                                    <DynamicIcon name={cat.icon} className="text-white w-5 h-5" />
                                </div>
                                <span className="text-white font-medium flex-grow">{cat.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleStartEditing(cat)}
                                    className="p-1.5 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:text-cyan-400 hover:bg-gray-600 transition-all"
                                    aria-label={`Editar categoria ${cat.name}`}
                                >
                                    <Pencil size={16} />
                                </button>
                                 <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                    disabled={deletingId === cat.id}
                                    className="p-1.5 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
                                    aria-label={`Excluir categoria ${cat.name}`}
                                >
                                    {deletingId === cat.id ? (
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 text-sm py-4">Nenhuma categoria encontrada para este tipo.</p>
                )}
            </div>
        </Modal>
    );
};

export default CategoryFormModal;
