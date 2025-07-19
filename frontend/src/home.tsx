import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ForgetThePassword from "./pages/ForgetThePassword";
import Register from "./pages/Register";
import LINELogin from "./pages/LINELogin";
import LoginSuccess from "./pages/LoginSuccess";
import LoginError from "./pages/LoginError";
import EmailVerification from "./pages/EmailVerification";
import NotFound from "./pages/NotFound";
import DashboardPage from "./pages/DashboardPage";
import AddBotPage from "./pages/AddBotPage";
import BotEditorPage from "./pages/BotEditorPage";
import HowToEstablish from "./pages/HowToEstablish";
import Setting from "./pages/Setting";
import ResetPassword from "./pages/ResetPassword";
import Editbot from "./pages/Editbot";
import About from "./pages/About";
import Language from "./pages/Language";
import Suggest from "./pages/Suggest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgetthepassword" element={<ForgetThePassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/line-login" element={<LINELogin />} />
          <Route path="/login-success" element={<LoginSuccess />} />
          <Route path="/login-error" element={<LoginError />} />
          
          {/* 新的語義化路由 */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/bots/create" element={<AddBotPage />} />
          <Route path="/bots/editor" element={<BotEditorPage />} />
          <Route path="/how-to-establish" element={<HowToEstablish />} />
          
          {/* 向後兼容的舊路由 */}
          <Route path="/index2" element={<DashboardPage />} />
          <Route path="/add server" element={<AddBotPage />} />
          <Route path="/add-server" element={<AddBotPage />} />
          <Route path="/block" element={<BotEditorPage />} />
          <Route path="/how to establish" element={<HowToEstablish />} />
          
          <Route path="/setting" element={<Setting />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/editbot" element={<Editbot />} />
          <Route path="/about" element={<About />} />
          <Route path="/language" element={<Language />} />
          <Route path="/suggest" element={<Suggest />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
