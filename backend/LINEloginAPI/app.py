from flask import Flask, request, redirect, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import urllib.parse
from datetime import datetime, timezone
from auth_service import create_access_token, verify_token
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import logging
import sys
from sqlalchemy.exc import OperationalError
from sqlalchemy.sql import text
import tenacity
import secrets
import string
from werkzeug.security import generate_password_hash
import time

# 配置日誌
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 載入環境變數
load_dotenv(override=True)

# 驗證關鍵環境變數
required_env_vars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME', 
                    'LINE_CHANNEL_ID', 'LINE_CHANNEL_SECRET', 'LINE_REDIRECT_URI', 
                    'FLASK_SECRET_KEY', 'JWT_SECRET', 'FRONTEND_URL']
for var in required_env_vars:
    if not os.getenv(var):
        logger.error(f"Missing required environment variable: {var}")
        sys.exit(1)

app = Flask(__name__)

# 定義允許的來源清單
allowed_origins = [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "https://127.0.0.1:8080",
    "http://line-login.jkl921102.org",
    "https://line-login.jkl921102.org"
]

if os.getenv('FRONTEND_URL'):
    allowed_origins.append(os.getenv('FRONTEND_URL'))

# 配置 CORS
CORS(app, 
     supports_credentials=True,
     resources={r"/api/*": {
         "origins": allowed_origins,
         "allow_headers": ["Content-Type", "Authorization", "Referer", "User-Agent", 
                         "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "expose_headers": ["Set-Cookie"]
     }}
)

# 添加自定義 CORS 處理
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        # 檢查是否為允許的來源
        if origin in allowed_origins or any(origin.startswith(allowed) for allowed in allowed_origins):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# 資料庫配置
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')

logger.debug(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")

db = SQLAlchemy(app)

# User 模型
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, server_default=db.text("uuid_generate_v4()"))
    username = db.Column(db.String(255), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True)
    email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    line_account = db.relationship('LineUser', backref='user', uselist=False)

    def __repr__(self):
        return f"<User {self.username}>"

# LINE User 模型
class LineUser(db.Model):
    __tablename__ = 'line_users'
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, server_default=db.text("uuid_generate_v4()"))
    user_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    line_id = db.Column(db.String(255), unique=True, nullable=False)
    display_name = db.Column(db.String(255))
    picture_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<LineUser {self.display_name}>"

# 重試機制
@tenacity.retry(
    stop=tenacity.stop_after_attempt(3),
    wait=tenacity.wait_fixed(2),
    retry=tenacity.retry_if_exception_type(OperationalError),
    before_sleep=lambda retry_state: logger.debug(f"Retrying database connection: attempt {retry_state.attempt_number}")
)
def check_database_connection():
    db.session.execute(text("SELECT 1"))
    return True

# 初始化資料庫
def init_database():
    with app.app_context():
        try:
            # 檢查資料庫連線
            if check_database_connection():
                logger.info("Database connection successful")

            # 啟用 uuid-ossp 擴展
            db.session.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
            db.session.commit()
            logger.info("uuid-ossp extension enabled")

            # 創建所有表
            db.create_all()
            logger.info("Database tables created successfully")

            # 驗證 users 表是否存在
            result = db.session.execute(
                text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')")
            )
            table_exists = result.scalar()
            if table_exists:
                logger.info("Users table exists")
            else:
                logger.error("Users table does not exist")
                sys.exit(1)

        except OperationalError as e:
            logger.error(f"Database connection failed: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}", exc_info=True)
            sys.exit(1)

init_database()

