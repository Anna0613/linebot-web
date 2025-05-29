import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import Navbar2 from "@/components/LoginHome/Navbar2";
import Footer from "@/components/Index/Footer";
import AvatarUpload from "@/components/AvatarUpload/AvatarUpload";
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';
import { AuthService } from '../services/auth';
import { ApiClient } from '../services/api';
import { useToast } from '@/hooks/use-toast';

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  email?: string;
  email_verified?: boolean;
  username?: string;
  isLineUser?: boolean;
  avatar?: string;
}

const Setting: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState(""); 
  const [isEditingName, setIsEditingName] = useState(false);
  const [email, setEmail] = useState("");            
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isResendingEmailVerification, setIsResendingEmailVerification] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  const { toast } = useToast();
  const apiClient = ApiClient.getInstance();

  useEffect(() => {
    const token = searchParams.get('token');
    const displayNameParam = searchParams.get('display_name');

    const verify = async () => {
      setLoading(true);
      
      try {
        // 如果URL中有token，先存儲它
        if (token) {
          console.log('儲存URL中的token到localStorage');
          AuthService.setToken(token);
        }
        
        // 統一使用AuthService獲取token
        const storedToken = AuthService.getToken();
        
        if (storedToken) {
          const userData = await verifyToken(storedToken);
          if (userData) {
            setUser(userData);
            setDisplayName(userData.display_name);
            setEmail(userData.email || "");
            
            // 為一般用戶載入頭像和完整資料
            if (!userData.isLineUser) {
              await loadUserAvatar();
              // 載入完整的用戶資料，包括email
              await loadUserProfile();
            } else {
              setUserImage(userData.picture_url || null);
            }
          } else {
            setError('驗證失敗，請重新登入');
            AuthService.removeToken();
            navigate('/login');
          }
        } else if (displayNameParam) {
          // 回退方案：使用URL參數中的display_name
          const fallbackUser = { 
            display_name: displayNameParam,
            isLineUser: false,
          };
          setUser(fallbackUser);
          setDisplayName(displayNameParam);
        } else {
          setError('請先登入');
          navigate('/login');
        }
      } catch (error) {
        console.error('驗證過程發生錯誤:', error);
        setError('驗證失敗，請重新登入');
        AuthService.removeToken();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [searchParams, navigate]);

  // 載入用戶頭像
  const loadUserAvatar = async () => {
    try {
      const response = await apiClient.getAvatar();
      if (response.status === 200 && response.data?.avatar) {
        setUserImage(response.data.avatar);
      }
    } catch (error) {
      console.error('載入頭像失敗:', error);
    }
  };

  // 載入用戶完整資料
  const loadUserProfile = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.status === 200 && response.data) {
        const profileData = response.data;
        // 更新email資料
        setEmail(profileData.email || "");
        setEmailVerified(profileData.email_verified || false);
        // 更新用戶資料
        setUser(prev => prev ? { 
          ...prev, 
          email: profileData.email,
          email_verified: profileData.email_verified,
          username: profileData.username 
        } : null);
      }
    } catch (error) {
      console.error('載入用戶資料失敗:', error);
    }
  };

  const verifyToken = async (token: string): Promise<User | null> => {
    try {
      // 從token中解析登入類型
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const loginType = tokenData.login_type;

      let response;
      if (loginType === 'line') {
        // LINE登入驗證
        response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });
      } else {
        // 一般帳號驗證
        response = await fetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN), {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      if (!response.ok) throw new Error('Token 驗證失敗');
      const data = await response.json();

      // 針對一般帳號登入的回應格式處理
      if (loginType !== 'line') {
        const username = data.message.split('User ')[1].split(' is logged in')[0];
        return {
          display_name: username,
          username: username,
          email: data.email || '',
          isLineUser: false,
        };
      }

      // LINE登入的回應已經符合User格式
      return {
        ...data,
        isLineUser: true,
      };
    } catch (error) {
      console.error('驗證 token 錯誤:', error);
      return null;
    }
  };

  // 處理頭像變更
  const handleAvatarChange = async (avatar: string | null) => {
    if (!user?.isLineUser) {
      setAvatarLoading(true);
      try {
        if (avatar) {
          const response = await apiClient.updateAvatar(avatar);
          if (response.status === 200) {
            setUserImage(avatar);
            // 觸發自定義事件通知其他組件更新頭像
            window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatar } }));
            toast({
              title: "頭像更新成功",
              description: "您的頭像已經更新",
            });
          } else {
            throw new Error(response.error || '更新頭像失敗');
          }
        } else {
          const response = await apiClient.deleteAvatar();
          if (response.status === 200) {
            setUserImage(null);
            // 觸發自定義事件通知其他組件更新頭像
            window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatar: null } }));
            toast({
              title: "頭像已刪除",
              description: "您的頭像已經刪除",
            });
          } else {
            throw new Error(response.error || '刪除頭像失敗');
          }
        }
      } catch (error) {
        console.error('頭像操作失敗:', error);
        toast({
          variant: "destructive",
          title: "操作失敗",
          description: error instanceof Error ? error.message : '操作失敗，請稍後再試',
        });
      } finally {
        setAvatarLoading(false);
      }
    }
  };

  // 處理頭像刪除
  const handleAvatarDelete = async () => {
    await handleAvatarChange(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setUserImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setUserImage(null);
  };

  const handleConnect = () => {
    // 確保有用戶資訊和token
    const token = AuthService.getToken();
    if (!user || !token) {
      console.error('No user data or token available');
      return;
    }

    // 將當前用戶資訊作為查詢參數傳遞
    const queryParams = new URLSearchParams({
      linking_user_id: user.username || '',
      token: token,
    });
    
    navigate(`/line-login?${queryParams.toString()}`);
  };

  const handleDisconnect = async () => {
    try {
      const token = AuthService.getToken();
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.DISCONNECT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        setUser(prev => (prev ? { ...prev, isLineUser: false, line_id: undefined } : null));
      } else {
        const errorData = await response.json();
        console.error('中斷 LINE 連結失敗:', errorData);
      }
    } catch (error) {
      console.error('中斷 LINE 連結時發生錯誤:', error);
    }
  };

  const handleDeleteAccount = () => {
    console.warn("⚠️ 你點了刪除帳號（這裡可改成 API 呼叫）");
  };

  // 處理名稱更新
  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      toast({
        variant: "destructive",
        title: "名稱不能為空",
        description: "請輸入有效的名稱",
      });
      return;
    }

    try {
      const response = await apiClient.updateProfile({ username: displayName });
      if (response.status === 200) {
        // 如果用戶名稱有更新且返回了新的 token，更新本地存儲的 token
        if (response.data?.username_changed && response.data?.new_token) {
          AuthService.setToken(response.data.new_token);
          console.log('用戶名稱已更新，新 token 已保存');
        }
        
        setUser((prev) => (prev ? { ...prev, display_name: displayName, username: displayName } : null));
        setIsEditingName(false);
        toast({
          title: "名稱更新成功",
          description: "您的名稱已經更新",
        });
      } else {
        throw new Error(response.error || '更新名稱失敗');
      }
    } catch (error) {
      console.error('更新名稱失敗:', error);
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error instanceof Error ? error.message : '更新名稱失敗，請稍後再試',
      });
    }
  };

  // 處理電子郵件更新
  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "電子郵件不能為空",
        description: "請輸入有效的電子郵件",
      });
      return;
    }

    // 簡單的電子郵件格式驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        variant: "destructive",
        title: "電子郵件格式不正確",
        description: "請輸入有效的電子郵件格式",
      });
      return;
    }

    try {
      const response = await apiClient.updateProfile({ email: email });
      if (response.status === 200) {
        // 更新用戶狀態
        setUser((prev) => (prev ? { ...prev, email: email, email_verified: response.data.email_verified } : null));
        setEmailVerified(response.data.email_verified || false);
        setIsEditingEmail(false);
        
        // 檢查是否發送了驗證郵件
        if (response.data.email_verification_sent) {
          toast({
            title: "電子郵件更新成功",
            description: "驗證郵件已發送到您的新電子郵件地址，請查收並點擊驗證連結",
          });
        } else {
          toast({
            title: "電子郵件更新成功",
            description: "您的電子郵件已經更新",
          });
        }
      } else {
        throw new Error(response.error || '更新電子郵件失敗');
      }
    } catch (error) {
      console.error('更新電子郵件失敗:', error);
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error instanceof Error ? error.message : '更新電子郵件失敗，請稍後再試',
      });
    }
  };

  // 重新發送email驗證
  const handleResendEmailVerification = async () => {
    setIsResendingEmailVerification(true);
    try {
      const response = await apiClient.resendEmailVerification();
      if (response.status === 200) {
        toast({
          title: "驗證郵件已重新發送",
          description: "請檢查您的信箱並點擊驗證連結",
        });
      } else {
        throw new Error(response.error || '發送驗證郵件失敗');
      }
    } catch (error) {
      console.error('發送驗證郵件失敗:', error);
      toast({
        variant: "destructive",
        title: "發送失敗",
        description: error instanceof Error ? error.message : '發送驗證郵件失敗，請稍後再試',
      });
    } finally {
      setIsResendingEmailVerification(false);
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <>
      <Navbar2 user={user} />
      <div className="max-w-3xl mx-auto p-6 pt-32 space-y-8 pb-16">
        <h2 className="text-3xl font-bold mb-6">設定</h2>
        
        {/* 頭像上傳區域 */}
        <section>
          <h3 className="text-lg font-semibold mb-4">個人檔案照片</h3>
          {user?.isLineUser ? (
            // LINE用戶顯示現有頭像，不可編輯
            <div className="flex items-center gap-4">
              {userImage ? (
                <img src={userImage} alt="user" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-sm text-gray-600">
                  無照片
                </div>
              )}
              <p className="text-sm text-gray-500">LINE用戶的頭像來自LINE平台，無法在此修改。</p>
            </div>
          ) : (
            // 一般用戶可以上傳頭像
            <AvatarUpload
              currentAvatar={userImage}
              onAvatarChange={handleAvatarChange}
              onAvatarDelete={handleAvatarDelete}
              username={user?.username || user?.display_name || 'User'}
              disabled={avatarLoading}
            />
          )}
        </section>

        <hr className="border-t border-gray-300" />

        <section>
          <h3 className="text-lg font-semibold mb-1">名稱</h3>

          {isEditingName ? (
            <div className="flex justify-between items-center gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-[600px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDisplayName(user?.display_name || "");
                    setIsEditingName(false);
                  }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateDisplayName}
                >
                  儲存
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-base">{displayName}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingName(true)}
              >
                編輯
              </Button>
            </div>
          )}
        </section>

        <hr className="border-t border-gray-300" />

        <section>
          <h3 className="text-lg font-semibold mb-1">電子郵件</h3>

          {user?.isLineUser ? (
            // LINE用戶顯示email但不可編輯
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-base">{email || "未設定"}</span>
                {email && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    已驗證
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">LINE用戶無法修改電子郵件</span>
            </div>
          ) : (
            // 一般用戶可以編輯email
            <>
              {isEditingEmail ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-[600px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEmail(user?.email || "");
                      setIsEditingEmail(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdateEmail}
                  >
                    儲存
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{email || "未設定"}</span>
                      {email && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            emailVerified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {emailVerified ? '已驗證' : '未驗證'}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingEmail(true)}
                    >
                      編輯
                    </Button>
                  </div>
                  {email && !emailVerified && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-600">
                        請驗證您的電子郵件地址以確保帳戶安全
                      </span>
                      <Button
                        size="sm"
                        variant="link"
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                        onClick={handleResendEmailVerification}
                        disabled={isResendingEmailVerification}
                      >
                        {isResendingEmailVerification ? '發送中...' : '重新發送驗證郵件'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <hr className="border-t border-gray-300" />
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">已連結的社交帳號</h3>
          <p className="text-sm text-gray-500">你用於登入 LINE Bot 製作輔助系統 的服務</p>

          <div className="bg-gray-100 px-4 py-3 rounded">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src="/專題圖片/line-logo.svg" alt="LINE" className="w-10 h-10" />
                <div>
                  <div className="text-base font-semibold">LINE</div>
                  {user?.isLineUser && (
                    <div className="text-sm text-gray-700">{user?.display_name}</div>
                  )}
                </div>
              </div>
              <Button
                className="rounded-md h-9"
                variant="outline"
                size="sm"
                onClick={() => (user?.isLineUser ? handleDisconnect() : handleConnect())}
              >
                {user?.isLineUser ? '中斷連結' : '連接帳號'}
              </Button>
            </div>
          </div>
        </section>

        <hr className="border-t border-gray-300" />

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">密碼</h3>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              若要第一次為帳號新增密碼，你必須透過密碼重設頁面，我們才能驗證你的身分。
            </p>
            <Button
              className="rounded-md h-9 whitespace-nowrap"
              variant="outline"
              onClick={() => navigate("/forgetthepassword")}
            >
              前往密碼重設
            </Button>
          </div>
        </section>

        <hr className="border-t border-gray-300" />

        <section className="space-y-4 pb-0">
          <h3 className="text-lg font-bold text-red-600">刪除帳戶</h3>
          <p className="text-sm text-gray-500">一旦刪除您的帳戶，就無法恢復。請確定。</p>
          <Button className="rounded-md h-9" variant="destructive" onClick={handleDeleteAccount}>刪除帳號</Button>
        </section>
      </div>
      
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[300px] text-center shadow-lg">
            <h3 className="text-xl font-bold mb-4">確定要繼續？</h3>
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setUserImage(null);        
                  setShowConfirmModal(false); 
                }}
              >
                移除照片
              </Button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
};

export default Setting;
