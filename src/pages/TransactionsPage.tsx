import { AccountSelector } from "@/components/transactions/AccountSelector";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Card } from "@/components/ui/card";
import { getAccounts, getTransactions, type Account, type TransactionWithCategory } from "@/lib/api";
import { Receipt } from "lucide-react";
import { useEffect, useState } from "react";

export function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Load accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getAccounts();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      } catch (error) {
        console.error("Failed to load accounts:", error);
      }
    }
    loadAccounts();
  }, []);

  // Load transactions when account changes
  useEffect(() => {
    async function loadTransactions() {
      if (!selectedAccountId) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getTransactions(selectedAccountId);
        setTransactions(data);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, [selectedAccountId]);

  // Empty state - no accounts
  if (accounts.length === 0 && !loading) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No accounts</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Create an account first to see and import transactions.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account Selector */}
      <div className="flex items-center gap-4">
        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelect={setSelectedAccountId}
        />
        <div className="text-sm text-muted-foreground">
          {transactions.length} transactions
        </div>
      </div>

      {/* Transaction Table */}
      <TransactionTable
        transactions={transactions}
        loading={loading}
      />
    </div>
  );
}
