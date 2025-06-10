import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Index/Hero';
import Features from '../components/Index/Features';
import HowItWorks from '../components/Index/HowItWorks';
import DemoPreview from '../components/Index/DemoPreview';
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';
import { AuthService } from '../services/auth';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 如果用戶已經登入，重定向到LoginHome頁面
    if (AuthService.isAuthenticated()) {
      navigate('/index2', { replace: true });
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

export default Index;
