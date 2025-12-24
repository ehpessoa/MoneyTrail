export type TransactionType = 'receita' | 'despesa';

export interface TransactionEntry {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  type: TransactionType;
  categoryId: string;
  merchant?: string;

  // Recurring fields
  isRecurring?: boolean;
  recurrenceFrequency?: 'monthly';
  recurrenceEndDate?: string | null; // ISO string, can be null for indefinite
  originalRecurrenceId?: string; // UUID to group recurring transactions
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  color: string; // Tailwind CSS color class
  type: TransactionType;
}

export interface GoalEntry {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  categoryId: string;
  deadline?: string; // ISO string
}

export interface BudgetEntry {
  id: string;
  categoryId: string;
  limit: number;
  period: 'monthly';
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  familyId: string;
}

export interface FamilyMember {
  uid:string;
  name: string;
}

export interface Family {
  id: string;
  members: FamilyMember[];
}

// FIX: Moved ExtractedTransaction to this shared types file to resolve import errors.
export interface ExtractedTransaction {
    description: string;
    amount: number;
    date: string; // YYYY-MM-DD
    categoryId: string;
    type: TransactionType;
}
