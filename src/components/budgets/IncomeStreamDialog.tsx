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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createIncomeStream, getCategories, updateIncomeStream, type Category, type IncomeStream } from "@/lib/api";
import { formatCategoryPath } from "@/lib/format";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  expected_amount: z.number().min(0),
  frequency: z.string().min(1, "Frequency is required"),
  category_id: z.number().nullable(),
  is_active: z.boolean(),
});

interface IncomeStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stream?: IncomeStream | null;
  onSuccess?: () => void;
}

export function IncomeStreamDialog({
  open,
  onOpenChange,
  stream,
  onSuccess,
}: IncomeStreamDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      expected_amount: 0,
      frequency: "monthly",
      category_id: null,
      is_active: true,
    },
  });

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    }
    if (open) {
      loadCategories();
      if (stream) {
        form.reset({
          name: stream.name,
          expected_amount: stream.expected_amount / 100,
          frequency: stream.frequency,
          category_id: stream.category_id,
          is_active: stream.is_active,
        });
      } else {
        form.reset({
          name: "",
          expected_amount: 0,
          frequency: "monthly",
          category_id: null,
          is_active: true,
        });
      }
    }
  }, [open, stream, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (stream?.id) {
        await updateIncomeStream({
          ...values,
          id: stream.id,
          expected_amount: values.expected_amount * 100,
        });
      } else {
        await createIncomeStream({
          ...values,
          expected_amount: values.expected_amount * 100,
        });
      }
      toast.success(stream ? "Income stream updated" : "Income stream created");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save income stream:", error);
      toast.error("Failed to save income stream");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{stream ? "Edit Income Stream" : "New Income Stream"}</DialogTitle>
          <DialogDescription>
            Define an expected source of income to help plan your budget.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Salary, Side Hustle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (DKK)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
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
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Category (Optional)</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} 
                    value={field.value?.toString() || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id?.toString() || ""}>
                          {formatCategoryPath(cat.name, categories.find(p => p.id === cat.parent_id)?.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : stream ? "Update Income" : "Create Income"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
