import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgetThePassword from "./pages/ForgetThePassword";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Index2 from "./pages/LoginHome";
import AddServer from "./pages/AddServer";
import Block from "./pages/Block";
import HowToEstablish from "./pages/HowToEstablish";

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
          <Route path="*" element={<NotFound />} />
          <Route path="/index2" element={<Index2 />} />
          <Route path="/add server" element={<AddServer />} />
          <Route path="/block" element={<Block />} />
          <Route path="/how to establish" element={<HowToEstablish />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