# 診斷路由
@app.route('/api/database-status', methods=['GET'])
def database_status():
    try:
        # 檢查連線
        db.session.execute(text("SELECT 1"))
        # 檢查 users 表
        table_exists = db.session.execute(
            text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')")
        ).scalar()
        # 檢查 uuid-ossp 擴展
        extension_enabled = db.session.execute(
            text("SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'uuid-ossp')")
        ).scalar()
        # 檢查用戶數量
        user_count = db.session.query(User).count()
        
        return jsonify({
            "connection": "successful",
            "users_table_exists": table_exists,
            "uuid_ossp_enabled": extension_enabled,
            "user_count": user_count
        }), 200
    except Exception as e:
        logger.error(f"Database status check failed: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/line-login')
def line_login():
    client_id = os.getenv('LINE_CHANNEL_ID')
    redirect_uri = os.getenv('LINE_REDIRECT_URI')
    if not client_id or not redirect_uri:
        logger.error("LINE_CHANNEL_ID or LINE_REDIRECT_URI not set")
        return jsonify({"error": "Server configuration error"}), 500

    state = os.urandom(16).hex()
    login_url = (
        f"https://access.line.me/oauth2/v2.1/authorize?"
        f"response_type=code&client_id={client_id}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"state={state}&scope=profile%20openid%20email"
    )
    logger.debug(f"Generated login_url: {login_url}")
    return jsonify({"login_url": login_url})

# 支持多個回調路徑
@app.route('/')
@app.route('/line/callback')
@app.route('/line-login')
def line_callback():
    code = request.args.get('code')
    state = request.args.get('state')
    
    logger.debug(f"Callback received: code={code}, state={state}")
    if not code:
        logger.error("Authorization code missing")
        return jsonify({"error": "Authorization code missing"}), 400

    token_url = "https://api.line.me/oauth2/v2.1/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": os.getenv('LINE_REDIRECT_URI'),
        "client_id": os.getenv('LINE_CHANNEL_ID'),
        "client_secret": os.getenv('LINE_CHANNEL_SECRET')
    }

    try:
        response = requests.post(token_url, headers=headers, data=data)
        response.raise_for_status()
        tokens = response.json()
        access_token = tokens.get('access_token')
        logger.debug(f"Access token obtained: {access_token}")
    except requests.RequestException as e:
        logger.error(f"Failed to obtain access token: {e}")
        return jsonify({"error": "Failed to obtain access token"}), 400

    profile_url = "https://api.line.me/v2/profile"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        profile_response = requests.get(profile_url, headers=headers)
        profile_response.raise_for_status()
        profile = profile_response.json()
        line_id = profile.get('userId')
        display_name = profile.get('displayName')
        picture_url = profile.get('pictureUrl')
        logger.debug(f"User profile: line_id={line_id}, display_name={display_name}")
        logger.debug(f"Complete LINE profile data: {profile}")
    except requests.RequestException as e:
        logger.error(f"Failed to fetch user profile: {e}")
        return jsonify({"error": "Failed to fetch user profile"}), 400

    try:
        # 確保資料符合資料庫欄位限制
        display_name = display_name[:255] if display_name else None
        picture_url = picture_url[:255] if picture_url else None

        line_user = LineUser.query.filter_by(line_id=line_id).first()
        if line_user:
            logger.info(f"Existing LINE user found: line_id={line_id}, updating data")
            line_user.display_name = display_name
            line_user.picture_url = picture_url
            db.session.commit()
            logger.info(f"LINE user updated: line_id={line_id}, display_name={display_name}")
            user = line_user.user
        else:
            # 嘗試從 id_token 中獲取 email
            email = None
            try:
                id_token = tokens.get('id_token')
                if id_token:
                    id_token_info = verify_token(id_token, secret=os.getenv('LINE_CHANNEL_SECRET'), 
                                               verify_exp=False,
                                               audience=os.getenv('LINE_CHANNEL_ID'))
                    email = id_token_info.get('email')
                    logger.debug(f"Got email from id_token: {email}")
            except Exception as e:
                logger.error(f"Failed to decode id_token: {e}")

            if email:
                # 檢查 email 是否已被使用
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    logger.info(f"Found existing user with email: {email}")
                    # 如果用戶已存在，創建或更新其 LINE 連結
                    line_user = LineUser.query.filter_by(user_id=existing_user.id).first()
                    if line_user:
                        line_user.line_id = line_id
                        line_user.display_name = display_name
                        line_user.picture_url = picture_url
                    else:
                        line_user = LineUser(
                            user_id=existing_user.id,
                            line_id=line_id,
                            display_name=display_name,
                            picture_url=picture_url
                        )
                        db.session.add(line_user)
                    db.session.commit()
                    user = existing_user
                    logger.info(f"Updated existing user with LINE info: {line_id}")
                else:
                    # 創建新用戶及其 LINE 連結
                    random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
                    hashed_password = generate_password_hash(random_password)
                    
                    # 創建基本用戶
                    new_user = User(
                        username=display_name,
                        password=hashed_password,
                        email=email,
                        email_verified=True  # LINE 用戶自動驗證
                    )
                    db.session.add(new_user)
                    db.session.flush()  # 取得新用戶 ID
                    
                    # 創建 LINE 用戶連結
                    line_user = LineUser(
                        user_id=new_user.id,
                        line_id=line_id,
                        display_name=display_name,
                        picture_url=picture_url
                    )
                    db.session.add(line_user)
                    db.session.commit()
                    user = new_user
                    logger.info(f"New user and LINE account created with email: {email}")
            else:
                # 如果沒有 email，創建新用戶和 LINE 連結
                random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
                hashed_password = generate_password_hash(random_password)
                
                # 創建基本用戶
                new_user = User(
                    username=display_name,
                    password=hashed_password,
                    email_verified=True  # LINE 用戶自動驗證
                )
                db.session.add(new_user)
                db.session.flush()  # 取得新用戶 ID
                
                # 創建 LINE 用戶連結
                line_user = LineUser(
                    user_id=new_user.id,
                    line_id=line_id,
                    display_name=display_name,
                    picture_url=picture_url
                )
                db.session.add(line_user)
                db.session.commit()
                user = new_user
                logger.info(f"New user and LINE account created without email: {line_id}")
    except Exception as e:
        logger.error(f"Database error in line callback: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({"error": "Failed to save user data", "details": str(e)}), 500

    try:
        token = create_access_token({
            'username': user.username,
            'line_id': user.line_account.line_id if user.line_account else None,
            'login_type': 'line'
        })
        logger.debug(f"JWT token generated: {token}")
    except Exception as e:
        logger.error(f"JWT encoding error: {e}")
        return jsonify({"error": "Failed to generate token"}), 500

    frontend_url = f"{os.getenv('FRONTEND_URL')}/index2?token={token}&display_name={urllib.parse.quote(display_name or '')}"
    logger.debug(f"Redirecting to: {frontend_url}")
    return redirect(frontend_url)

@app.route('/api/verify-token', methods=['POST'])
def verify_line_token():
    token = request.json.get('token')
    logger.debug(f"Verifying token: {token}")
    
    if not token:
        logger.error("Token missing")
        return jsonify({"error": "Token is missing"}), 400
    
    # 增加重試機制
    max_retries = 3
    retry_count = 0
    retry_delay = 1  # 初始延遲（秒）
    
    while retry_count < max_retries:
        try:
            decoded = verify_token(token)
            if decoded.get('login_type') != 'line':
                logger.error("Not a LINE login token")
                return jsonify({"error": "Invalid token type"}), 401
                
            line_user = LineUser.query.filter_by(line_id=decoded['line_id']).first()
            if not line_user:
                logger.error("LINE account not found")
                return jsonify({"error": "LINE account not found"}), 404
                
            user = line_user.user
            if user:
                logger.info(f"Token verified for user: {line_user.line_id}")
                return jsonify({
                    'line_id': line_user.line_id,
                    'display_name': line_user.display_name,
                    'picture_url': line_user.picture_url,
                    'username': user.username,
                    'email': user.email
                })
                
            logger.error("User not found")
            return jsonify({"error": "User not found"}), 404
            
        except ExpiredSignatureError as e:
            logger.error(f"Token expired: {str(e)}")
            return jsonify({"error": "Token has expired"}), 401
            
        except InvalidTokenError as e:
            # 對於無效的 token，嘗試重試
            retry_count += 1
            if retry_count < max_retries:
                logger.warning(f"Invalid token, retrying ({retry_count}/{max_retries}): {str(e)}")
                time.sleep(retry_delay)
                retry_delay *= 2  # 指數退避
            else:
                logger.error(f"Invalid token after {max_retries} retries: {str(e)}")
                return jsonify({"error": str(e)}), 401
                
        except Exception as e:
            logger.error(f"Unexpected error during token verification: {str(e)}")
            return jsonify({"error": "An unexpected error occurred"}), 500
            
    # 如果所有重試都失敗
    return jsonify({"error": "Failed to verify token after multiple attempts"}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('LINE_LOGIN_PORT', 5502)), debug=True, use_reloader=False)
