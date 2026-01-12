import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "next-themes";
import "./App.css";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppLayout />
    </ThemeProvider>
  );
}

export default App;
