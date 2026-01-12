import { Donut } from "@/components/charts/donut";
import { StackedBar } from "@/components/charts/stacked-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSectionCard } from "@/components/ui/multi-section";
import { getAccounts, getSpendingByCategory, getSubscriptions, getTransactions, getTransactionsByDateRange, type Account, type SpendingByCategory, type Subscription, type TransactionWithCategory } from "@/lib/api";
import { formatAmount, formatCurrency } from "@/lib/format";
import { addDays, format, startOfToday, subMonths } from "date-fns";
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
  const [spendingByCategory, setSpendingByCategory] = useState<SpendingByCategory>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

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
          setSpendingByCategory(Object.entries(allSpendingByCat));

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

  // Aggregate daily data for StackedBar
  const dailyData = useMemo(() => {
    const days: Record<string, { date: string; income: number; expenses: number }> = {};
    
    // Initialize all days in range
    let current = startDate;
    while (current <= endDate) {
      const dStr = format(current, "yyyy-MM-dd");
      days[dStr] = { date: dStr, income: 0, expenses: 0 };
      current = addDays(current, 1);
    }

    // Fill with transaction data
    transactions.forEach(tx => {
      const dStr = tx.date;
      if (days[dStr]) {
        if (tx.amount > 0) {
          days[dStr].income += tx.amount / 100;
        } else {
          days[dStr].expenses += Math.abs(tx.amount) / 100;
        }
      }
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

    return spendingByCategory
      .map(([label, value], i) => ({
        key: label,
        label,
        value: Math.abs(value) / 100,
        colorVar: colors[i % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [spendingByCategory]);

  const totalSpentInPeriod = useMemo(() => 
    donutData.reduce((acc, curr) => acc + curr.value, 0),
  [donutData]);

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

  const sections = [
    {
      title: "Cash Flow Trend",
      subtitle: "3 months history",
      colSpan: 2 as const,
      content: (
        <StackedBar
          data={dailyData}
          config={trendConfig}
          height={240}
          todayDate={todayStr}
          yAxisFormatter={(val) => `${val}`}
        />
      ),
    },
    {
      title: "Category Breakdown",
      subtitle: "Top spending by category",
      colSpan: 1 as const,
      content: (
        <Donut
          total={totalSpentInPeriod}
          subtitle="Total Spent"
          data={donutData}
          valueFormatter={(val) => formatAmount(val * 100, false)}
        />
      ),
    },
  ];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <MultiSectionCard sections={sections} />

      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers">
              {formatAmount(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current balance across {accounts.length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Spending
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers text-expense">
              {formatAmount(currentMonthSpending)}
            </div>
            <p className="text-xs text-muted-foreground">
               This month's expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers text-income">
              {formatAmount(currentMonthIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
               This month's income
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Subscriptions
            </CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers text-expense">
              {formatCurrency(monthlySubscriptionCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {subscriptions.length} active subscriptions
            </p>
          </CardContent>
        </Card>

        {upcomingCharges.length > 0 && (
          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Upcoming Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-4">
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
