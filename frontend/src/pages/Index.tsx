
import Hero from '../components/Index/Hero';
import Features from '../components/Index/Features';
import HowItWorks from '../components/Index/HowItWorks';
import DemoPreview from '../components/Index/DemoPreview';
import Navbar from '../components/Index/Navbar';
import Footer from '../components/Index/Footer';

const Index = () => {
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
