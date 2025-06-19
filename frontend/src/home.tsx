import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgetThePassword from "./pages/ForgetThePassword";
import Register from "./pages/Register";
import LINELogin from "./pages/LINELogin";
import LoginSuccess from "./pages/LoginSuccess";
import LoginError from "./pages/LoginError";
import EmailVerification from "./pages/EmailVerification";
import NotFound from "./pages/NotFound";
import Index2 from "./pages/LoginHome";
import AddServer from "./pages/AddServer";
import Block from "./pages/Block";
import HowToEstablish from "./pages/HowToEstablish";
import Setting from "./pages/Setting";
import ResetPassword from "./pages/ResetPassword";
import Editbot from "./pages/Editbot";
import About from "./pages/About";
import Describe from "./pages/Describe";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgetthepassword" element={<ForgetThePassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/line-login" element={<LINELogin />} />
          <Route path="/login-success" element={<LoginSuccess />} />
          <Route path="/login-error" element={<LoginError />} />
          <Route path="/index2" element={<Index2 />} />
          <Route path="/add server" element={<AddServer />} />
          <Route path="/block" element={<Block />} />
          <Route path="/how to establish" element={<HowToEstablish />} />
          <Route path="/setting" element={<Setting />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/editbot" element={<Editbot />} />
          <Route path="/about" element={<About />} />
          <Route path="/describe" element={<Describe />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
