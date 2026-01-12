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
import { createCategory } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent_id: z.number().nullable(),
});

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: number | null;
  onSuccess?: () => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  parentId = null,
  onSuccess,
}: CategoryDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      parent_id: parentId,
    },
  });

  // Update parent_id when the prop changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        parent_id: parentId,
      });
    }
  }, [open, parentId, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createCategory({
        name: values.name,
        parent_id: values.parent_id,
      });
      toast.success("Category created");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Failed to create category");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{parentId ? "Add Subcategory" : "New Category"}</DialogTitle>
          <DialogDescription>
            {parentId 
              ? "Create a new subcategory under the selected parent." 
              : "Create a new top-level category for your transactions."}
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
                    <Input placeholder="e.g. Groceries, Rent, Utilities" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
