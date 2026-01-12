import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TransactionWithCategory } from "@/lib/api";
import { formatAmount, formatCategoryPath, formatDateCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Check } from "lucide-react";

export const transactionColumns: ColumnDef<TransactionWithCategory>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateCompact(row.original.date)}
      </span>
    ),
    size: 100,
  },
  {
    accessorKey: "payee",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="text-sm font-medium truncate max-w-[300px] block">
        {row.original.payee}
      </span>
    ),
  },
  {
    accessorKey: "category_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const categoryPath = formatCategoryPath(
        row.original.category_name,
        row.original.parent_category_name
      );
      if (!categoryPath) return null;
      return (
        <Badge variant="secondary" className="font-normal text-xs">
          {categoryPath}
        </Badge>
      );
    },
    size: 200,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="-mr-3 h-8 data-[state=open]:bg-accent ml-auto"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const amount = row.original.amount;
      const isPositive = amount > 0;
      return (
        <div
          className={cn(
            "text-right font-mono-numbers text-sm",
            isPositive ? "text-income" : "text-expense"
          )}
        >
          {formatAmount(amount)}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "balance_snapshot",
    header: () => <div className="text-right">Balance</div>,
    cell: ({ row }) => {
      const balance = row.original.balance_snapshot;
      if (balance === null) return null;
      return (
        <div className="text-right font-mono-numbers text-sm text-muted-foreground">
          {formatAmount(balance)}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "is_reconciled",
    header: "",
    cell: ({ row }) => {
      if (!row.original.is_reconciled) return null;
      return (
        <Check className="h-4 w-4 text-income" />
      );
    },
    size: 40,
  },
];
