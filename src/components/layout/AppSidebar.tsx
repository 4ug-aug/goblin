import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Receipt,
  Repeat,
  Tags,
  Target,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
  shortcut?: string;
}

const mainNav: NavItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    shortcut: "⌘1",
  },
  {
    title: "Transactions",
    icon: Receipt,
    href: "/transactions",
    shortcut: "⌘2",
  },
  {
    title: "Accounts",
    icon: Wallet,
    href: "/accounts",
    shortcut: "⌘3",
  },
  {
    title: "Subscriptions",
    icon: Repeat,
    href: "/subscriptions",
    shortcut: "⌘4",
  },
  {
    title: "Categories",
    icon: Tags,
    href: "/categories",
    shortcut: "⌘5",
  },
  {
    title: "Budgets",
    icon: Target,
    href: "/budgets",
    shortcut: "⌘6",
  },
];

interface AppSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onImport: () => void;
}

export function AppSidebar({ currentPath, onNavigate, onImport }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            G
          </div>
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            Goblin
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Import Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onImport}
                  tooltip="Import CSV (⌘I)"
                  className="hover:bg-primary/20 text-primary"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={currentPath === item.href}
                    onClick={() => onNavigate(item.href)}
                    tooltip={`${item.title}${item.shortcut ? ` (${item.shortcut})` : ""}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
