import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

// Pages
import { AccountsPage } from "@/pages/AccountsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SubscriptionsPage } from "@/pages/SubscriptionsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";

// Import Dialog
import { ImportDialog } from "@/components/import/ImportDialog";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/accounts": "Accounts",
  "/subscriptions": "Subscriptions",
  "/categories": "Categories",
};

export function AppLayout() {
  const [currentPath, setCurrentPath] = useState("/");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [_searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K: Open search
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Cmd+I: Open import
      if (e.metaKey && e.key === "i") {
        e.preventDefault();
        setImportDialogOpen(true);
      }
      // Cmd+1-5: Navigate
      if (e.metaKey && ["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        const paths = ["/", "/transactions", "/accounts", "/subscriptions", "/categories"];
        setCurrentPath(paths[parseInt(e.key) - 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const handleOpenImport = useCallback(() => {
    setImportDialogOpen(true);
  }, []);

  const renderPage = () => {
    switch (currentPath) {
      case "/":
        return <DashboardPage />;
      case "/transactions":
        return <TransactionsPage />;
      case "/accounts":
        return <AccountsPage />;
      case "/subscriptions":
        return <SubscriptionsPage />;
      case "/categories":
        return <CategoriesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onImport={handleOpenImport}
      />
      <SidebarInset>
        <TopBar
          title={PAGE_TITLES[currentPath]}
        />
        <main className="flex-1 overflow-auto p-4">
          {renderPage()}
        </main>
      </SidebarInset>

      {/* Global Dialogs */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
