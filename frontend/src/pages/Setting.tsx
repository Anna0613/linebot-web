import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Navbar2 from "@/components/LoginHome/Navbar2";
import Footer from "@/components/Index/Footer";
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  email?: string;
  username?: string;
  isLineUser?: boolean;
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
  const [userImage, setUserImage] = useState<string | null>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    const displayNameParam = searchParams.get('display_name');

    const verify = async () => {
      setLoading(true);
      if (token) {
        localStorage.setItem('auth_token', token);
        const userData = await verifyToken(token);
        if (userData) {
          setUser(userData);
          setDisplayName(userData.display_name);
          setEmail(userData.email || "");
          setUserImage(userData.picture_url || null);
        } else {
          setError('驗證失敗，請重新登入');
          navigate('/line-login');
        }
        setLoading(false);
      } else if (displayNameParam) {
        const fallbackUser = { display_name: displayNameParam };
        setUser(fallbackUser);
        setDisplayName(displayNameParam);
        setLoading(false);
      } else {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          const userData = await verifyToken(storedToken);
          if (userData) {
            setUser(userData);
            setDisplayName(userData.display_name);
            setEmail(userData.email || "");
            setUserImage(userData.picture_url || null);
            setLoading(false);
          } else {
            setTimeout(() => checkLoginStatus(), 3000);
          }
        } else {
          setTimeout(() => checkLoginStatus(), 3000);
        }
      }
    };

    verify();
  }, [searchParams, navigate]);
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
            'Accept': 'application/json'
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
            'Authorization': `Bearer ${token}`
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
        isLineUser: true
      };
    } catch (error) {
      console.error('驗證 token 錯誤:', error);
      return null;
    }
  };
  const nativeFetch = window.fetch.bind(window);
  const checkLoginStatus = async () => {
    try {
      const response = await nativeFetch(getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const username = data.message.split('User ')[1].split(' is logged in')[0];
        const fallbackUser = { display_name: username, username };
        setUser(fallbackUser);
        setDisplayName(username);
      } else {
        const errorData = await response.json();
        console.error('check_login error:', errorData);
        setError('請先登入');
        navigate('/login');
      }
      setLoading(false);
    } catch (error) {
      console.error('檢查登入狀態錯誤:', error);
      setError('請先登入');
      navigate('/login');
      setLoading(false);
    }
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
    const token = localStorage.getItem('auth_token');
    if (!user || !token) {
      console.error('No user data or token available');
      return;
    }

    // 將當前用戶資訊作為查詢參數傳遞
    const queryParams = new URLSearchParams({
      linking_user_id: user.username || '',
      token: token
    });
    
    navigate(`/line-login?${queryParams.toString()}`);
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.DISCONNECT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        setUser(prev => prev ? { ...prev, isLineUser: false, line_id: undefined } : null);
      } else {
        const errorData = await response.json();
        console.error('中斷 LINE 連結失敗:', errorData);
      }
    } catch (error) {
      console.error('中斷 LINE 連結時發生錯誤:', error);
    }
  };

  const handleDeleteAccount = () => {
    alert("⚠️ 你點了刪除帳號（這裡可改成 API 呼叫）");
  };

  if (loading) return <div className="p-10 text-center">載入中...</div>;

  return (
    <>
      <Navbar2 user={user} />
      <div className="max-w-3xl mx-auto p-6 pt-32 space-y-8 pb-16">
        <h2 className="text-3xl font-bold mb-6">設定</h2>
        <section>
          <h3 className="text-lg font-semibold mb-2">個人檔案照片</h3>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              {userImage ? (
                <img src={userImage} alt="user" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-sm text-gray-600">
                  無照片
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {userImage && (
                <Button
                className="rounded-md h-9"
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirmModal(true)}
              >
                移除照片
              </Button>              
              )}
              <Button className="rounded-md h-9" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>變更照片</Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          </div>
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
                onClick={() => {
                  setUser((prev) => prev ? { ...prev, display_name: displayName } : null);
                  setIsEditingName(false);
                }}
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

        {!user?.isLineUser && (
        <section>
          <h3 className="text-lg font-semibold mb-1">電子郵件</h3>

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
                onClick={() => {
                  setUser((prev) => prev ? { ...prev, email: email } : null);
                  setIsEditingEmail(false);
                }}
              >
                儲存
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-base">{email}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingEmail(true)}
              >
                編輯
              </Button>
            </div>
          )}
        </section>
      )}

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
                onClick={() => user?.isLineUser ? handleDisconnect() : handleConnect()}
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
