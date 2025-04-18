from flask import Flask, request, redirect, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import urllib.parse
import jwt as jwt  # 明確使用 PyJWT
from datetime import datetime, timedelta, timezone
import logging

# 配置日誌
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 確保 .env 文件正確載入
load_dotenv(override=True)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": [
    os.getenv('FRONTEND_URL'),
    "http://localhost:8080"
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

# 初始化資料庫
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")

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
    except requests.RequestException as e:
        logger.error(f"Failed to fetch user profile: {e}")
        return jsonify({"error": "Failed to fetch user profile"}), 400

    try:
        user = User.query.filter_by(line_id=line_id).first()
        if not user:
            user = User(
                line_id=line_id,
                display_name=display_name,
                picture_url=picture_url
            )
            db.session.add(user)
            db.session.commit()
            logger.info(f"New user created: line_id={line_id}, display_name={display_name}")
        else:
            logger.info(f"Existing user found: line_id={line_id}")
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to save user data"}), 500

    try:
        token = jwt.encode({
            'line_id': line_id,
            'exp': datetime.now(timezone.utc) + timedelta(hours=1)
        }, os.getenv('JWT_SECRET'), algorithm='HS256')
        logger.debug(f"JWT token generated: {token}")
    except Exception as e:
        logger.error(f"JWT encoding error: {e}")
        return jsonify({"error": "Failed to generate token"}), 500

    frontend_url = f"{os.getenv('FRONTEND_URL')}/line-login?token={token}&display_name={urllib.parse.quote(display_name or '')}"
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
    app.run(host='0.0.0.0', port=int(os.getenv('PORT_LOGIN', 5501)), debug=True)