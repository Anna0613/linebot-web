import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const demoTabs = [
  {
    id: "builder",
    title: "機器人生成器",
    description: "直覺的拖放介面，用於創建機器人對話流。",
    preview: (
          <div className="w-full bg-card text-card-foreground rounded-lg shadow-sm overflow-hidden dark:shadow-neon">
        <div className="bg-secondary px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-red-400"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
          </div>
          <div className="h-5 w-40 bg-muted rounded"></div>
          <div></div>
        </div>

        <div className="grid grid-cols-5 h-[400px]">
          {/* Left Sidebar - Tools */}
          <div className="col-span-1 border-r border-border p-3 bg-card">
            <div className="h-6 w-20 bg-secondary rounded mb-3"></div>
            <div className="space-y-2">
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
                <div className="h-4 w-16 bg-muted rounded"></div>
              </div>
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
                <div className="h-4 w-12 bg-muted rounded"></div>
              </div>
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-5 w-5 rounded bg-line/20 mr-2"></div>
                <div className="h-4 w-14 bg-muted rounded"></div>
              </div>
            </div>

            <div className="h-6 w-24 bg-secondary rounded my-3"></div>
            <div className="space-y-2">
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-5 w-5 rounded bg-primary/20 mr-2"></div>
                <div className="h-4 w-10 bg-muted rounded"></div>
              </div>
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-5 w-5 rounded bg-primary/20 mr-2"></div>
                <div className="h-4 w-16 bg-muted rounded"></div>
              </div>
            </div>
          </div>

          {/* Main Canvas */}
          <div className="col-span-3 bg-background p-5 relative overflow-hidden">
            <div className="absolute inset-0 dot-pattern opacity-50"></div>

            {/* Flow Nodes */}
            <div className="relative z-10">
              {/* Start Node */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-48 bg-card text-card-foreground shadow-sm rounded-lg p-3 border-2 border-line">
                <div className="h-5 w-20 bg-line/20 rounded mb-2 mx-auto"></div>
                <div className="h-4 w-36 bg-secondary rounded mx-auto"></div>
              </div>

              {/* Connection line */}
              <div className="absolute top-[90px] left-1/2 transform -translate-x-1/2 w-0.5 h-16 bg-border"></div>
              <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-border"></div>

              {/* Message Node */}
              <div className="absolute top-32 left-1/2 transform -translate-x-1/2 w-48 bg-card text-card-foreground shadow-sm rounded-lg p-3">
                <div className="h-5 w-24 bg-muted rounded mb-2 mx-auto"></div>
                <div className="h-20 bg-secondary rounded p-2">
                  <div className="h-3 w-full bg-muted rounded mb-1"></div>
                  <div className="h-3 w-3/4 bg-muted rounded mb-1"></div>
                  <div className="h-3 w-1/2 bg-muted rounded"></div>
                </div>
              </div>

              {/* Split line */}
              <div className="absolute top-[220px] left-1/2 transform -translate-x-1/2">
                <div className="w-0.5 h-10 bg-border"></div>
                <div className="w-80 h-0.5 bg-border mt-[-1px]"></div>
                <div className="flex justify-between">
                  <div className="w-0.5 h-16 bg-border ml-[-1px]"></div>
                  <div className="w-0.5 h-16 bg-border mr-[-1px]"></div>
                </div>
              </div>

              {/* Condition Nodes */}
              <div className="absolute top-72 left-[calc(50%-90px)] transform -translate-x-1/2 w-40 bg-card text-card-foreground shadow-sm rounded-lg p-3">
                <div className="h-5 w-20 bg-primary/20 rounded mb-2 mx-auto"></div>
                <div className="h-4 w-32 bg-secondary rounded mx-auto"></div>
              </div>

              <div className="absolute top-72 left-[calc(50%+90px)] transform -translate-x-1/2 w-40 bg-card text-card-foreground shadow-sm rounded-lg p-3">
                <div className="h-5 w-20 bg-primary/20 rounded mb-2 mx-auto"></div>
                <div className="h-4 w-28 bg-secondary rounded mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="col-span-1 border-l border-border p-3 bg-card">
              <div className="h-6 w-24 bg-secondary rounded mb-3"></div>

            <div className="space-y-3">
              <div>
                <div className="h-4 w-20 bg-muted rounded mb-1"></div>
                <div className="h-8 w-full bg-secondary rounded"></div>
              </div>

              <div>
                <div className="h-4 w-24 bg-muted rounded mb-1"></div>
                <div className="h-8 w-full bg-secondary rounded"></div>
              </div>

              <div>
                <div className="h-4 w-16 bg-muted rounded mb-1"></div>
                <div className="h-20 w-full bg-secondary rounded"></div>
              </div>
            </div>

            <div className="mt-4 space-x-2 flex">
              <div className="h-8 w-20 rounded bg-line/20"></div>
              <div className="h-8 w-20 rounded bg-secondary"></div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "flex-message",
    title: "Flex 訊息編輯器",
    description: "使用視覺化編輯器設計豐富的 LINE Flex 訊息。",
    preview: (
      <div className="w-full bg-card text-card-foreground rounded-lg shadow-sm overflow-hidden dark:shadow-neon">
        <div className="bg-secondary px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-red-400"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
          </div>
          <div className="h-5 w-48 bg-muted rounded"></div>
          <div></div>
        </div>

        <div className="grid grid-cols-3 h-[400px]">
          {/* Left - Components */}
          <div className="border-r border-border p-3 bg-card">
            <div className="h-6 w-28 bg-muted rounded mb-3"></div>

            <div className="space-y-2 mb-4">
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-6 w-6 rounded bg-line/20 mr-2"></div>
                <div className="h-4 w-16 bg-muted rounded"></div>
              </div>
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-6 w-6 rounded bg-line/20 mr-2"></div>
                <div className="h-4 w-20 bg-muted rounded"></div>
              </div>
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-6 w-6 rounded bg-line/20 mr-2"></div>
                <div className="h-4 w-14 bg-muted rounded"></div>
              </div>
            </div>

            <div className="h-6 w-24 bg-muted rounded mb-3"></div>

            <div className="space-y-2">
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-6 w-6 rounded bg-primary/20 mr-2"></div>
                <div className="h-4 w-16 bg-muted rounded"></div>
              </div>
              <div className="bg-secondary h-10 rounded flex items-center px-2">
                <div className="h-6 w-6 rounded bg-primary/20 mr-2"></div>
                <div className="h-4 w-12 bg-muted rounded"></div>
              </div>
            </div>
          </div>

          {/* Middle - Preview */}
          <div className="p-4 flex flex-col items-center justify-center">
            <div className="mb-3 h-6 w-20 bg-muted rounded"></div>

            {/* Phone Frame */}
            <div className="w-64 h-[320px] bg-gray-800 rounded-xl p-2 shadow-lg relative dark:neon-ring">
              <div className="absolute top-0 left-0 right-0 h-6 bg-black rounded-t-xl flex items-center justify-center">
                <div className="h-2 w-16 bg-muted rounded-full"></div>
              </div>
              <div className="bg-secondary rounded-lg h-full pt-6 flex flex-col">
                {/* LINE Header */}
                <div className="bg-line h-10 flex items-center px-3">
                  <div className="h-5 w-16 bg-white bg-opacity-20 rounded"></div>
                </div>

                {/* Conversation */}
                <div className="flex-1 bg-secondary p-3">
                  {/* Message Bubble */}
                  <div className="bg-card rounded-lg shadow-sm overflow-hidden mb-3 w-48 mx-auto">
                    {/* Header Image */}
                    <div className="h-20 bg-gradient-to-r from-blue-100 to-green-100"></div>

                    {/* Content */}
                    <div className="p-3">
                      <div className="h-5 w-24 bg-muted rounded mb-2"></div>
                      <div className="h-3 w-full bg-muted rounded mb-1"></div>
                      <div className="h-3 w-3/4 bg-muted rounded mb-3"></div>

                      {/* Buttons */}
                      <div className="h-8 w-full bg-line/20 rounded-lg mb-2"></div>
                      <div className="h-8 w-full bg-muted rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Properties */}
          <div className="border-l border-border p-3 bg-card">
            <div className="h-6 w-24 bg-muted rounded mb-3"></div>

            <div className="space-y-3">
              <div>
                <div className="h-4 w-16 bg-secondary rounded mb-1"></div>
                <div className="h-8 w-full bg-secondary rounded"></div>
              </div>

              <div>
                <div className="h-4 w-20 bg-secondary rounded mb-1"></div>
                <div className="h-8 w-full bg-secondary rounded"></div>
              </div>

              <div>
                <div className="h-4 w-24 bg-secondary rounded mb-1"></div>
                <div className="flex space-x-2">
                  <div className="h-8 w-8 rounded bg-red-100"></div>
                  <div className="h-8 w-8 rounded bg-blue-100"></div>
                  <div className="h-8 w-8 rounded bg-green-100"></div>
                  <div className="h-8 w-8 rounded bg-line/20"></div>
                </div>
              </div>

              <div>
                <div className="h-4 w-16 bg-secondary rounded mb-1"></div>
                <div className="h-20 w-full bg-secondary rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "分析儀表板",
    description: "透過詳細的分析監控您的機器人的性能。",
    preview: (
      <div className="w-full bg-card text-card-foreground rounded-lg shadow-sm overflow-hidden">
        <div className="bg-secondary px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="h-3 w-3 rounded-full bg-red-400"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
          </div>
          <div className="h-5 w-40 bg-muted rounded"></div>
          <div></div>
        </div>

        <div className="p-5 h-[400px]">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-muted rounded"></div>
            <div className="flex space-x-3">
            <div className="h-8 w-24 bg-secondary rounded"></div>
              <div className="h-8 w-24 bg-line/20 rounded-lg"></div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-secondary rounded-lg p-4">
              <div className="h-4 w-20 bg-muted rounded mb-3"></div>
              <div className="h-8 w-20 bg-primary/20 rounded"></div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="h-4 w-20 bg-muted rounded mb-3"></div>
              <div className="h-8 w-24 bg-line/20 rounded"></div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="h-4 w-20 bg-muted rounded mb-3"></div>
              <div className="h-8 w-16 bg-muted rounded"></div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="h-4 w-20 bg-muted rounded mb-3"></div>
              <div className="h-8 w-28 bg-muted rounded"></div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-secondary rounded-lg p-4">
              <div className="h-5 w-32 bg-muted rounded mb-4"></div>
              <div className="h-[140px] flex items-end space-x-3 pt-4">
                <div className="flex-1 h-[40%] bg-line/20 rounded-t"></div>
                <div className="flex-1 h-[60%] bg-line/20 rounded-t"></div>
                <div className="flex-1 h-[80%] bg-line/20 rounded-t"></div>
                <div className="flex-1 h-[70%] bg-line/20 rounded-t"></div>
                <div className="flex-1 h-[50%] bg-line/20 rounded-t"></div>
                <div className="flex-1 h-[90%] bg-line/20 rounded-t"></div>
                <div className="flex-1 h-[60%] bg-line/20 rounded-t"></div>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-4">
              <div className="h-5 w-32 bg-muted rounded mb-4"></div>
              <div className="h-[140px] relative pt-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-8 border-line/20"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-8 border-primary/20"></div>
                </div>
                <div className="absolute bottom-4 right-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-line/20"></div>
                    <div className="h-3 w-16 bg-muted rounded"></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-primary/20"></div>
                    <div className="h-3 w-12 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

const DemoPreview = () => {
  const [activeTab, setActiveTab] = useState("builder");

  return (
    <section id="demo" className="section py-24">
      {/* 半透明背景容器 */}
      <div className="glass-card p-8 md:p-12">
        <div className="text-center mb-16 fade-in-element">
          <h2 className="section-title">
            觀看<span className="text-gradient">實際操作</span>
          </h2>
          <p className="section-subtitle mx-auto">
            探索我們的互動式演示，了解使用我們的平台創建和管理 LINE
            機器人是多麼容易。
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
        <Tabs
          defaultValue="builder"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full h-auto bg-muted p-1 rounded-lg mb-6">
            {demoTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="py-3 data-[state=active]:text-white data-[state=active]:shadow-none text-center h-auto"
                style={{
                  background:
                    activeTab === tab.id
                      ? "linear-gradient(to right, #3b82f6, #06C755)"
                      : "transparent",
                }}
              >
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {demoTabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-0 fade-in-element"
            >
              <div className="grid grid-cols-1 gap-8">
                <div className="glassmorphism p-6 lg:p-8">
                  <p className="text-muted-foreground mb-6">
                    {tab.description}
                  </p>
                  <div className="animate-float shadow-lg rounded-lg overflow-hidden">
                    {tab.preview}
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      </div>
    </section>
  );
};

export default DemoPreview;
