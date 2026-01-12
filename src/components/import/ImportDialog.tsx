import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccounts, importCsvBytes, type Account, type ImportResult } from "@/lib/api";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { AlertCircle, Check, FileUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "select" | "importing" | "result";

export function ImportDialog({ open: isOpen, onOpenChange }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("select");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; bytes: number[] } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load accounts when dialog opens
  useEffect(() => {
    if (isOpen) {
      getAccounts().then((data) => {
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].id);
        }
      });
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setSelectedFile(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSelectFile = useCallback(async () => {
    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });

      if (filePath && typeof filePath === "string") {
        // Read as binary to preserve original encoding
        const data = await readFile(filePath);
        const bytes = Array.from(data);
        const name = filePath.split("/").pop() ?? "file.csv";
        setSelectedFile({ name, bytes });
        setError(null);
      }
    } catch (err) {
      console.error("Failed to select file:", err);
      toast.error("Could not read file");
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !selectedAccountId) return;

    setStep("importing");
    setError(null);

    try {
      // Use binary import to handle encoding properly
      const importResult = await importCsvBytes(
        selectedFile.bytes,
        selectedAccountId,
        selectedFile.name
      );
      setResult(importResult);
      setStep("result");

      if (importResult.imported > 0) {
        toast.success(`${importResult.imported} transactions imported`);
      }
    } catch (err) {
      console.error("Import failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStep("select");
      toast.error("Import failed: " + errorMessage);
    }
  }, [selectedFile, selectedAccountId]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import transactions</DialogTitle>
          <DialogDescription>
            Import transactions from a CSV file from your bank.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4 py-4">
            {/* Account Selector */}
            <div className="space-y-2">
              <Label>Account</Label>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You must first create an account under "Accounts".
                </p>
              ) : (
                <Select
                  value={selectedAccountId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedAccountId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id?.toString() ?? ""}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* File Selector */}
            <div className="space-y-2">
              <Label>CSV file</Label>
              <div
                onClick={handleSelectFile}
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
              >
                {selectedFile ? (
                  <>
                    <Check className="h-8 w-8 text-income mb-2" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.bytes.length / 1024).toFixed(1)} KB • Click to choose a different file
                    </p>
                  </>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to choose a CSV file
                    </p>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="break-all">{error}</span>
              </div>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Importing...</p>
            <Progress className="w-full mt-4" value={50} />
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Check className="h-12 w-12 text-income" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Import completed</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium text-foreground">{result.imported}</span> new transactions imported
                </p>
                <p>
                  <span className="font-medium text-foreground">{result.skipped_duplicates}</span> duplicates skipped
                </p>
                <p className="text-xs">
                  {result.total_rows} rows processed in total
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedFile || !selectedAccountId || accounts.length === 0}
              >
                Import
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
