import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./ModeToggle";

interface TopBarProps {
  title?: string;
  children?: React.ReactNode;
}

export function TopBar({
  title,
  children,
}: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {title && (
        <h1 className="text-sm font-medium text-foreground">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {children}
        <ModeToggle />
      </div>
    </header>
  );
}
