import { useState } from "react";
import {
  MessageSquare,
  Layout,
  Database,
  Server,
  Shield,
  BarChart3,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const features = [
  {
    id: "design",
    icon: <Layout className="h-6 w-6" />,
    title: "拖拉式機器人設計",
    description: "使用我們的可視化編輯器直觀地設計機器人的對話流程。無需編碼。",
    details: [
      "帶有拖拉式節點的可視化流程建構器",
      "實時預覽你的機器人的回應",
      "很多LINE Flex Messages的媒體訊息編輯器",
      "有預先建立對話流程的範本庫",
    ],
    image: (
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 rounded-full bg-secondary"></div>
            <div className="h-8 w-8 rounded-full bg-secondary"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-24 bg-secondary rounded-lg flex items-center justify-center">
            <div className="h-12 w-12 bg-line/20 rounded"></div>
          </div>
          <div className="h-24 bg-secondary rounded-lg"></div>
          <div className="h-24 bg-secondary rounded-lg"></div>
          <div className="h-24 bg-secondary rounded-lg"></div>
        </div>
        <div className="w-full h-12 bg-line/20 rounded-full"></div>
      </div>
    ),
  },
  {
    id: "server",
    icon: <Server className="h-6 w-6" />,
    title: "簡單的伺服器管理",
    description: "只需點擊幾下即可部署和管理機器人的伺服器基礎架構。",
    details: [
      "使用 Docker 容器進行一鍵部署",
      "根據流量自動擴展",
      "內建 NGINX 配置以實現最佳效能",
      "伺服器健康監控和警報",
    ],
    image: (
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-36 bg-primary/20 rounded"></div>
          <div className="h-8 w-8 rounded-full bg-secondary"></div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-secondary rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-green-200 mr-3"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
            <div className="ml-auto h-6 w-16 bg-line/20 rounded-full"></div>
          </div>
          <div className="h-12 bg-secondary rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-green-200 mr-3"></div>
            <div className="h-4 w-40 bg-muted rounded"></div>
            <div className="ml-auto h-6 w-16 bg-line/20 rounded-full"></div>
          </div>
          <div className="h-12 bg-secondary rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-yellow-200 mr-3"></div>
            <div className="h-4 w-36 bg-muted rounded"></div>
            <div className="ml-auto h-6 w-16 bg-primary/20 rounded-full"></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "database",
    icon: <Database className="h-6 w-6" />,
    title: "資料庫管理",
    description:
      "無需 SQL 知識即可管理您的機器人的資料。輕鬆儲存使用者互動和偏好。",
    details: [
      "可視化資料庫模式設計器",
      "自動資料備份和還原",
      "內建資料驗證規則",
      "以多種格式匯出和匯入資料",
    ],
    image: (
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex justify-between mb-6">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 rounded bg-secondary"></div>
            <div className="h-8 w-8 rounded bg-secondary"></div>
          </div>
        </div>
        <div className="bg-secondary rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-3">
            <div className="h-5 w-24 bg-muted rounded"></div>
            <div className="h-5 w-16 bg-muted rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-card border border-border rounded flex items-center px-2">
              <div className="h-4 w-4 bg-line/20 rounded-full mr-2"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="ml-auto h-4 w-16 bg-muted rounded"></div>
            </div>
            <div className="h-8 bg-card border border-border rounded flex items-center px-2">
              <div className="h-4 w-4 bg-line/20 rounded-full mr-2"></div>
              <div className="h-4 w-40 bg-muted rounded"></div>
              <div className="ml-auto h-4 w-16 bg-muted rounded"></div>
            </div>
            <div className="h-8 bg-card border border-border rounded flex items-center px-2">
              <div className="h-4 w-4 bg-line/20 rounded-full mr-2"></div>
              <div className="h-4 w-36 bg-muted rounded"></div>
              <div className="ml-auto h-4 w-16 bg-muted rounded"></div>
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="h-8 w-24 rounded-full bg-line/20"></div>
          <div className="h-8 w-24 rounded-full bg-primary/20"></div>
        </div>
      </div>
    ),
  },
  {
    id: "analytics",
    icon: <BarChart3 className="h-6 w-6" />,
    title: "強大的分析功能",
    description: "從使用者互動中獲得見解並衡量機器人的性能。",
    details: [
      "包含關鍵指標的即時儀表板",
      "用戶參與度和對話分析",
      "訊息回覆率監控",
      "自訂報告和數據視覺化",
    ],
    image: (
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="h-6 w-32 bg-primary/20 rounded mb-6"></div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-secondary rounded-lg p-3">
            <div className="h-4 w-16 bg-muted rounded mb-2"></div>
            <div className="h-10 w-20 bg-line/20 rounded-lg"></div>
          </div>
          <div className="bg-secondary rounded-lg p-3">
            <div className="h-4 w-16 bg-muted rounded mb-2"></div>
            <div className="h-10 w-24 bg-primary/20 rounded-lg"></div>
          </div>
        </div>
        <div className="bg-secondary rounded-lg p-3 mb-4">
          <div className="h-4 w-24 bg-muted rounded mb-3"></div>
          <div className="flex items-end space-x-2">
            <div className="h-16 w-8 bg-line/20 rounded-t-lg"></div>
            <div className="h-12 w-8 bg-line/20 rounded-t-lg"></div>
            <div className="h-20 w-8 bg-line/20 rounded-t-lg"></div>
            <div className="h-14 w-8 bg-line/20 rounded-t-lg"></div>
            <div className="h-10 w-8 bg-line/20 rounded-t-lg"></div>
            <div className="h-16 w-8 bg-line/20 rounded-t-lg"></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "security",
    icon: <Shield className="h-6 w-6" />,
    title: "企業級安全性",
    description: "利用我們全面的安全功能確保您的機器人和客戶資料的安全。",
    details: [
      "所有通訊均採用 HTTPS 加密",
      "用於安全 API 存取的 JWT 身份驗證",
      "限制速率以防止濫用",
      "定期安全審核和更新",
    ],
    image: (
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="h-6 w-32 bg-primary/20 rounded mb-6"></div>
        <div className="bg-secondary rounded-lg p-4 mb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 rounded-full bg-green-200"></div>
          </div>
          <div className="h-4 w-32 bg-muted rounded mx-auto mb-2"></div>
          <div className="h-4 w-48 bg-muted rounded mx-auto"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-10 w-32 rounded-full bg-line/20"></div>
          <div className="h-10 w-32 rounded-full bg-secondary"></div>
        </div>
      </div>
    ),
  },
  {
    id: "messaging",
    icon: <MessageSquare className="h-6 w-6" />,
    title: "豐富的訊息傳遞功能",
    description: "利用 LINE 豐富的訊息格式創造引人入勝的對話。",
    details: [
      "支援所有 LINE 訊息類型，包括 Flex Messages",
      "圖像、視訊和音訊資訊處理",
      "互動式按鈕和選單",
      "快速回覆和持久選單選項",
    ],
    image: (
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex justify-between mb-6">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="h-6 w-6 rounded bg-secondary"></div>
        </div>
        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-3 flex items-start">
            <div className="h-8 w-8 rounded-full bg-line/20 mr-3 flex-shrink-0"></div>
            <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
              <div className="h-4 w-40 bg-muted rounded mb-2"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-3 flex items-start justify-end">
            <div className="bg-line/20 rounded-lg p-3">
              <div className="h-4 w-36 bg-muted rounded mb-2"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary ml-3 flex-shrink-0"></div>
          </div>
        </div>
      </div>
    ),
  },
];

const Features = () => {
  const [activeTab, setActiveTab] = useState("design");

  return (
    <section id="features" className="section py-24">
      <div className="text-center mb-16 fade-in-element">
        <h2 className="section-title">
          強大的功能， <span className="text-gradient">簡單的介面</span>
        </h2>
        <p className="section-subtitle mx-auto">
          我們的平台提供創建、部署和管理 LINE
          機器人所需的一切，無需編寫任何程式碼。
        </p>
      </div>

      <Tabs
        defaultValue="design"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full max-w-5xl mx-auto"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 bg-transparent h-auto p-0 mb-8">
          {features.map((feature) => (
            <TabsTrigger
              key={feature.id}
              value={feature.id}
              className={`
                flex flex-col items-center space-y-2 p-4 data-[state=active]:bg-card data-[state=active]:shadow-md
                rounded-xl transition-all duration-200 border border-transparent data-[state=active]:border-border
              `}
            >
              <div
                className={`p-2 rounded-full ${
                  activeTab === feature.id
                    ? "bg-line/10 text-line"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {feature.icon}
              </div>
              <span className="text-xs font-medium text-center">
                {feature.title}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {features.map((feature) => (
          <TabsContent
            key={feature.id}
            value={feature.id}
            className="mt-0 fade-in-element"
          >
            <div className="glassmorphism p-6 md:p-8 lg:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 equal-columns">
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-bold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>

                  <div className="pt-4">
                    <h4 className="font-medium mb-3">主要功能：</h4>
                    <ul className="space-y-2">
                      {feature.details.map((detail, index) => (
                        <li key={index} className="flex items-start">
                          <div className="h-5 w-5 rounded-full bg-line/20 text-line flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M10 3L4.5 8.5L2 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="animate-float">{feature.image}</div>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

export default Features;
