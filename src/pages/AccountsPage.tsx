import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertTriangle, Plus, RotateCcw, Trash2, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");

  // Alert Dialog States
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      toast.error("Could not fetch accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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

  const confirmDeleteAccount = async () => {
    if (deleteId === null) return;
    try {
      await deleteAccount(deleteId);
      toast.success("Account deleted");
      loadAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Could not delete account");
    } finally {
      setDeleteId(null);
    }
  };

  const confirmResetAccount = async () => {
    if (resetId === null) return;
    try {
      await deleteTransactionsByAccount(resetId);
      toast.success("All transactions deleted for this account");
    } catch (error) {
      console.error("Failed to reset account:", error);
      toast.error("Could not reset account");
    } finally {
      setResetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Your Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your connected bank accounts and balances.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Account
        </Button>
      </div>

      {/* Account Grid */}
      {accounts.length === 0 && !loading ? (
        <Card className="flex flex-col items-center justify-center p-12 bg-muted/50 border-dashed border-2">
          <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No accounts found</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            Connected accounts allow you to import and categorize your banking transactions automatically.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} variant="secondary">
            <Plus className="h-4 w-4 mr-2" />
            Create your first account
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold">{account.name}</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase">
                    {account.account_number || "No number provided"}
                  </CardDescription>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mt-2">
                   <Badge variant="outline" className="font-medium">
                    {account.currency}
                   </Badge>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 bg-muted/30 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => account.id && setResetId(account.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => account.id && setDeleteId(account.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder="e.g. Danske Bank - Salary"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
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
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account and all associated transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive hover:bg-destructive/90">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={resetId !== null} onOpenChange={(open) => !open && setResetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-warning" />
              Reset Transactions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete ALL transactions for this account, but keep the account itself. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetAccount}>
              Reset Transactions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
