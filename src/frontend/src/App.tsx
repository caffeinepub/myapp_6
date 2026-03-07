import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "./context/AppContext";
import AppPage from "./pages/AppPage";
import GuestPage from "./pages/GuestPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function AppRouter() {
  const { view } = useApp();

  switch (view) {
    case "login":
      return <LoginPage />;
    case "register":
      return <RegisterPage />;
    case "guest":
      return <GuestPage />;
    case "app":
      return <AppPage />;
    default:
      return <LoginPage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Toaster position="top-right" richColors />
      <AppRouter />
    </AppProvider>
  );
}
