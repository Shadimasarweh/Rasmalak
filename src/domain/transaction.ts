export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: Date;
  notes?: string;
}


