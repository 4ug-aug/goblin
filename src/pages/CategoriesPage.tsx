import { CategoryDialog } from "@/components/categories/CategoryDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteCategory, getCategories, type Category } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Tags, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  // First pass: create nodes
  for (const cat of categories) {
    if (cat.id !== null) {
      map.set(cat.id, { ...cat, children: [] });
    }
  }

  // Second pass: build tree
  for (const cat of categories) {
    const node = cat.id !== null ? map.get(cat.id) : null;
    if (!node) continue;

    if (cat.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  return roots;
}

interface CategoryItemProps {
  node: CategoryNode;
  level?: number;
  onAddSub: (parentId: number) => void;
  onDelete: (id: number) => void;
}

function CategoryItem({ node, level = 0, onAddSub, onDelete }: CategoryItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-md cursor-pointer transition-colors",
          level > 0 && "ml-4"
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <div className="w-4 shrink-0" />
          )}
          <Tags className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{node.name}</span>
          {hasChildren && (
            <span className="text-xs text-muted-foreground">
              ({node.children.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              if (node.id) onAddSub(node.id);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              if (node.id) onDelete(node.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="border-l ml-5 pl-1">
          {node.children.map((child) => (
            <CategoryItem 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onAddSub={onAddSub}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddCategory = () => {
    setSelectedParentId(null);
    setDialogOpen(true);
  };

  const handleAddSubcategory = (parentId: number) => {
    setSelectedParentId(parentId);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (categoryToDelete === null) return;

    try {
      await deleteCategory(categoryToDelete);
      toast.success("Category deleted");
      loadCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category");
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const tree = buildCategoryTree(categories);

  if (categories.length === 0 && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Categories</h2>
          <Button onClick={handleAddCategory}>New Category</Button>
        </div>
        <Card className="flex flex-col items-center justify-center py-16">
          <Tags className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No categories</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Categories are automatically created when you import transactions, or you can create them manually.
          </p>
        </Card>
        <CategoryDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          parentId={selectedParentId}
          onSuccess={loadCategories}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Categories</h2>
          <p className="text-sm text-muted-foreground">
            {categories.length} categories in total
          </p>
        </div>
        <Button onClick={handleAddCategory}>New Category</Button>
      </div>

      <Card className="p-4">
        <div className="space-y-1">
          {tree.map((node) => (
            <CategoryItem 
              key={node.id} 
              node={node} 
              onAddSub={handleAddSubcategory}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      </Card>

      <CategoryDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        parentId={selectedParentId}
        onSuccess={loadCategories}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category
              and all of its subcategories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
