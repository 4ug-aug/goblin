import { invoke } from "@tauri-apps/api/core";

// ===== Types =====

export interface Account {
  id: number | null;
  name: string;
  account_number: string | null;
  currency: string;
}

export interface Category {
  id: number | null;
  name: string;
  parent_id: number | null;
}

export interface Transaction {
  id: number | null;
  account_id: number;
  category_id: number | null;
  date: string;
  payee: string;
  amount: number;
  balance_snapshot: number | null;
  status: string | null;
  is_reconciled: boolean;
  import_hash: string | null;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  parent_category_name: string | null;
}

export interface ImportResult {
  total_rows: number;
  imported: number;
  skipped_duplicates: number;
}

export type SpendingByCategory = [string, number][];

// ===== Account API =====

export async function createAccount(account: Omit<Account, "id">): Promise<number> {
  return invoke<number>("create_account", { account });
}

export async function getAccounts(): Promise<Account[]> {
  return invoke<Account[]>("get_accounts");
}

export async function getAccount(id: number): Promise<Account | null> {
  return invoke<Account | null>("get_account", { id });
}

export async function updateAccount(account: Account): Promise<number> {
  return invoke<number>("update_account", { account });
}

export async function deleteAccount(id: number): Promise<number> {
  return invoke<number>("delete_account", { id });
}

// ===== Category API =====

export async function createCategory(category: Omit<Category, "id">): Promise<number> {
  return invoke<number>("create_category", { category });
}

export async function getCategories(): Promise<Category[]> {
  return invoke<Category[]>("get_categories");
}

export async function getTopLevelCategories(): Promise<Category[]> {
  return invoke<Category[]>("get_top_level_categories");
}

export async function getSubcategories(parentId: number): Promise<Category[]> {
  return invoke<Category[]>("get_subcategories", { parentId });
}

export async function deleteCategory(id: number): Promise<number> {
  return invoke<number>("delete_category", { id });
}

// ===== Transaction API =====

export async function getTransactions(
  accountId: number,
  limit?: number
): Promise<TransactionWithCategory[]> {
  return invoke<TransactionWithCategory[]>("get_transactions", {
    accountId,
    limit: limit ?? null,
  });
}

export async function getTransactionsByDateRange(
  accountId: number,
  startDate: string,
  endDate: string
): Promise<TransactionWithCategory[]> {
  return invoke<TransactionWithCategory[]>("get_transactions_by_date_range", {
    accountId,
    startDate,
    endDate,
  });
}

export async function getSpendingByCategory(
  accountId: number,
  startDate: string,
  endDate: string
): Promise<SpendingByCategory> {
  return invoke<SpendingByCategory>("get_spending_by_category", {
    accountId,
    startDate,
    endDate,
  });
}

export async function updateTransactionCategory(
  transactionId: number,
  categoryId: number | null
): Promise<number> {
  return invoke<number>("update_transaction_category", {
    transactionId,
    categoryId,
  });
}

export async function deleteTransaction(id: number): Promise<number> {
  return invoke<number>("delete_transaction", { id });
}

export async function deleteTransactionsByAccount(accountId: number): Promise<number> {
  return invoke<number>("delete_transactions_by_account", { accountId });
}

// ===== Import API =====

export async function importCsvFile(
  csvContent: string,
  accountId: number,
  filename: string
): Promise<ImportResult> {
  return invoke<ImportResult>("import_csv_file", {
    csvContent,
    accountId,
    filename,
  });
}

/**
 * Import CSV from raw bytes - handles encoding detection automatically
 * Use this for files that may not be UTF-8 encoded (e.g., Danish bank exports)
 */
export async function importCsvBytes(
  bytes: number[],
  accountId: number,
  filename: string
): Promise<ImportResult> {
  return invoke<ImportResult>("import_csv_bytes", {
    bytes,
    accountId,
    filename,
  });
}
