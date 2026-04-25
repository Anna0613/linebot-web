import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link as LinkIcon, ExternalLink, CheckCircle } from "lucide-react";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  isLineUser?: boolean;
}

interface SocialAccountSectionProps {
  user: User;
  onLinkLineAccount: () => void;
  onUnlinkLineAccount: () => void;
  linkingInProgress?: boolean;
}

const SocialAccountSection = ({
  user,
  onLinkLineAccount,
  onUnlinkLineAccount,
  linkingInProgress = false,
}: SocialAccountSectionProps) => {
  const isLineLinked = user?.isLineUser || !!user?.line_id;

  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="w-5 h-5 text-[#1a1a40]" />
        <h2 className="text-xl font-bold text-[#1a1a40]">社群帳號連結</h2>
      </div>

      <div className="space-y-4">
        {/* LINE 帳號連結卡片 */}
        <Card className="border-2 border-green-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">LINE</span>
                </div>
                <div>
                  <CardTitle className="text-lg">LINE 帳號</CardTitle>
                  <CardDescription>
                    連結您的 LINE 帳號以享受更便捷的登入體驗
                  </CardDescription>
                </div>
              </div>
              {isLineLinked && (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800 border-green-200"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已連結
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {isLineLinked ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {user.picture_url && (
                      <img
                        src={user.picture_url}
                        alt="LINE 頭像"
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium text-green-800">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-green-600">
                        LINE ID: {user.line_id || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUnlinkLineAccount}
                    disabled={linkingInProgress}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    解除連結
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open("https://line.me/ti/p/", "_blank")
                    }
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    LINE 個人資料
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    尚未連結 LINE 帳號。連結後您可以：
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• 使用 LINE 帳號快速登入</li>
                    <li>• 同步 LINE 個人資料照片</li>
                    <li>• 享受更便捷的使用體驗</li>
                  </ul>
                </div>

                <Button
                  onClick={onLinkLineAccount}
                  disabled={linkingInProgress}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  {linkingInProgress ? "連結中..." : "連結 LINE 帳號"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 其他社群平台預留位置 */}
        <Card className="border-2 border-border opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">...</span>
              </div>
              <div>
                <CardTitle className="text-lg text-muted-foreground">
                  其他平台
                </CardTitle>
                <CardDescription>更多社群平台連結功能即將推出</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Button variant="outline" disabled className="w-full">
              敬請期待
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocialAccountSection;
