"""
郵件服務模組
處理郵件發送相關功能
"""
import asyncio
from typing import List
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from itsdangerous import URLSafeTimedSerializer
from app.config import settings
import threading

class EmailService:
    """郵件服務類別"""
    
    def __init__(self):
        """初始化郵件配置"""
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_USERNAME,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_USE_TLS,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )
        self.fastmail = FastMail(self.conf)
    
    @staticmethod
    def _get_email_service():
        """取得郵件服務實例"""
        return EmailService()
    
    async def _send_email_async(self, email: str, subject: str, template: str) -> None:
        """異步發送郵件"""
        if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
            print(f"郵件配置未完成，無法發送至 {email}")
            return
            
        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=template,
            subtype=MessageType.html
        )
        
        try:
            await self.fastmail.send_message(message)
            print(f"郵件已成功發送至 {email}")
        except Exception as e:
            print(f"郵件發送失敗至 {email}: {str(e)}")
            raise e
    
    def _send_email_sync(self, email: str, subject: str, template: str) -> None:
        """同步發送郵件（在新的線程中運行異步代碼）"""
        def run_async():
            try:
                # 創建新的事件循環
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                # 運行異步郵件發送
                loop.run_until_complete(self._send_email_async(email, subject, template))
            except Exception as e:
                print(f"郵件發送失敗至 {email}: {str(e)}")
            finally:
                loop.close()
        
        # 在新線程中運行異步代碼
        thread = threading.Thread(target=run_async)
        thread.start()
        thread.join()  # 等待線程完成
    
    @staticmethod
    def send_verification_email(email: str) -> None:
        """發送驗證郵件"""
        # 生成驗證 token
        serializer = URLSafeTimedSerializer(settings.FLASK_SECRET_KEY)
        token = serializer.dumps(email, salt='email-verify')
        
        # 構建驗證連結
        verify_url = f"{settings.FRONTEND_URL}/email-verification?token={token}"
        
        # 郵件模板
        email_template = f"""
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>信箱驗證</title>
            <style>
                body {{
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    color: #333;
                    margin-bottom: 30px;
                }}
                .content {{
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }}
                .verify-button {{
                    display: inline-block;
                    background-color: #06c755;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .verify-button:hover {{
                    background-color: #05b84d;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #888;
                    font-size: 12px;
                    text-align: center;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 15px 0;
                    color: #856404;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🤖 LineBot-Web 信箱驗證</h1>
                </div>
                
                <div class="content">
                    <p>親愛的用戶您好，</p>
                    <p>感謝您註冊 LineBot-Web 服務！為了確保您的帳戶安全，請點擊下方按鈕完成信箱驗證：</p>
                    
                    <div style="text-align: center;">
                        <a href="{verify_url}" class="verify-button">驗證信箱</a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ 重要提醒：</strong>
                        <ul>
                            <li>此驗證連結將在 24 小時後失效</li>
                            <li>如果您沒有註冊 LineBot-Web 帳戶，請忽略此郵件</li>
                            <li>請勿將此連結分享給他人</li>
                        </ul>
                    </div>
                    
                    <p>如果按鈕無法點擊，請複製以下連結至瀏覽器：</p>
                    <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                        {verify_url}
                    </p>
                </div>
                
                <div class="footer">
                    <p>此郵件由 LineBot-Web 系統自動發送，請勿回覆。</p>
                    <p>如有任何問題，請聯繫我們的客服團隊。</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 發送郵件
        try:
            email_service = EmailService._get_email_service()
            email_service._send_email_sync(email, "【LineBot-Web】信箱驗證", email_template)
        except Exception as e:
            print(f"郵件發送失敗: {str(e)}")
            raise e  # 重新拋出異常，讓上層能正確處理
    
    @staticmethod
    def send_password_reset_email(email: str) -> None:
        """發送密碼重設郵件"""
        # 生成重設 token
        serializer = URLSafeTimedSerializer(settings.FLASK_SECRET_KEY)
        token = serializer.dumps(email, salt='password-reset')
        
        # 構建重設連結
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        # 郵件模板
        email_template = f"""
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>密碼重設</title>
            <style>
                body {{
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    color: #333;
                    margin-bottom: 30px;
                }}
                .content {{
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }}
                .reset-button {{
                    display: inline-block;
                    background-color: #dc3545;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .reset-button:hover {{
                    background-color: #c82333;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #888;
                    font-size: 12px;
                    text-align: center;
                }}
                .warning {{
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 15px 0;
                    color: #721c24;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔒 LineBot-Web 密碼重設</h1>
                </div>
                
                <div class="content">
                    <p>親愛的用戶您好，</p>
                    <p>我們收到您的密碼重設請求。如果這是您本人的操作，請點擊下方按鈕重設密碼：</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="reset-button">重設密碼</a>
                    </div>
                    
                    <div class="warning">
                        <strong>🚨 安全提醒：</strong>
                        <ul>
                            <li>此重設連結將在 1 小時後失效</li>
                            <li>如果您沒有要求重設密碼，請忽略此郵件</li>
                            <li>為了您的帳戶安全，請勿將此連結分享給他人</li>
                            <li>建議使用強密碼，包含英文大小寫、數字和特殊符號</li>
                        </ul>
                    </div>
                    
                    <p>如果按鈕無法點擊，請複製以下連結至瀏覽器：</p>
                    <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                        {reset_url}
                    </p>
                </div>
                
                <div class="footer">
                    <p>此郵件由 LineBot-Web 系統自動發送，請勿回覆。</p>
                    <p>如有任何問題，請聯繫我們的客服團隊。</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 發送郵件
        try:
            email_service = EmailService._get_email_service()
            email_service._send_email_sync(email, "【LineBot-Web】密碼重設", email_template)
        except Exception as e:
            print(f"郵件發送失敗: {str(e)}")
            raise e  # 重新拋出異常，讓上層能正確處理 