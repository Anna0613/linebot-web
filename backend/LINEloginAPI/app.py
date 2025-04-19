from flask import Flask, request, redirect, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import urllib.parse
import jwt
from datetime import datetime, timedelta, timezone
import logging
import sys
from sqlalchemy.exc import OperationalError
from sqlalchemy.sql import text
import tenacity

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
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:8080",
    "http://192.168.0.112:8080",
    "https://line-login.jkl921102.org"
]}})

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
    line_id = db.Column(db.String(255), unique=True, nullable=False)
    display_name = db.Column(db.String(255))
    email = db.Column(db.String(255))
    picture_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.display_name}>"

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

        user = User.query.filter_by(line_id=line_id).first()
        if user:
            logger.info(f"Existing user found: line_id={line_id}, updating data")
            user.display_name = display_name
            user.picture_url = picture_url
            db.session.commit()
            logger.info(f"User updated: line_id={line_id}, display_name={display_name}")
        else:
            logger.debug(f"Creating new user with line_id={line_id}, display_name={display_name}, picture_url={picture_url}")
            user = User(
                line_id=line_id,
                display_name=display_name,
                picture_url=picture_url
            )
            db.session.add(user)
            db.session.commit()
            logger.info(f"New user created: line_id={line_id}, display_name={display_name}")
    except Exception as e:
        logger.error(f"Database error in line callback: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({"error": "Failed to save user data", "details": str(e)}), 500

    try:
        token = jwt.encode({
            'line_id': line_id,
            'exp': datetime.now(timezone.utc) + timedelta(hours=1)
        }, os.getenv('JWT_SECRET'), algorithm='HS256')
        logger.debug(f"JWT token generated: {token}")
    except Exception as e:
        logger.error(f"JWT encoding error: {e}")
        return jsonify({"error": "Failed to generate token"}), 500

    frontend_url = f"{os.getenv('FRONTEND_URL')}/index2?token={token}&display_name={urllib.parse.quote(display_name or '')}"
    logger.debug(f"Redirecting to: {frontend_url}")
    return redirect(frontend_url)

@app.route('/api/verify-token', methods=['POST'])
def verify_token():
    token = request.json.get('token')
    logger.debug(f"Verifying token: {token}")
    try:
        decoded = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
        user = User.query.filter_by(line_id=decoded['line_id']).first()
        if user:
            logger.info(f"Token verified for user: {user.line_id}")
            return jsonify({
                'line_id': user.line_id,
                'display_name': user.display_name,
                'picture_url': user.picture_url
            })
        logger.error("User not found")
        return jsonify({"error": "User not found"}), 404
    except jwt.ExpiredSignatureError:
        logger.error("Token expired")
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        logger.error("Invalid token")
        return jsonify({"error": "Invalid token"}), 401

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('LINE_LOGIN_PORT', 5502)), debug=True, use_reloader=False)