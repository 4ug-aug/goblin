import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type Section = {
    title: string;
    colSpan?: 1 | 2 | 3;
    subtitle?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    content: React.ReactNode;
}

export function MultiSectionCard({ sections = [], className }: { sections: Section[], className?: string }) {
    const getColSpanClass = (span?: number) => {
        if (span === 2) return "xl:col-span-2";
        if (span === 3) return "xl:col-span-3";
        return "xl:col-span-1";
    };

    return (
      <Card className={cn("py-0 overflow-hidden rounded-lg", className)}>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 xl:grid-cols-3 xl:divide-x divide-y xl:divide-y-0 border-collapse">
            {sections.map((section, idx) => (
              <div
                key={idx}
                className={cn(
                    "px-4 py-4 min-w-0",
                    getColSpanClass(section.colSpan)
                )}
              >
                <div className="mb-3 flex flex-col items-start justify-between">
                  <h3 className="text-base font-semibold tracking-tight">
                    {section.title}
                  </h3>
                  {section.subtitle && (
                    <p className="text-xs sm:text-sm text-muted-foreground">{section.subtitle}</p>
                  )}
                  {section.action && (
                    <button
                      type="button"
                      onClick={section.action.onClick}
                      className="text-xs sm:text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
                    >
                      {section.action.label}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="space-y-3">{section.content}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
