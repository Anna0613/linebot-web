
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#fffdfa]  from-blue-50 to-transparent opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-[#fffdfa]  from-green-50 to-transparent opacity-60"></div>
        <div className="absolute inset-0 dot-pattern opacity-10"></div>
      </div>
      
      <div className="section grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-6 items-center">
       
        <div className="space-y-6 fade-in-element" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight">
          無需編碼即可建造 <span className="text-gradient">LINE Bot</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl">
          使用我們的拖拉介面創建強大的LINE Bot。與您的客戶建立聯繫、自動回應並發展您的業務。
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link to="/register">
              <Button size="lg" className="rounded-full bg-[#F4CD41] text-[16px] font-bold hover:bg-[#e6bc00] shadow-lg hover:shadow-xl transition-all">
                開始設計
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="#demo">
              <Button variant="outline" size="lg" className="rounded-full text-[16px] hover:bg-[#A0A0A0]">
                了解更多
              </Button>
            </Link>
          </div>
          
          <div className="pt-8 flex items-center text-sm text-muted-foreground">
            <div className="flex -space-x-2 mr-3">
              <div className="w-8 h-8 rounded-full bg-gradient-blue"></div>
              <div className="w-8 h-8 rounded-full bg-gradient-green"></div>
              <div className="w-8 h-8 rounded-full bg-blue-400"></div>
            </div>
            <p>
            深受台灣 <span className="font-medium text-foreground">500+</span> 家企業的信賴
            </p>
          </div>
        </div>
        
        {/* Hero Image/Illustration */}
        <div className="relative fade-in-element" style={{ animationDelay: '0.3s' }}>
          <div className="relative z-10 animate-float">
            <div className="glassmorphism p-4 rounded-2xl shadow-glass-lg">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <div className="w-full max-w-md">
                  <div className="bg-white rounded-lg shadow-sm p-4 mx-4 mb-4">
                    <div className="h-6 bg-primary/20 rounded w-3/4 mb-3"></div>
                    <div className="flex space-x-3 mb-3">
                      <div className="h-10 w-10 rounded bg-line/20"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-8 w-24 rounded-full bg-line/20"></div>
                      <div className="h-8 w-8 rounded-full bg-primary/20"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2 mx-4">
                    <div className="flex-1 h-16 bg-white rounded-lg shadow-sm p-3">
                      <div className="h-4 w-2/3 bg-gray-100 rounded mb-2"></div>
                      <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
                    </div>
                    <div className="flex-1 h-16 bg-white rounded-lg shadow-sm p-3">
                      <div className="h-4 w-1/2 bg-gray-100 rounded mb-2"></div>
                      <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4 px-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-line"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                </div>
                <div className="text-xs text-muted-foreground">機器人創作者介面</div>
              </div>
            </div>
          </div>
          
          
          <div className="absolute top-1/4 -left-8 w-16 h-16 bg-primary/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-1/4 -right-8 w-20 h-20 bg-line/10 rounded-full blur-xl"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
