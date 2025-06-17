import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar3 from '../components/Panels/Navbar3';
import Footer from '../components/Index/Footer'
import Editoptions from '../components/Editbot/Editoptions';
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
        const username = data.message.split('User ')[1].split(' is logged in')[0];
        setUser({ display_name: username, username });
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

  const handleEdit = (botId: string) => {
    setEditingBotId(botId);
  };
  
  const handleEditClose = () => {
    setEditingBotId(null);
  };
  
  const handleEditConfirm = (option: string, botId?: string) => {
    const targetBotId = botId || editingBotId;
    if (!targetBotId) return;

    console.log(`Bot ${targetBotId} 修改項目: ${option}`);
    
    // 根據選項設置編輯類型並打開編輯模態框
    switch (option) {
      case 'name':
        setEditType('name');
        setShowEditModal(true);
        break;
      case 'message':
        // 目前 API 中沒有單獨的訊息欄位，可能需要修改 channel_token
        setEditType('token');
        setShowEditModal(true);
        break;
      case 'logic':
        // Bot 邏輯可能涉及多個欄位，或者跳轉到其他頁面
        // 這裡暫時打開完整編輯模態框
        setEditType('all');
        setShowEditModal(true);
        break;
      default:
        console.log('未知的修改選項');
    }
    
    // 不要立即關閉 editingBotId，因為我們需要它來傳遞給 BotEditModal
    // setEditingBotId(null);
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
    <div>
      <Navbar3 user={user} />
      <main className="pt-32 flex flex-col items-center">
        <div className="flex flex-row gap-[35px] justify-center items-start px-6 mb-24">
          <Mybot 
            onEdit={handleEdit} 
            ref={mybotRef}
          />
          {editingBotId !== null && (
            <Editoptions 
              onClose={handleEditClose} 
              onConfirm={handleEditConfirm} 
              botId={editingBotId}
            />
          )}
        </div>
      </main>
      <Footer />
      
      {/* Bot 編輯模態框 */}
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
  );

};

export default Editbot;
