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

export async function updateBatchCategories(
  transactionIds: number[],
  categoryId: number | null
): Promise<number> {
  return invoke<number>("update_batch_categories", {
    transactionIds,
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

// ===== Subscription Types =====

export interface Subscription {
  id: number | null;
  account_id: number;
  payee_pattern: string;
  amount: number;
  frequency: string;
  last_charge_date: string | null;
  next_charge_date: string | null;
  is_active: boolean;
  category_id: number | null;
  confidence: number;
  transaction_ids: number[];
}

// ===== Subscription API =====

export async function detectSubscriptions(accountId: number): Promise<Subscription[]> {
  return invoke<Subscription[]>("detect_subscriptions", { accountId });
}

export async function getSubscriptions(accountId: number): Promise<Subscription[]> {
  return invoke<Subscription[]>("get_subscriptions", { accountId });
}

export async function saveSubscription(subscription: Subscription): Promise<number> {
  return invoke<number>("save_subscription", { subscription });
}

export async function dismissSubscription(id: number): Promise<number> {
  return invoke<number>("dismiss_subscription", { id });
}

// ===== Budget API =====

export interface Budget {
  id: number | null;
  name: string;
  color: string;
  icon: string | null;
}

export interface BudgetAllocation {
  id: number | null;
  budget_id: number;
  month: string;
  allocated_amount: number;
}

export interface BudgetWithSpending {
  budget: Budget;
  category_ids: number[];
  allocated_amount: number;
  spent_amount: number;
}

export async function createBudget(budget: Omit<Budget, "id">): Promise<number> {
  return invoke<number>("create_budget", { budget });
}

export async function getBudgets(): Promise<Budget[]> {
  return invoke<Budget[]>("get_budgets");
}

export async function updateBudget(budget: Budget): Promise<number> {
  return invoke<number>("update_budget", { budget });
}

export async function deleteBudget(id: number): Promise<number> {
  return invoke<number>("delete_budget", { id });
}

export async function setBudgetCategories(budgetId: number, categoryIds: number[]): Promise<void> {
  return invoke<void>("set_budget_categories", { budgetId, categoryIds });
}

export async function getBudgetCategories(budgetId: number): Promise<number[]> {
  return invoke<number[]>("get_budget_categories", { budgetId });
}

export async function setBudgetAllocation(budgetId: number, month: string, amount: number): Promise<void> {
  return invoke<void>("set_budget_allocation", { budgetId, month, amount });
}

export async function getBudgetsWithSpending(month: string): Promise<BudgetWithSpending[]> {
  return invoke<BudgetWithSpending[]>("get_budgets_with_spending", { month });
}

// ===== Income Stream API =====

export interface IncomeStream {
  id: number | null;
  name: string;
  expected_amount: number;
  frequency: string;
  category_id: number | null;
  is_active: boolean;
}

export async function createIncomeStream(stream: Omit<IncomeStream, "id">): Promise<number> {
  return invoke<number>("create_income_stream", { stream });
}

export async function getIncomeStreams(): Promise<IncomeStream[]> {
  return invoke<IncomeStream[]>("get_income_streams");
}

export async function updateIncomeStream(stream: IncomeStream): Promise<number> {
  return invoke<number>("update_income_stream", { stream });
}

export async function deleteIncomeStream(id: number): Promise<number> {
  return invoke<number>("delete_income_stream", { id });
}

