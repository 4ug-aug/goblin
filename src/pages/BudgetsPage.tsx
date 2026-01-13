import { BudgetDialog } from "@/components/budgets/BudgetDialog";
import { IncomeStreamDialog } from "@/components/budgets/IncomeStreamDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    deleteBudget,
    deleteIncomeStream,
    getBudgetsWithSpending,
    getIncomeStreams,
    type BudgetWithSpending,
    type IncomeStream
} from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { Banknote, ChevronLeft, ChevronRight, Edit2, Plus, Target, Trash2, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Budget Dialog State
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpending | null>(null);

  // Income Dialog State
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<IncomeStream | null>(null);

  const monthStr = format(currentMonth, "yyyy-MM");

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetData, incomeData] = await Promise.all([
        getBudgetsWithSpending(monthStr),
        getIncomeStreams()
      ]);
      setBudgets(budgetData);
      setIncomeStreams(incomeData);
    } catch (error) {
      console.error("Failed to load budgeting data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthStr]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleCurrentMonth = () => setCurrentMonth(startOfMonth(new Date()));

  // Budget Actions
  const handleDeleteBudget = async (id: number) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    try {
      await deleteBudget(id);
      toast.success("Budget deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete budget");
    }
  };

  // Income Actions
  const handleDeleteIncome = async (id: number) => {
    if (!confirm("Are you sure you want to delete this income stream?")) return;
    try {
      await deleteIncomeStream(id);
      toast.success("Income stream deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete income stream");
    }
  };

  const totalBudgeted = useMemo(() => 
    budgets.reduce((acc, b) => acc + b.allocated_amount, 0),
  [budgets]);

  const totalExpectedIncome = useMemo(() => 
    incomeStreams.filter(s => s.is_active).reduce((acc, s) => {
      // Basic frequency normalization - just a rough estimate for monthly view
      switch(s.frequency) {
        case "weekly": return acc + (s.expected_amount * 4.33);
        case "biweekly": return acc + (s.expected_amount * 2.17);
        case "yearly": return acc + (s.expected_amount / 12);
        default: return acc + s.expected_amount;
      }
    }, 0),
  [incomeStreams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[140px] text-center font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCurrentMonth}>
            Today
          </Button>
        </div>
      </div>

      {/* Planner Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers text-emerald-500">
              +{formatAmount(totalExpectedIncome)}
            </div>
            <p className="text-xs text-muted-foreground">Monthly estimate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budgeted Spending</CardTitle>
            <Wallet className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers text-rose-500">
              -{formatAmount(totalBudgeted)}
            </div>
            <p className="text-xs text-muted-foreground">Allocated for {format(currentMonth, "MMM")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Assign</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono-numbers ${totalExpectedIncome - totalBudgeted >= 0 ? "text-primary" : "text-rose-500"}`}>
              {formatAmount(totalExpectedIncome - totalBudgeted)}
            </div>
            <p className="text-xs text-muted-foreground">Safe to spend/save</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="budgets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budgets">Spending Budgets</TabsTrigger>
          <TabsTrigger value="income">Income Streams</TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingBudget(null); setBudgetDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Budget
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-[160px] bg-muted/50" />)}
            </div>
          ) : budgets.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No budgets created</h3>
              <p className="text-muted-foreground max-w-sm px-4">Create budgets to group categories and track spending goals.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setEditingBudget(null); setBudgetDialogOpen(true); }}>
                Create your first budget
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {budgets.map((b) => {
                const percent = b.allocated_amount > 0 ? Math.min(100, (b.spent_amount / b.allocated_amount) * 100) : 0;
                const isOverBudget = b.spent_amount > b.allocated_amount;
                return (
                  <Card key={b.budget.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.budget.color }} />
                        <CardTitle className="text-sm font-medium">{b.budget.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingBudget(b); setBudgetDialogOpen(true); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteBudget(b.budget.id!)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold font-mono-numbers">{formatAmount(b.spent_amount)}</div>
                        <div className="text-xs text-muted-foreground text-right">of {formatAmount(b.allocated_amount)}</div>
                      </div>
                      <div className="space-y-1">
                        <Progress value={percent} className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`} />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          <span>{percent.toFixed(0)}% used</span>
                          <span>{formatAmount(Math.max(0, b.allocated_amount - b.spent_amount))} left</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingStream(null); setIncomeDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Income Stream
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {incomeStreams.map((s) => (
              <Card key={s.id} className="group hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{s.name}</CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStream(s); setIncomeDialogOpen(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteIncome(s.id!)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono-numbers text-emerald-500">
                    +{formatAmount(s.expected_amount)}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{s.frequency}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <BudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        budget={editingBudget?.budget}
        onSuccess={loadData}
      />

      <IncomeStreamDialog
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
        stream={editingStream}
        onSuccess={loadData}
      />
    </div>
  );
}
