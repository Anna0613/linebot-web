import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar3 from '../components/Panels/Navbar3';
import Footer2 from '../components/LoginHome/Footer2';
import Mybot, { MybotRef } from '@/components/Editbot/Mybot';
import BotEditModal from '../components/Editbot/BotEditModal';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
}

const Editbot = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState<'name' | 'token' | 'secret' | 'all'>('name');
  const mybotRef = useRef<MybotRef>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const displayName = searchParams.get('display_name');

    const verify = async () => {
      setLoading(true);
      if (token) {
        localStorage.setItem('auth_token', token);
        const userData = await verifyLineToken(token);
        if (userData) {
          setUser(userData);
          setLoading(false);
        } else {
          setError('LINE Token 驗證失敗');
          navigate('/line-login');
        }
      } else if (displayName) {
        setUser({ display_name: displayName });
        setLoading(false);
      } else {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          const userData = await verifyLineToken(storedToken);
          if (userData) {
            setUser(userData);
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

  const verifyLineToken = async (token: string): Promise<User | null> => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error('Token 驗證失敗');
      return await response.json();
    } catch (error) {
      console.error('驗證 LINE token 錯誤:', error);
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
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
              if (response.ok) {
          const data = await response.json();
          
          // 檢查新的 API 回應格式 (authenticated + user)
          if (data.authenticated && data.user) {
            setUser({ 
              display_name: data.user.username, 
              username: data.user.username 
            });
          }
          // 相容舊格式：檢查 data.message 是否存在且格式正確
          else if (data.message && typeof data.message === 'string') {
            const messagePattern = /User (.+?) is logged in/;
            const match = data.message.match(messagePattern);
            
            if (match && match[1]) {
              const username = match[1];
              setUser({ display_name: username, username });
            } else {
              throw new Error('無法從回應中解析用戶名稱');
            }
          } else {
            throw new Error('無效的 API 回應格式');
          }
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

  // 直接處理編輯請求，不再需要中間的選項步驟
  const handleEdit = (botId: string, editType: 'name' | 'token' | 'secret' | 'all') => {
    setEditingBotId(botId);
    setEditType(editType);
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingBotId(null);
  };

  const handleBotUpdated = () => {
    // 重新載入Bot列表
    if (mybotRef.current && mybotRef.current.refreshBots) {
      mybotRef.current.refreshBots();
    }
    // 關閉模態框和重置狀態
    setShowEditModal(false);
    setEditingBotId(null);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFA]">
      <Navbar3 user={user} />
      <main className="pt-24 sm:pt-28 md:pt-32 flex flex-col items-center flex-1">
        <div className="w-full max-w-7xl px-4 sm:px-6 mb-16 sm:mb-20 md:mb-24 flex justify-center items-start">
          <div className="w-full max-w-4xl">
            <Mybot 
              onEdit={handleEdit} 
              ref={mybotRef}
            />
          </div>

          {/* 編輯模態框 */}
          {showEditModal && editingBotId && (
            <BotEditModal
              isOpen={showEditModal}
              onClose={handleEditModalClose}
              botId={editingBotId}
              editType={editType}
              onBotUpdated={handleBotUpdated}
            />
          )}
        </div>
      </main>
      <Footer2 />
    </div>
  );
};

export default Editbot;
