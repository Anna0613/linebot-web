import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "註冊帳號並登入",
    description: "使用 Email 註冊帳號或透過 LINE Login 快速登入，開始使用平台功能。",
    image: (
      <div className="bg-card text-card-foreground rounded-lg shadow-sm p-6 dark:shadow-neon">
        <div className="flex justify-between mb-6">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-6 w-6 rounded-full bg-secondary"></div>
            <div className="h-6 w-6 rounded-full bg-secondary"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-secondary rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-line/20 mr-3"></div>
            <div className="h-4 w-40 bg-muted rounded"></div>
          </div>
          <div className="h-12 bg-secondary rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-primary/20 mr-3"></div>
            <div className="h-4 w-36 bg-muted rounded"></div>
          </div>
          <div className="h-12 bg-secondary rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-secondary mr-3"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </div>
        <div className="mt-6 h-10 w-full bg-line/20 rounded-full"></div>
      </div>
    ),
  },
  {
    number: "02",
    title: "建立並設定 Bot",
    description:
      "填寫 Bot 名稱、Channel Access Token 和 Channel Secret，快速建立您的 LINE Bot。",
    image: (
      <div className="bg-card text-card-foreground rounded-lg shadow-sm p-6 dark:shadow-neon">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-secondary rounded"></div>
            <div className="h-8 w-8 bg-secondary rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2 p-3 bg-secondary rounded-lg">
            <div className="h-5 w-20 bg-muted rounded mb-2"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-card rounded"></div>
              <div className="h-10 bg-card rounded"></div>
            </div>
          </div>
          <div className="p-3 bg-secondary rounded-lg">
            <div className="h-5 w-16 bg-muted rounded mb-2"></div>
            <div className="h-20 bg-card rounded flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-line/20"></div>
            </div>
          </div>
          <div className="p-3 bg-secondary rounded-lg">
            <div className="h-5 w-16 bg-muted rounded mb-2"></div>
            <div className="h-20 bg-card rounded"></div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="h-10 w-24 rounded-full bg-primary/20"></div>
          <div className="h-10 w-24 rounded-full bg-line/20"></div>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "設計對話流程",
    description: "使用視覺化拖拉式編輯器設計 Bot 的對話邏輯、Flex 訊息和 Rich Menu。",
    image: (
      <div className="bg-card text-card-foreground rounded-lg shadow-sm p-6 dark:shadow-neon">
        <div className="flex items-center mb-6">
          <div className="h-8 w-8 bg-line/20 rounded-full mr-3"></div>
          <div className="h-5 w-32 bg-primary/20 rounded"></div>
        </div>
        <div className="bg-secondary rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-4">
            <div className="h-5 w-24 bg-muted rounded"></div>
            <div className="h-5 w-5 rounded bg-muted"></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
              <div className="h-4 w-40 bg-muted rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
              <div className="h-4 w-36 bg-muted rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <div className="h-5 w-24 bg-muted rounded mb-3"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-primary/20 rounded-full"></div>
            <div className="h-8 w-8 bg-line/20 rounded-full"></div>
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="h-8 w-8 bg-muted rounded-full"></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    title: "測試與上線",
    description: "設定 Webhook URL，測試 Bot 功能，並透過儀表板監控使用者互動與數據分析。",
    image: (
      <div className="bg-card text-card-foreground rounded-lg shadow-sm p-6 dark:shadow-neon">
        <div className="h-6 w-32 bg-primary/20 rounded mb-6"></div>
        <div className="bg-secondary rounded-lg p-5 flex flex-col items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 mb-4 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-line/40"></div>
          </div>
          <div className="h-5 w-40 bg-muted rounded mb-2"></div>
          <div className="h-5 w-48 bg-muted rounded"></div>
        </div>
        <div className="flex justify-center">
          <div className="h-10 w-40 rounded-full bg-line/20"></div>
        </div>
      </div>
    ),
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="section py-24">
      {/* 半透明背景容器 */}
      <div className="glass-card p-8 md:p-12">
        <div className="text-center mb-16 fade-in-element">
          <h2 className="section-title">
            它如何<span className="text-gradient">工作</span>
          </h2>
          <p className="section-subtitle mx-auto">
            使用我們的平台可以輕鬆建立和部署您的自訂 LINE
            Bot。按照這些簡單的步驟即可開始。
          </p>
        </div>

        <div className="relative">
        {/* Connection Line */}
        <div className="hidden lg:block absolute left-1/2 top-24 bottom-24 w-0.5 bg-border -translate-x-1/2"></div>

        {/* Steps */}
        <div className="space-y-20 lg:space-y-0">
          {steps.map((step, index) => (
            <div
              key={index}
              className="fade-in-element"
              style={{ animationDelay: `${0.2 * index}s` }}
            >
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 equal-columns ${
                  index % 2 === 1 ? "lg:grid-flow-dense" : ""
                }`}
              >
                {/* Step image - reversed order on odd items */}
                <div
                  className={
                    index % 2 === 1 ? "lg:col-start-1" : "lg:col-start-2"
                  }
                >
                  <div className="relative">
                    <div className="animate-float dark:shadow-neon rounded-xl">{step.image}</div>

                    {/* Step number indicator on desktop */}
                    <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 items-center justify-center z-10">
                      {index % 2 === 1 ? (
                        <div className="right-0 translate-x-1/2">
                          <div className="h-16 w-16 rounded-full bg-card shadow-lg flex items-center justify-center dark:neon-ring">
                            <span className="text-2xl font-bold text-line">
                              {step.number}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="left-0 -translate-x-1/2">
                          <div className="h-16 w-16 rounded-full bg-card shadow-lg flex items-center justify-center dark:neon-ring">
                            <span className="text-2xl font-bold text-line">
                              {step.number}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step content */}
                <div
                  className={
                    index % 2 === 1 ? "lg:col-start-2" : "lg:col-start-1"
                  }
                >
                  <div className="space-y-4">
                    {/* Step number indicator on mobile */}
                    <div className="flex lg:hidden items-center space-x-4 mb-2">
                      <div className="h-12 w-12 rounded-full bg-line/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-line">
                          {step.number}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
};

export default HowItWorks;
