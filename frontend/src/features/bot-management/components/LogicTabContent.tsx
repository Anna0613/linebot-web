import React from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Pause, Play, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import { Switch } from "@/components/ui/switch";
import { LogicTemplate } from "@/types/bot";

interface LogicTabContentProps {
  selectedBotId: string;
  logicLoading: boolean;
  logicTemplates: LogicTemplate[];
  onToggleLogicTemplate: (templateId: string, isActive: boolean) => void;
}

const LogicTabContent: React.FC<LogicTabContentProps> = ({
  selectedBotId,
  logicLoading,
  logicTemplates,
  onToggleLogicTemplate,
}) => {
  const navigate = useNavigate();
  const openVisualEditor = () => {
    navigate("/bots/visual-editor", {
      state: {
        activeTab: "logic",
        selectedBotId,
        returnTo: "/bots/management",
        returnLabel: "返回互動紀錄",
      },
    });
  };

  if (!selectedBotId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground">請先選擇一個 Bot 來管理邏輯</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            邏輯模板管理
          </div>
          <Button onClick={openVisualEditor} size="sm">
            建立新邏輯
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logicLoading ? (
          <div className="flex justify-center py-8">
            <Loader fullPage={false} text="載入邏輯模板..." />
          </div>
        ) : logicTemplates.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">尚無邏輯模板</p>
            <Button onClick={openVisualEditor}>
              建立第一個邏輯
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {logicTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-background shadow-sm hover:shadow transition"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={
                        template.is_active === "true" ? "default" : "secondary"
                      }
                      className={
                        template.is_active === "true"
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {template.is_active === "true" ? (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          啟用中
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3 mr-1" />
                          已停用
                        </>
                      )}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      更新時間:{" "}
                      {new Date(template.updated_at).toLocaleDateString(
                        "zh-TW"
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={template.is_active === "true"}
                    onCheckedChange={(checked) =>
                      onToggleLogicTemplate(template.id, checked)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LogicTabContent;
