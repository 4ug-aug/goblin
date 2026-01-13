import { Donut } from "@/components/charts/donut";
import { StackedBar } from "@/components/charts/stacked-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSectionCard } from "@/components/ui/multi-section";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAccounts, getSpendingByCategory, getSubscriptions, getTransactions, getTransactionsByDateRange, type Account, type Subscription, type TransactionWithCategory } from "@/lib/api";
import { formatAmount, formatCurrency } from "@/lib/format";
import { addDays, format, startOfMonth, startOfToday, startOfYear, subDays, subMonths, subYears } from "date-fns";
import { CalendarCheck, Repeat, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const trendConfig = {
  income: {
    label: "Income",
    color: "var(--income)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--expense)",
  },
};

export function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionWithCategory[]>([]);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [donutPeriod, setDonutPeriod] = useState<"week" | "month" | "year" | "thisMonth" | "thisYear" | "all">("thisMonth");

  // Date range: 3 months back to 3 days ahead
  const today = startOfToday();
  const startDate = subMonths(today, 3);
  const endDate = addDays(today, 3);
  
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const accs = await getAccounts();
        setAccounts(accs);

        if (accs.length > 0) {
          const allTxs: TransactionWithCategory[] = [];
          const allSpendingByCat: Record<string, number> = {};
          let totalBal = 0;

          // Process each account
          const accountDataPromises = accs.map(async (acc) => {
            if (acc.id === null) return { txs: [], spending: [], latestBal: 0 };
            
            const [txs, spending, latestTxs] = await Promise.all([
              getTransactionsByDateRange(acc.id, startDateStr, endDateStr),
              getSpendingByCategory(acc.id, startDateStr, endDateStr),
              getTransactions(acc.id, 1) // Get relative balance from latest transaction
            ]);

            const latestBal = latestTxs.length > 0 ? (latestTxs[0].balance_snapshot || 0) : 0;
            
            return { txs, spending, latestBal };
          });

          const results = await Promise.all(accountDataPromises);
          
          results.forEach(({ txs, spending, latestBal }) => {
            allTxs.push(...txs);
            totalBal += latestBal;
            spending.forEach(([cat, amount]) => {
              allSpendingByCat[cat] = (allSpendingByCat[cat] || 0) + amount;
            });
          });

          setTransactions(allTxs);
          setTotalBalance(totalBal);


          // Load subscriptions for all accounts
          const allSubs: Subscription[] = [];
          for (const acc of accs) {
            if (acc.id) {
              const subs = await getSubscriptions(acc.id);
              allSubs.push(...subs);
            }
          }
          setSubscriptions(allSubs);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [startDateStr, endDateStr]);

  // Load all transactions when "all" period is selected for the donut chart
  useEffect(() => {
    async function loadAllTransactions() {
      if ((donutPeriod !== "all" && donutPeriod !== "thisYear") || accounts.length === 0) return;
      
      try {
        const allTxs: TransactionWithCategory[] = [];
        for (const acc of accounts) {
          if (acc.id !== null) {
            const txs = await getTransactions(acc.id);
            allTxs.push(...txs);
          }
        }
        setAllTransactions(allTxs);
      } catch (error) {
        console.error("Failed to load all transactions:", error);
      }
    }
    loadAllTransactions();
  }, [donutPeriod, accounts]);

  // Aggregate daily data for StackedBar with top transactions
  interface DailyDataItem {
    date: string;
    income: number;
    expenses: number;
    topExpenses: { payee: string; amount: number }[];
    topIncome: { payee: string; amount: number }[];
  }

  const dailyData = useMemo(() => {
    const days: Record<string, DailyDataItem> = {};
    
    // Initialize all days in range
    let current = startDate;
    while (current <= endDate) {
      const dStr = format(current, "yyyy-MM-dd");
      days[dStr] = { date: dStr, income: 0, expenses: 0, topExpenses: [], topIncome: [] };
      current = addDays(current, 1);
    }

    // Fill with transaction data
    transactions.forEach(tx => {
      const dStr = tx.date;
      if (days[dStr]) {
        if (tx.amount > 0) {
          days[dStr].income += tx.amount / 100;
          days[dStr].topIncome.push({ payee: tx.payee, amount: tx.amount / 100 });
        } else {
          days[dStr].expenses += Math.abs(tx.amount) / 100;
          days[dStr].topExpenses.push({ payee: tx.payee, amount: Math.abs(tx.amount) / 100 });
        }
      }
    });

    // Sort and limit top transactions per day
    Object.values(days).forEach(day => {
      day.topExpenses = day.topExpenses.sort((a, b) => b.amount - a.amount).slice(0, 5);
      day.topIncome = day.topIncome.sort((a, b) => b.amount - a.amount).slice(0, 5);
    });

    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, startDate, endDate]);

  const donutData = useMemo(() => {
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];

    // Filter transactions by selected period
    const now = startOfToday();
    let periodStart: Date;
    switch (donutPeriod) {
      case "week":
        periodStart = subDays(now, 7);
        break;
      case "month":
        periodStart = subMonths(now, 1);
        break;
      case "year":
        periodStart = subYears(now, 1);
        break;
      case "thisMonth":
        periodStart = startOfMonth(now);
        break;
      case "thisYear":
        periodStart = startOfYear(now);
        break;
      case "all":
      default:
        periodStart = new Date(0);
    }
    const periodStartStr = format(periodStart, "yyyy-MM-dd");

    // Calculate spending by category for the period
    // Use allTransactions for 'all' period, otherwise use filtered transactions
    const txSource = (donutPeriod === "all" || donutPeriod === "thisYear") ? allTransactions : transactions;
    const periodSpending: Record<string, number> = {};
    txSource
      .filter(tx => tx.amount < 0 && (donutPeriod === "all" || tx.date >= periodStartStr))
      .forEach(tx => {
        const cat = tx.category_name || "Uncategorized";
        periodSpending[cat] = (periodSpending[cat] || 0) + Math.abs(tx.amount);
      });

    const allCategories = Object.entries(periodSpending)
      .map(([label, value], i) => ({
        key: label,
        label,
        value: value / 100,
        colorVar: colors[i % colors.length]
      }))
      .sort((a, b) => b.value - a.value);

    const totalSpent = allCategories.reduce((acc, curr) => acc + curr.value, 0);
    const topCategories = allCategories.slice(0, 5);

    return { totalSpent, topCategories };
  }, [transactions, allTransactions, donutPeriod]);

  const totalSpentInPeriod = donutData.totalSpent;
  const donutChartData = donutData.topCategories;

  // Get formatted date range for the donut period
  const donutPeriodLabel = useMemo(() => {
    const now = startOfToday();
    let start: Date;
    switch (donutPeriod) {
      case "week":
        start = subDays(now, 7);
        return `${format(start, "MMM d")} – ${format(now, "MMM d")}`;
      case "month":
        start = subMonths(now, 1);
        return `${format(start, "MMM d")} – ${format(now, "MMM d")}`;
      case "year":
        start = subYears(now, 1);
        return `${format(start, "MMM d, yyyy")} – ${format(now, "MMM d, yyyy")}`;
      case "thisMonth":
        return format(now, "MMMM yyyy");
      case "thisYear":
        return format(now, "yyyy");
      case "all":
      default:
        return "";
    }
  }, [donutPeriod]);

  const currentMonthSpending = useMemo(() => {
    const thisMonth = format(today, "yyyy-MM");
    return transactions
      .filter(tx => tx.date.startsWith(thisMonth) && tx.amount < 0)
      .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  }, [transactions, today]);

  const currentMonthIncome = useMemo(() => {
    const thisMonth = format(today, "yyyy-MM");
    return transactions
      .filter(tx => tx.date.startsWith(thisMonth) && tx.amount > 0)
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions, today]);

  // Calculate monthly subscription cost
  const monthlySubscriptionCost = useMemo(() => {
    return subscriptions.reduce((total, sub) => {
      const amount = Math.abs(sub.amount);
      switch (sub.frequency) {
        case "weekly": return total + amount * 4.33;
        case "biweekly": return total + amount * 2.17;
        case "monthly": return total + amount;
        case "yearly": return total + amount / 12;
        default: return total + amount;
      }
    }, 0);
  }, [subscriptions]);

  // Get upcoming subscription charges (sorted by next_charge_date)
  const upcomingCharges = useMemo(() => {
    return subscriptions
      .filter(sub => sub.next_charge_date)
      .sort((a, b) => (a.next_charge_date || "").localeCompare(b.next_charge_date || ""))
      .slice(0, 4);
  }, [subscriptions]);

  // Custom tooltip for cash flow chart
  const CashFlowTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: DailyDataItem }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload;
    const dateLabel = label ? new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
    
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[200px]">
        <p className="font-medium text-sm mb-2">{dateLabel}</p>
        
        <div className="flex gap-4 mb-3 text-sm">
          <div>
            <span className="text-muted-foreground">Income: </span>
            <span className="text-income font-medium">{formatAmount(data.income * 100)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Expenses: </span>
            <span className="text-expense font-medium">{formatAmount(data.expenses * 100)}</span>
          </div>
        </div>

        {data.topExpenses.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Top Expenses</p>
            {data.topExpenses.map((tx, i) => (
              <div key={i} className="flex justify-between text-xs py-0.5">
                <span className="truncate max-w-[130px]">{tx.payee}</span>
                <span className="text-expense">{formatAmount(tx.amount * 100)}</span>
              </div>
            ))}
          </div>
        )}

        {data.topIncome.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Top Income</p>
            {data.topIncome.map((tx, i) => (
              <div key={i} className="flex justify-between text-xs py-0.5">
                <span className="truncate max-w-[130px]">{tx.payee}</span>
                <span className="text-income">{formatAmount(tx.amount * 100)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const sections = [
    {
      title: "Cash Flow Trend",
      subtitle: "3 months history",
      colSpan: 2 as const,
      content: (
        <StackedBar
          data={dailyData}
          config={trendConfig}
          height={280}
          todayDate={todayStr}
          yAxisFormatter={(val) => `${val}`}
          customTooltip={<CashFlowTooltip />}
        />
      ),
    },
    {
      title: "Category Breakdown",
      subtitle: donutPeriodLabel || "All time",
      colSpan: 1 as const,
      headerAction: (
        <div className="flex items-center gap-2">
          <Select value={donutPeriod} onValueChange={(v) => setDonutPeriod(v as typeof donutPeriod)}>
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="thisYear">This year</SelectItem>
              <SelectItem value="week">Past week</SelectItem>
              <SelectItem value="month">Past month</SelectItem>
              <SelectItem value="year">Past year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
      content: (
        <div className="space-y-4">
          <Donut
            total={totalSpentInPeriod}
            subtitle="Total Spent"
            data={donutChartData}
            valueFormatter={(val) => formatAmount(val * 100, false)}
          />
          {upcomingCharges.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Upcoming Charges</span>
              </div>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {upcomingCharges.map((sub, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{sub.payee_pattern}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.next_charge_date ? format(new Date(sub.next_charge_date), "MMM d") : "Unknown"}
                      </p>
                    </div>
                    <span className="text-sm font-mono text-expense ml-2">
                      {formatCurrency(sub.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards Row - Compact */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="py-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 py-1">
            <div className="text-xl font-bold font-mono-numbers">
              {formatAmount(totalBalance)}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Monthly Spending
            </CardTitle>
            <TrendingDown className="h-3.5 w-3.5 text-expense" />
          </CardHeader>
          <CardContent className="px-4 py-1">
            <div className="text-xl font-bold font-mono-numbers text-expense">
              {formatAmount(currentMonthSpending)}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-income" />
          </CardHeader>
          <CardContent className="px-4 py-1">
            <div className="text-xl font-bold font-mono-numbers text-income">
              {formatAmount(currentMonthIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Subscriptions
            </CardTitle>
            <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 py-1">
            <div className="text-xl font-bold font-mono-numbers text-expense">
              {formatCurrency(monthlySubscriptionCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      <MultiSectionCard sections={sections} />
    </div>
  );
}
