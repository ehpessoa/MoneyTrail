import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { GoalEntry } from '../../types';
import { format, parseISO } from 'date-fns';

interface GoalFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    goalToEdit?: GoalEntry | null;
}

const GoalFormModal: React.FC<GoalFormModalProps> = ({ isOpen, onClose, goalToEdit }) => {
    const { categories, addGoal, updateGoal, deleteGoal } = useApp();

    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [deadline, setDeadline] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    
    const isEditing = !!goalToEdit;

    const resetForm = () => {
        setName('');
        setTargetAmount('');
        setCategoryId('');
        setDeadline('');
        setError('');
        setIsLoading(false);
        setIsDeleting(false);
    };

    useEffect(() => {
        if (isOpen) {
            if (goalToEdit) {
                setName(goalToEdit.name);
                setTargetAmount(String(goalToEdit.targetAmount));
                setCategoryId(goalToEdit.categoryId);
                setDeadline(goalToEdit.deadline ? format(parseISO(goalToEdit.deadline), 'yyyy-MM-dd') : '');
            } else {
                resetForm();
            }
        } else {
            setTimeout(resetForm, 300);
        }
    }, [isOpen, goalToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(targetAmount);

        if (!name.trim() || !categoryId) {
            setError('Por favor, preencha o nome e selecione uma categoria.');
            return;
        }
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Por favor, insira um valor alvo válido.');
            return;
        }

        setError('');
        setIsLoading(true);
        try {
            if (isEditing) {
                await updateGoal(goalToEdit.id, {
                    name,
                    targetAmount: numericAmount,
                    categoryId,
                    deadline: deadline || undefined,
                });
            } else {
                 await addGoal({
                    name,
                    targetAmount: numericAmount,
                    categoryId,
                    deadline: deadline || undefined,
                });
            }
            onClose();
        } catch (err) {
            console.error('Failed to save goal:', err);
            setError('Não foi possível salvar a meta. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (window.confirm(`Tem certeza que deseja excluir a meta "${goalToEdit.name}"?`)) {
            setIsDeleting(true);
            try {
                await deleteGoal(goalToEdit.id);
                onClose();
            } catch(err) {
                setError('Falha ao excluir a meta.');
                console.error('Failed to delete goal:', err);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar Meta" : "Nova Meta Financeira"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Nome da Meta"
                    id="goal-name"
                    value={name}
                    onChange={(e) => setName((e.target as HTMLInputElement).value)}
                    placeholder="Ex: Economizar para viagem"
                    required
                />
                <Input
                    label="Valor Alvo"
                    id="goal-target-amount"
                    type="number"
                    step="0.01"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount((e.target as HTMLInputElement).value)}
                    placeholder="R$ 1.000,00"
                    required
                />
                <Input
                    as="select"
                    label="Categoria Vinculada"
                    id="goal-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId((e.target as HTMLSelectElement).value)}
                    required
                >
                    <option value="" disabled>Selecione uma categoria...</option>
                    <optgroup label="Receitas">
                        {categories.filter(c => c.type === 'receita').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Despesas">
                        {categories.filter(c => c.type === 'despesa').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </optgroup>
                </Input>
                <Input
                    label="Data de Vencimento (Opcional)"
                    id="goal-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline((e.target as HTMLInputElement).value)}
                />
                
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                     {isEditing && (
                        <Button type="button" variant="danger" onClick={handleDelete} isLoading={isDeleting} className="w-full sm:w-auto">
                            Excluir
                        </Button>
                    )}
                    <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
                        {isEditing ? 'Salvar Alterações' : 'Criar Meta'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default GoalFormModal;