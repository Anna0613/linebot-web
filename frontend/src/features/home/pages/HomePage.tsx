import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import DemoPreview from "../components/DemoPreview";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { authManager } from "@/services/UnifiedAuthManager";
import { PageContentWrapper } from "@/components/common/PageContentWrapper";

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 如果用戶已經登入，重定向到Dashboard頁面
    if (authManager.isAuthenticatedSync()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PageContentWrapper>
        <Hero />
        <Features />
        <HowItWorks />
        <DemoPreview />
      </PageContentWrapper>
      <Footer />
    </div>
  );
};

export default HomePage;
