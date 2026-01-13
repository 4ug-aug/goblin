import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { createBudget, getBudgetCategories, getCategories, setBudgetAllocation, setBudgetCategories, updateBudget, type Budget, type Category } from "@/lib/api";
import { formatCategoryPath } from "@/lib/format";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().startsWith("#", "Color must be a hex code"),
  category_ids: z.array(z.number()),
  monthly_allocation: z.number().min(0),
});

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
  onSuccess?: () => void;
}

const PRESET_COLORS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", 
  "#ec4899", "#8b5cf6", "#64748b"
];

export function BudgetDialog({
  open,
  onOpenChange,
  budget,
  onSuccess,
}: BudgetDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const currentMonth = format(new Date(), "yyyy-MM");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#6366f1",
      category_ids: [],
      monthly_allocation: 0,
    },
  });

  useEffect(() => {
    async function loadData() {
      try {
        const cats = await getCategories();
        setCategories(cats);

        if (budget?.id) {
          const linkedCatIds = await getBudgetCategories(budget.id);
          // Note: In real app we might want to fetch the allocation for the current month too
          // But for now we'll focus on name/color/categories
          form.reset({
            name: budget.name,
            color: budget.color,
            category_ids: linkedCatIds,
            monthly_allocation: 0, // Should stay 0 or fetch actual
          });
        } else {
          form.reset({
            name: "",
            color: "#6366f1",
            category_ids: [],
            monthly_allocation: 0,
          });
        }
      } catch (error) {
        console.error("Failed to load dialog data:", error);
      }
    }
    if (open) {
      loadData();
    }
  }, [open, budget, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let budgetId: number;
      if (budget?.id) {
        await updateBudget({
          id: budget.id,
          name: values.name,
          color: values.color,
          icon: null,
        });
        budgetId = budget.id;
      } else {
        budgetId = await createBudget({
          name: values.name,
          color: values.color,
          icon: null,
        });
      }

      // Save categories and allocation
      await setBudgetCategories(budgetId, values.category_ids);
      if (values.monthly_allocation > 0) {
        await setBudgetAllocation(budgetId, currentMonth, values.monthly_allocation * 100);
      }

      toast.success(budget ? "Budget updated" : "Budget created");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save budget:", error);
      toast.error("Failed to save budget");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit Budget" : "New Budget"}</DialogTitle>
          <DialogDescription>
            Group categories together and set a monthly spending limit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Essentials, Entertainment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            field.value === c ? "border-primary scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => field.onChange(c)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthly_allocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Allocation (DKK)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5000" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_ids"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Included Categories</FormLabel>
                    <MultiSelectCombobox
                      options={categories.map((cat) => ({
                        value: cat.id!.toString(),
                        label: formatCategoryPath(cat.name, categories.find(p => p.id === cat.parent_id)?.name) || cat.name,
                        group: categories.find(p => p.id === cat.parent_id)?.name || "Top Level"
                      }))}
                      selected={field.value.map(id => id.toString())}
                      onChange={(vals) => field.onChange(vals.map(v => parseInt(v)))}
                      placeholder="Select categories..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : budget ? "Update Budget" : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
