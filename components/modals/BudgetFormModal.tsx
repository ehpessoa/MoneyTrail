

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { BudgetEntry } from '../../types';

interface BudgetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetToEdit?: BudgetEntry | Partial<BudgetEntry> | null;
}

const BudgetFormModal: React.FC<BudgetFormModalProps> = ({ isOpen, onClose, budgetToEdit }) => {
    const { categories, budgets, addBudget, updateBudget, deleteBudget } = useApp();

    const [limit, setLimit] = useState('');
    const [categoryId, setCategoryId] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!(budgetToEdit && 'id' in budgetToEdit && budgetToEdit.id);

    const resetForm = () => {
        setLimit('');
        setCategoryId('');
        setError('');
        setIsSaving(false);
        setIsDeleting(false);
    };

    useEffect(() => {
        if (isOpen) {
            if (budgetToEdit) {
                setLimit('limit' in budgetToEdit && budgetToEdit.limit ? String(budgetToEdit.limit) : '');
                setCategoryId(budgetToEdit.categoryId || '');
            } else {
                resetForm();
            }
        } else {
            setTimeout(resetForm, 300);
        }
    }, [isOpen, budgetToEdit]);

    const availableCategories = useMemo(() => {
        const budgetedCategoryIds = new Set(budgets.map(b => b.categoryId));
        return categories.filter(c => {
            if (c.type !== 'despesa') return false;
            // If editing or adding for a pre-selected category, it must be in the list
            if (budgetToEdit && c.id === budgetToEdit.categoryId) return true;
            // Otherwise, it must not already have a budget
            return !budgetedCategoryIds.has(c.id);
        });
    }, [categories, budgets, budgetToEdit]);

    const categoryName = useMemo(() => {
        if (categoryId) {
            return categories.find(c => c.id === categoryId)?.name;
        }
        return 'desconhecida';
    }, [categoryId, categories]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericLimit = parseFloat(limit);

        if (!categoryId) {
            setError('Por favor, selecione uma categoria.');
            return;
        }
        if (isNaN(numericLimit) || numericLimit <= 0) {
            setError('Por favor, insira um limite válido.');
            return;
        }

        setError('');
        setIsSaving(true);
        try {
            if (isEditing && budgetToEdit && 'id' in budgetToEdit) {
                await updateBudget(budgetToEdit.id!, { limit: numericLimit, categoryId });
            } else {
                await addBudget({ limit: numericLimit, categoryId });
            }
            onClose();
        } catch (err) {
            console.error('Failed to save budget:', err);
            setError('Não foi possível salvar o orçamento. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (!isEditing || !budgetToEdit || !('id' in budgetToEdit)) return;
        
        const confirmMessage = `Tem certeza de que deseja excluir o orçamento para a categoria "${categoryName}"?`;

        if (window.confirm(confirmMessage)) {
            setIsDeleting(true);
            try {
                await deleteBudget(budgetToEdit.id!);
                onClose();
            } catch (err) {
                 console.error('Failed to delete budget:', err);
                 setError('Falha ao excluir o orçamento.');
            } finally {
                 setIsDeleting(false);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar Orçamento" : "Novo Orçamento"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    as="select"
                    label="Categoria"
                    id="budget-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId((e.target as HTMLSelectElement).value)}
                    required
                    disabled={!!budgetToEdit?.categoryId}
                >
                    <option value="" disabled>Selecione uma categoria de despesa</option>
                    {availableCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </Input>

                <Input
                    label="Limite Mensal"
                    id="budget-limit"
                    type="number"
                    step="0.01"
                    value={limit}
                    onChange={(e) => setLimit((e.target as HTMLInputElement).value)}
                    placeholder="R$ 500,00"
                    required
                />
                
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                     {isEditing && (
                        <Button type="button" variant="danger" onClick={handleDelete} isLoading={isDeleting} className="w-full">
                            Excluir
                        </Button>
                    )}
                    <Button type="submit" variant="primary" isLoading={isSaving} className="w-full">
                        {isEditing ? "Salvar Alterações" : "Criar Orçamento"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default BudgetFormModal;