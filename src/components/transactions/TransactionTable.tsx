import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCategories, updateBatchCategories, type Category, type TransactionWithCategory } from "@/lib/api";
import { formatCategoryPath } from "@/lib/format";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { transactionColumns } from "./transaction-columns";

interface TransactionTableProps {
  transactions: TransactionWithCategory[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function TransactionTable({ transactions, loading, onRefresh }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");
  const [updating, setUpdating] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    }
    loadCategories();
  }, []);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    if (!dateRange?.from) return transactions;
    
    const startStr = format(dateRange.from, "yyyy-MM-dd");
    const endStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    
    return transactions.filter(tx => tx.date >= startStr && tx.date <= endStr);
  }, [transactions, dateRange]);

  const table = useReactTable({
    data: filteredTransactions,
    columns: transactionColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: "includesString",
    filterFns: {
      categoryFilter: (row, columnId, filterValue) => {
        if (!filterValue || filterValue.length === 0) return true;
        const value = row.getValue(columnId) as string;
        return filterValue.includes(value);
      },
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleBatchCategorize = async () => {
    if (!hasSelection || updating) return;
    
    setUpdating(true);
    try {
      const transactionIds = selectedRows.map(row => row.original.id!).filter(id => id !== null);
      const categoryId = selectedCategoryId === "none" ? null : parseInt(selectedCategoryId);
      
      await updateBatchCategories(transactionIds, categoryId);
      toast.success(`Updated ${transactionIds.length} transactions`);
      setRowSelection({});
      onRefresh?.();
    } catch (error) {
      console.error("Failed to update transactions:", error);
      toast.error("Failed to update transactions");
    } finally {
      setUpdating(false);
    }
  };

  // Calculate summary totals from filtered rows (amounts are in øre, divide by 100 for DKK)
  const summaryTotals = useMemo(() => {
    const filteredRows = table.getFilteredRowModel().rows;
    let totalSpending = 0;
    let totalEarning = 0;
    
    filteredRows.forEach(row => {
      const amount = row.original.amount;
      if (amount < 0) {
        totalSpending += Math.abs(amount);
      } else {
        totalEarning += amount;
      }
    });
    
    return { totalSpending: totalSpending / 100, totalEarning: totalEarning / 100 };
  }, [table.getFilteredRowModel().rows]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Earning</p>
          <p className="text-2xl font-semibold text-emerald-500">
            +{summaryTotals.totalEarning.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Spending</p>
          <p className="text-2xl font-semibold text-rose-500">
            -{summaryTotals.totalSpending.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr.
          </p>
        </div>
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex items-center justify-start gap-2 h-9">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {!hasSelection && (
            <>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="All dates"
              />
              <MultiSelectCombobox
                placeholder="Filter categories"
                options={categories.map((cat) => ({
                  value: cat.name,
                  label: formatCategoryPath(cat.name, categories.find(p => p.id === cat.parent_id)?.name) || cat.name,
                  group: categories.find(p => p.id === cat.parent_id)?.name || "Top Level"
                }))}
                selected={(table.getColumn("category_name")?.getFilterValue() as string[]) || []}
                onChange={(value) => table.getColumn("category_name")?.setFilterValue(value.length ? value : undefined)}
              />
              {(dateRange?.from || globalFilter || (table.getColumn("category_name")?.getFilterValue() as string[])?.length) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-muted-foreground"
                  onClick={() => {
                    setDateRange(undefined);
                    setGlobalFilter("");
                    table.getColumn("category_name")?.setFilterValue(undefined);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </>
          )}
        </div>

        {hasSelection && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
            <span className="text-sm font-medium text-muted-foreground mr-2">
              {selectedRows.length} selected
            </span>
            
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id?.toString() || ""}>
                    {formatCategoryPath(cat.name, categories.find(p => p.id === cat.parent_id)?.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" onClick={handleBatchCategorize} disabled={updating}>
              Apply
            </Button>
            
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setRowSelection({})}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                    className="h-11 px-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id}
                  className="data-[state=selected]:bg-muted/60 hover:bg-muted/40 transition-colors"
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-2 px-4"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={transactionColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} transactions total
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <SelectRowsPerPage
              value={table.getState().pagination.pageSize}
              onChange={(value) => table.setPageSize(value)}
            />
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectRowsPerPage({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [10, 20, 30, 40, 50, 100];
  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-8 w-[70px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt.toString()}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
