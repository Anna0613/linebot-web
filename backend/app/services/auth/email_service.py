"""
郵件服務模組
處理郵件發送相關功能
"""
import asyncio
import logging
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
        logger = logging.getLogger(__name__)
        if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
            logger.warning("郵件配置未完成，無法發送", extra={"email": email})
            return
            
        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=template,
            subtype=MessageType.html
        )
        
        try:
            await self.fastmail.send_message(message)
            logger.info("郵件已成功發送", extra={"email": email, "subject": subject})
        except Exception as e:
            logger.error("郵件發送失敗", extra={"email": email, "error": str(e)})
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
                logging.getLogger(__name__).error("郵件發送失敗", extra={"email": email, "error": str(e)})
            finally:
                loop.close()
        
        # 在新線程中運行異步代碼
        thread = threading.Thread(target=run_async, daemon=True)
        thread.start()
    
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
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Helvetica Neue", Arial, sans-serif;
                    background: #f8fafc;
                    color: #0f172a;
                    margin: 0;
                    padding: 0;
                }}
                a {{
                    color: inherit;
                }}
                .page {{
                    background: linear-gradient(135deg, #ecfdf5 0%, #f8fafc 48%, #f6efe5 100%);
                    padding: 36px 16px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.92);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    border-radius: 8px;
                    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.10);
                }}
                .header {{
                    padding: 32px 32px 20px;
                    text-align: left;
                }}
                .kicker {{
                    margin: 0 0 10px;
                    color: #047857;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }}
                h1 {{
                    margin: 0;
                    color: #0f172a;
                    font-size: 28px;
                    line-height: 1.25;
                    font-weight: 700;
                }}
                .content {{
                    padding: 0 32px 32px;
                    color: #475569;
                    font-size: 15px;
                    line-height: 1.7;
                }}
                .verify-button {{
                    display: inline-block;
                    background: #16a34a;
                    color: #ffffff !important;
                    padding: 13px 22px;
                    text-decoration: none !important;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 700;
                    box-shadow: 0 12px 24px rgba(22, 163, 74, 0.22);
                }}
                .verify-button:link,
                .verify-button:visited,
                .verify-button:hover,
                .verify-button:active {{
                    color: #ffffff !important;
                    text-decoration: none !important;
                }}
                .verify-button span {{
                    color: #ffffff !important;
                    text-decoration: none !important;
                    -webkit-text-fill-color: #ffffff;
                }}
                .notice {{
                    margin: 24px 0;
                    padding: 16px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                }}
                .notice-title {{
                    margin: 0 0 8px;
                    color: #1e293b;
                    font-size: 14px;
                    font-weight: 700;
                }}
                .notice ul {{
                    margin: 0;
                    padding-left: 20px;
                }}
                .link-box {{
                    margin: 12px 0 0;
                    padding: 12px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    color: #334155;
                    font-size: 13px;
                    line-height: 1.6;
                    word-break: break-all;
                }}
                .footer {{
                    padding: 20px 32px 28px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.6;
                    text-align: left;
                }}
                @media (max-width: 480px) {{
                    .page {{
                        padding: 24px 12px;
                    }}
                    .header {{
                        padding: 28px 22px 16px;
                    }}
                    .content {{
                        padding: 0 22px 28px;
                    }}
                    .footer {{
                        padding: 18px 22px 24px;
                    }}
                    h1 {{
                        font-size: 24px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="page">
                <div class="container">
                    <div class="header">
                        <p class="kicker">Account Verification</p>
                        <h1>完成信箱驗證</h1>
                    </div>
                    <div class="content">
                        <p>您好，</p>
                        <p>感謝您註冊 BotCraft。請先完成信箱驗證，帳號啟用後即可登入 LINE Bot 工作台。</p>

                        <div style="margin: 28px 0;">
                            <a href="{verify_url}" class="verify-button" style="display:inline-block;background:#16a34a;color:#ffffff !important;padding:13px 22px;text-decoration:none !important;border-radius:8px;font-size:14px;font-weight:700;box-shadow:0 12px 24px rgba(22, 163, 74, 0.22);">
                                <span style="color:#ffffff !important;text-decoration:none !important;-webkit-text-fill-color:#ffffff;">驗證電子郵件</span>
                            </a>
                        </div>

                        <div class="notice">
                            <p class="notice-title">驗證前請留意</p>
                            <ul>
                                <li>驗證連結將在 1 小時後失效。</li>
                                <li>完成驗證前，帳號無法登入工作台。</li>
                                <li>如果您沒有註冊 BotCraft，請忽略此郵件。</li>
                            </ul>
                        </div>

                        <p>如果按鈕無法開啟，請複製以下連結到瀏覽器：</p>
                        <div class="link-box">{verify_url}</div>
                    </div>
                    <div class="footer">
                        此郵件由 BotCraft 系統自動發送，請勿回覆。為了保護帳號安全，請勿將驗證連結轉寄給他人。
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 發送郵件
        try:
            email_service = EmailService._get_email_service()
            email_service._send_email_sync(email, "【BotCraft】完成信箱驗證", email_template)
            logging.getLogger(__name__).info("驗證郵件發送成功", extra={"email": email})
        except Exception as e:
            logging.getLogger(__name__).warning("驗證郵件發送失敗", extra={"email": email, "error": str(e)})
            # 不拋出異常，避免影響註冊流程
            # 在生產環境中，可以考慮記錄到日誌系統
    
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
                    <h1>🔒 BotCraft 密碼重設</h1>
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
                    <p>此郵件由 BotCraft 系統自動發送，請勿回覆。</p>
                    <p>如有任何問題，請聯繫我們的客服團隊。</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # 發送郵件
        try:
            email_service = EmailService._get_email_service()
            email_service._send_email_sync(email, "【BotCraft】密碼重設", email_template)
            logging.getLogger(__name__).info("密碼重設郵件發送成功", extra={"email": email})
        except Exception as e:
            logging.getLogger(__name__).error("密碼重設郵件發送失敗", extra={"email": email, "error": str(e)})
            # 對於密碼重設，郵件發送失敗應該拋出異常
            raise e
