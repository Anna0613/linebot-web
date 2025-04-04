
import { useState } from 'react';
import { MessageSquare, Layout, Database, Server, Shield, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const features = [
  {
    id: "design",
    icon: <Layout className="h-6 w-6" />,
    title: "Drag-and-Drop Bot Design",
    description: "Intuitively design your bot's conversation flows with our visual editor. No coding required.",
    details: [
      "Visual flow builder with drag-and-drop nodes",
      "Real-time preview of your bot's responses",
      "Rich media message editor for LINE Flex Messages",
      "Template library with pre-built conversation flows"
    ],
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 rounded-full bg-gray-100"></div>
            <div className="h-8 w-8 rounded-full bg-gray-100"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="h-12 w-12 bg-line/20 rounded"></div>
          </div>
          <div className="h-24 bg-gray-100 rounded-lg"></div>
          <div className="h-24 bg-gray-100 rounded-lg"></div>
          <div className="h-24 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="w-full h-12 bg-line/20 rounded-full"></div>
      </div>
    )
  },
  {
    id: "server",
    icon: <Server className="h-6 w-6" />,
    title: "Simplified Server Management",
    description: "Deploy and manage your bot's server infrastructure with just a few clicks.",
    details: [
      "One-click deployment with Docker containers",
      "Automatic scaling based on traffic",
      "Built-in NGINX configuration for optimal performance",
      "Server health monitoring and alerts"
    ],
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-36 bg-primary/20 rounded"></div>
          <div className="h-8 w-8 rounded-full bg-gray-100"></div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-100 rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-green-200 mr-3"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="ml-auto h-6 w-16 bg-line/20 rounded-full"></div>
          </div>
          <div className="h-12 bg-gray-100 rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-green-200 mr-3"></div>
            <div className="h-4 w-40 bg-gray-200 rounded"></div>
            <div className="ml-auto h-6 w-16 bg-line/20 rounded-full"></div>
          </div>
          <div className="h-12 bg-gray-100 rounded-lg flex items-center px-4">
            <div className="h-6 w-6 rounded-full bg-yellow-200 mr-3"></div>
            <div className="h-4 w-36 bg-gray-200 rounded"></div>
            <div className="ml-auto h-6 w-16 bg-primary/20 rounded-full"></div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "database",
    icon: <Database className="h-6 w-6" />,
    title: "Seamless Database Management",
    description: "Manage your bot's data without SQL knowledge. Store user interactions and preferences easily.",
    details: [
      "Visual database schema designer",
      "Automatic data backups and recovery",
      "Built-in data validation rules",
      "Export and import data in multiple formats"
    ],
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex justify-between mb-6">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 rounded bg-gray-100"></div>
            <div className="h-8 w-8 rounded bg-gray-100"></div>
          </div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-3">
            <div className="h-5 w-24 bg-gray-200 rounded"></div>
            <div className="h-5 w-16 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-8 bg-white rounded flex items-center px-2">
              <div className="h-4 w-4 bg-line/20 rounded-full mr-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="ml-auto h-4 w-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-white rounded flex items-center px-2">
              <div className="h-4 w-4 bg-line/20 rounded-full mr-2"></div>
              <div className="h-4 w-40 bg-gray-200 rounded"></div>
              <div className="ml-auto h-4 w-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-white rounded flex items-center px-2">
              <div className="h-4 w-4 bg-line/20 rounded-full mr-2"></div>
              <div className="h-4 w-36 bg-gray-200 rounded"></div>
              <div className="ml-auto h-4 w-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="h-8 w-24 rounded-full bg-line/20"></div>
          <div className="h-8 w-24 rounded-full bg-primary/20"></div>
        </div>
      </div>
    )
  },
  {
    id: "analytics",
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Powerful Analytics",
    description: "Gain insights from user interactions and measure your bot's performance.",
    details: [
      "Real-time dashboard with key metrics",
      "User engagement and conversation analytics",
      "Message response rate monitoring",
      "Custom reports and data visualization"
    ],
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="h-6 w-32 bg-primary/20 rounded mb-6"></div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 w-20 bg-line/20 rounded-lg"></div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 w-24 bg-primary/20 rounded-lg"></div>
          </div>
        </div>
        <div className="bg-gray-100 rounded-lg p-3 mb-4">
          <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
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
    )
  },
  {
    id: "security",
    icon: <Shield className="h-6 w-6" />,
    title: "Enterprise-Grade Security",
    description: "Keep your bot and customer data secure with our comprehensive security features.",
    details: [
      "HTTPS encryption for all communications",
      "JWT authentication for secure API access",
      "Rate limiting to prevent abuse",
      "Regular security audits and updates"
    ],
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="h-6 w-32 bg-primary/20 rounded mb-6"></div>
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 rounded-full bg-green-200"></div>
          </div>
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto mb-2"></div>
          <div className="h-4 w-48 bg-gray-200 rounded mx-auto"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-10 w-32 rounded-full bg-line/20"></div>
          <div className="h-10 w-32 rounded-full bg-gray-100"></div>
        </div>
      </div>
    )
  },
  {
    id: "messaging",
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Rich Messaging Capabilities",
    description: "Create engaging conversations with LINE's rich message formats.",
    details: [
      "Support for all LINE message types including Flex Messages",
      "Image, video, and audio message handling",
      "Interactive buttons and carousels",
      "Quick reply and persistent menu options"
    ],
    image: (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full max-w-md">
        <div className="flex justify-between mb-6">
          <div className="h-6 w-32 bg-primary/20 rounded"></div>
          <div className="h-6 w-6 rounded bg-gray-100"></div>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-3 flex items-start">
            <div className="h-8 w-8 rounded-full bg-line/20 mr-3 flex-shrink-0"></div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="h-4 w-40 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 flex items-start justify-end">
            <div className="bg-line/20 rounded-lg p-3">
              <div className="h-4 w-36 bg-white rounded mb-2"></div>
              <div className="h-4 w-24 bg-white rounded"></div>
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-200 ml-3 flex-shrink-0"></div>
          </div>
        </div>
      </div>
    )
  }
];

const Features = () => {
  const [activeTab, setActiveTab] = useState("design");

  return (
    <section id="features" className="section py-24">
      <div className="text-center mb-16 fade-in-element">
        <h2 className="section-title">Powerful Features, <span className="text-gradient">Simple Interface</span></h2>
        <p className="section-subtitle mx-auto">
          Our platform provides everything you need to create, deploy, and manage LINE Bots without writing a single line of code.
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
                flex flex-col items-center space-y-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-md
                rounded-xl transition-all duration-200 border border-transparent data-[state=active]:border-border
              `}
            >
              <div className={`p-2 rounded-full ${
                activeTab === feature.id ? 'bg-line/10 text-line' : 'bg-muted text-muted-foreground'
              }`}>
                {feature.icon}
              </div>
              <span className="text-xs font-medium text-center">{feature.title}</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <h3 className="text-2xl md:text-3xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  
                  <div className="pt-4">
                    <h4 className="font-medium mb-3">Key capabilities:</h4>
                    <ul className="space-y-2">
                      {feature.details.map((detail, index) => (
                        <li key={index} className="flex items-start">
                          <div className="h-5 w-5 rounded-full bg-line/20 text-line flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <div className="animate-float">
                    {feature.image}
                  </div>
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
