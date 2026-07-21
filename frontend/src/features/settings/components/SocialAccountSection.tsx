import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
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
    <div className="app-panel mb-6 p-6">
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="h-5 w-5 text-emerald-700" />
        <h2 className="text-xl font-semibold text-[var(--bc-ink)]">登入方式</h2>
      </div>

      <div className="space-y-4">
        {/* LINE 帳號連結卡片 */}
        <Card className="rounded-[16px] border border-emerald-100 bg-white shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#06C755]">
                  <span className="text-white font-bold text-sm">LINE</span>
                </div>
                <div>
                  <CardTitle className="text-lg">LINE 帳號</CardTitle>
                  <CardDescription>
                    連結 LINE 帳號，之後可以更快登入。
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
                <div className="rounded-[14px] bg-emerald-50 p-3">
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
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUnlinkLineAccount}
                    disabled={linkingInProgress}
                    className="border-red-200 text-red-600 hover:bg-red-50"
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
                <div className="rounded-[14px] bg-slate-50 p-3">
                  <p className="text-sm text-[var(--bc-ink-3)]">
                    尚未連結 LINE 帳號。連結後可以：
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--bc-ink-3)]">
                    <li>• 使用 LINE 帳號快速登入</li>
                    <li>• 同步 LINE 個人資料照片</li>
                    <li>• 享受更便捷的使用體驗</li>
                  </ul>
                </div>

                <Button
                  onClick={onLinkLineAccount}
                  disabled={linkingInProgress}
                  className="w-full rounded-[14px] bg-[#06C755] text-white hover:bg-[#05b04a]"
                >
                  {linkingInProgress ? (
                    <>
                      <Loader size="sm" />
                      連結中
                    </>
                  ) : (
                    "連結 LINE 帳號"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 其他社群平台預留位置 */}
        <Card className="rounded-[16px] border border-slate-200 bg-white shadow-none opacity-70">
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
