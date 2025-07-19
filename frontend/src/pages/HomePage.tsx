import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/home/Hero";
import Features from "../components/home/Features";
import HowItWorks from "../components/home/HowItWorks";
import DemoPreview from "../components/home/DemoPreview";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { AuthService } from "../services/auth";

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 如果用戶已經登入，重定向到Dashboard頁面
    if (AuthService.isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <DemoPreview />
      <Footer />
    </div>
  );
};

export default HomePage;
