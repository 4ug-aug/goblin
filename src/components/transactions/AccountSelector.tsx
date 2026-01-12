import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/lib/api";
import { Wallet } from "lucide-react";

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId: number | null;
  onSelect: (id: number | null) => void;
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
}: AccountSelectorProps) {
  return (
    <Select
      value={selectedAccountId?.toString() ?? ""}
      onValueChange={(value) => onSelect(value ? parseInt(value) : null)}
    >
      <SelectTrigger className="w-[280px]">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select account" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id?.toString() ?? ""}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
