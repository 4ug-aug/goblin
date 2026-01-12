import { Card } from "@/components/ui/card";
import { getCategories, type Category } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Tags } from "lucide-react";
import { useEffect, useState } from "react";

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

function CategoryItem({ node, level = 0 }: { node: CategoryNode; level?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer",
          level > 0 && "ml-4"
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        <Tags className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{node.name}</span>
        {hasChildren && (
          <span className="text-xs text-muted-foreground ml-auto">
            {node.children.length}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <CategoryItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  const tree = buildCategoryTree(categories);

  if (categories.length === 0 && !loading) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <Tags className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No categories</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Categories are automatically created when you import transactions.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Categories</h2>
        <p className="text-sm text-muted-foreground">
          {categories.length} categories in total
        </p>
      </div>

      <Card className="p-4">
        {tree.map((node) => (
          <CategoryItem key={node.id} node={node} />
        ))}
      </Card>
    </div>
  );
}
