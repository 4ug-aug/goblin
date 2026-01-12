import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAccount, deleteAccount, deleteTransactionsByAccount, getAccounts, type Account } from "@/lib/api";
import { Plus, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      toast.error("Could not fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;

    try {
      await createAccount({
        name: newAccountName.trim(),
        account_number: newAccountNumber.trim() || null,
        currency: "DKK",
      });
      toast.success("Account created");
      setCreateDialogOpen(false);
      setNewAccountName("");
      setNewAccountNumber("");
      loadAccounts();
    } catch (error) {
      console.error("Failed to create account:", error);
      toast.error("Could not create account");
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm("Are you sure you want to delete this account? All transactions will also be deleted.")) {
      return;
    }

    try {
      await deleteAccount(id);
      toast.success("Account deleted");
      loadAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Could not delete account");
    }
  };

  const handleResetAccount = async (id: number) => {
    if (!confirm("Are you sure you want to delete ALL transactions for this account? This cannot be undone.")) {
      return;
    }

    try {
      await deleteTransactionsByAccount(id);
      toast.success("All transactions deleted for this account");
    } catch (error) {
      console.error("Failed to reset account:", error);
      toast.error("Could not reset account");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Your Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your bank accounts
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Account
        </Button>
      </div>

      {/* Account Grid */}
      {accounts.length === 0 && !loading ? (
        <Card className="flex flex-col items-center justify-center">
          <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No accounts</h3>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            Create your first account to start importing transactions.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  {account.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {account.account_number && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {account.account_number}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {account.currency}
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => account.id && handleResetAccount(account.id)}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => account.id && handleDeleteAccount(account.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder="e.g. Danske Bank - Salary"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Account Number (optional)</Label>
              <Input
                id="number"
                placeholder="e.g. 1234-56789012"
                value={newAccountNumber}
                onChange={(e) => setNewAccountNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={!newAccountName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
