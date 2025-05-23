
import { ArrowRight } from 'lucide-react';

const steps = [
  {
    number: "01",
    title: "註冊並建立項目",
    description: "註冊一個帳戶並點擊幾下即可建立您的第一個 LINE Bot 專案。",
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between mb-6">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-6 w-6 rounded-full bg-gray-100"></div>
            <div className="h-6 w-6 rounded-full bg-gray-100"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-100 rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-line/20 mr-3"></div>
            <div className="h-4 w-40 bg-gray-200 rounded"></div>
          </div>
          <div className="h-12 bg-gray-100 rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-primary/20 mr-3"></div>
            <div className="h-4 w-36 bg-gray-200 rounded"></div>
          </div>
          <div className="h-12 bg-gray-100 rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-gray-100 mr-3"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="mt-6 h-10 w-full bg-line/20 rounded-full"></div>
      </div>
    )
  },
  {
    number: "02",
    title: "設計機器人流程",
    description: "使用我們的視覺化拖放編輯器來設計您的機器人的對話流程，無需編碼。",
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-gray-100 rounded"></div>
            <div className="h-8 w-8 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2 p-3 bg-gray-100 rounded-lg">
            <div className="h-5 w-20 bg-gray-200 rounded mb-2"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-white rounded"></div>
              <div className="h-10 bg-white rounded"></div>
            </div>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="h-5 w-16 bg-gray-200 rounded mb-2"></div>
            <div className="h-20 bg-white rounded flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-line/20"></div>
            </div>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="h-5 w-16 bg-gray-200 rounded mb-2"></div>
            <div className="h-20 bg-white rounded"></div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="h-10 w-24 rounded-full bg-primary/20"></div>
          <div className="h-10 w-24 rounded-full bg-line/20"></div>
        </div>
      </div>
    )
  },
  {
    number: "03",
    title: "配置和自訂",
    description: "自訂機器人的外觀、設定自動響應並配置設定。",
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-6">
          <div className="h-8 w-8 bg-line/20 rounded-full mr-3"></div>
          <div className="h-5 w-32 bg-primary/20 rounded"></div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-4">
            <div className="h-5 w-24 bg-gray-200 rounded"></div>
            <div className="h-5 w-5 rounded bg-gray-200"></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
              <div className="h-4 w-40 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
              <div className="h-4 w-36 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="h-5 w-24 bg-gray-200 rounded mb-3"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-primary/20 rounded-full"></div>
            <div className="h-8 w-8 bg-line/20 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    )
  },
  {
    number: "04",
    title: "部署並上線",
    description: "一鍵啟動您的機器人並將其連接到您的 LINE 商業帳戶。",
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="h-6 w-32 bg-primary/20 rounded mb-6"></div>
        <div className="bg-gray-100 rounded-lg p-5 flex flex-col items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 mb-4 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-line/40"></div>
          </div>
          <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
          <div className="h-5 w-48 bg-gray-200 rounded"></div>
        </div>
        <div className="flex justify-center">
          <div className="h-10 w-40 rounded-full bg-line/20"></div>
        </div>
      </div>
    )
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="section py-24 bg-[#FFFDFA]">
      <div className="text-center mb-16 fade-in-element">
        <h2 className="section-title">它如何<span className="text-gradient">工作</span></h2>
        <p className="section-subtitle mx-auto">
        使用我們的平台可以輕鬆建立和部署您的自訂 LINE Bot。按照這些簡單的步驟即可開始。
        </p>
      </div>
      
      <div className="relative">
        {/* Connection Line */}
        <div className="hidden lg:block absolute left-1/2 top-24 bottom-24 w-0.5 bg-gray-200 -translate-x-1/2"></div>
        
        {/* Steps */}
        <div className="space-y-20 lg:space-y-0">
          {steps.map((step, index) => (
            <div key={index} className="fade-in-element" style={{ animationDelay: `${0.2 * index}s` }}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${
                index % 2 === 1 ? 'lg:grid-flow-dense' : ''
              }`}>
                {/* Step image - reversed order on odd items */}
                <div className={index % 2 === 1 ? 'lg:col-start-1' : 'lg:col-start-2'}>
                  <div className="relative">
                    <div className="animate-float">
                      {step.image}
                    </div>
                    
                    {/* Step number indicator on desktop */}
                    <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 items-center justify-center z-10">
                      {index % 2 === 1 ? (
                        <div className="right-0 translate-x-1/2">
                          <div className="h-16 w-16 rounded-full bg-white shadow-lg flex items-center justify-center">
                            <span className="text-2xl font-bold text-line">{step.number}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="left-0 -translate-x-1/2">
                          <div className="h-16 w-16 rounded-full bg-white shadow-lg flex items-center justify-center">
                            <span className="text-2xl font-bold text-line">{step.number}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Step content */}
                <div className={index % 2 === 1 ? 'lg:col-start-2' : 'lg:col-start-1'}>
                  <div className="space-y-4">
                    {/* Step number indicator on mobile */}
                    <div className="flex lg:hidden items-center space-x-4 mb-2">
                      <div className="h-12 w-12 rounded-full bg-line/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-line">{step.number}</span>
                      </div>
                      {index < steps.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold">{step.title}</h3>
                    <p className="text-muted-foreground max-w-md">{step.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
