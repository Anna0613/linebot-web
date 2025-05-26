from flask import Flask, request, jsonify, make_response, redirect
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import os
from flask_cors import CORS
from datetime import timedelta
from dotenv import load_dotenv
from functools import wraps
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from auth_service import (
    verify_password, get_password_hash, create_access_token,
    verify_token, get_cookie_settings, extract_token_from_header
)

# 載入 .env（與 app.py 同目錄）.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
app = Flask(__name__)

allowed_origins = [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "https://127.0.0.1:8080",
    "http://login-api.jkl921102.org",
    "https://login-api.jkl921102.org",
    "http://line-login.jkl921102.org",
    "https://line-login.jkl921102.org",
    "https://jkl921102.org",
    "http://jkl921102.org"
]

# 配置 CORS
CORS(app, 
    resources={
        r"/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Content-Type", 
                "Authorization",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Referer",
                "User-Agent",
                "sec-ch-ua",
                "sec-ch-ua-mobile",
                "sec-ch-ua-platform"
            ],
            "expose_headers": ["Set-Cookie"],
            "supports_credentials": True,
            "max_age": 600
        }
    }
)

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin is not None and (origin in allowed_origins or origin.startswith('http://localhost:')):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Referer, User-Agent, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform'
        response.headers['Access-Control-Expose-Headers'] = 'Set-Cookie'
        response.headers['Access-Control-Max-Age'] = '600'
        
        # 如果是預檢請求，確保返回200狀態碼
        if request.method == 'OPTIONS':
            response.status_code = 200
    return response

# 配置安全性設置
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', os.urandom(32))
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# 郵件配置
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
mail = Mail(app)

# Token 生成器
ts = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# 資料庫連接
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'sql.jkl921102.org'),
            port=int(os.getenv('DB_PORT', 5432)),
            database=os.getenv('DB_NAME', 'LineBot_01'),
            user=os.getenv('DB_USER', '11131230'),
            password=os.getenv('DB_PASSWORD', '11131230')
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        return None

# JWT token 驗證裝飾器
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_error = None
        
        # 首先嘗試從 Authorization header 獲取 token
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = extract_token_from_header(auth_header)
                data = verify_token(token)
                if data:
                    return f(*args, **kwargs)
                # 如果解析成功但驗證失敗，直接返回錯誤
                return jsonify({'error': 'Invalid token from Authorization header'}), 401
            except Exception as e:
                # Authorization header 中的 token 無效，返回具體錯誤
                return jsonify({'error': f'Invalid token: {str(e)}'}), 401
        
        # 只有當 Authorization header 不存在時，才嘗試從 cookies 獲取
        token = request.cookies.get('token')
        if token:
            try:
                data = verify_token(token)
                if data:
                    return f(*args, **kwargs)
                # cookie token 驗證失敗
                return jsonify({'error': 'Invalid token from cookie'}), 401
            except Exception as e:
                return jsonify({'error': f'Invalid token from cookie: {str(e)}'}), 401
        
        # 如果既沒有 header 也沒有 cookie
        return jsonify({'error': 'Token is missing'}), 401
    return decorated

# 註冊 API
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not all([username, password, email]):
        return jsonify({'error': 'All fields are required'}), 400
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    hashed_password = get_password_hash(password)

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO users (username, password, email, email_verified) VALUES (%s, %s, %s, %s)',
            (username, hashed_password, email, False)
        )
        conn.commit()

        # 發送驗證郵件
        token = ts.dumps(email, salt='email-verify')
        verify_url = f"https://login-api.jkl921102.org/verify_email/{token}"
        msg = Message('歡迎加入 - 請驗證您的電子郵件', 
                     sender=app.config['MAIL_USERNAME'], 
                     recipients=[email])
        msg.html = f'''
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">歡迎加入我們！</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                感謝您的註冊！請點擊下方按鈕完成電子郵件驗證：
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}" 
                   style="background-color: #F4CD41; 
                          color: #1a1a40; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          font-weight: bold; 
                          display: inline-block;">
                    驗證電子郵件
                </a>
            </div>
            <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
                此連結將在24小時後失效。<br>
                如果您沒有註冊帳號，請忽略此郵件。
            </p>
        </div>
        '''
        mail.send(msg)

        return jsonify({'message': 'User registered successfully! Please check your email to verify.'}), 201
    except psycopg2.IntegrityError:
        conn.rollback()
        return jsonify({'error': 'Username or email already exists'}), 409
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

# Email 驗證 - 重定向到前端頁面
@app.route('/verify_email/<token>', methods=['GET'])
def verify_email(token):
    verify_url = f"http://localhost:8080/verify-email?token={token}"
    return redirect(verify_url)

# Email 驗證 API
@app.route('/verify-email', methods=['POST'])
def verify_email_token():
    try:
        token = request.json.get('token')
        if not token:
            return jsonify({'error': 'Token is required'}), 400

        email = ts.loads(token, salt='email-verify', max_age=86400)  # 24小時有效
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor()
        cur.execute(
            'UPDATE users SET email_verified = TRUE WHERE email = %s AND email_verified = FALSE RETURNING username',
            (email,)
        )
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'Email already verified or invalid'}), 400

        conn.commit()
        return jsonify({
            'message': 'Email verified successfully!',
            'username': result[0]
        }), 200
    except SignatureExpired:
        return jsonify({'error': 'Verification link has expired'}), 400
    except BadSignature:
        return jsonify({'error': 'Invalid verification link'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# 登入 API
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        return jsonify({'error': 'Username and password are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        cur.execute(
            'SELECT password, email, email_verified FROM users WHERE username = %s',
            (username,)
        )
        user = cur.fetchone()

        if not user or not verify_password(password, user[0]):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user[2]:  # email_verified
            return jsonify({'error': 'Please verify your email first'}), 403

        token = create_access_token({
            'username': username,
            'login_type': 'general'  # 標記為一般帳號登入
        })
        
        response = make_response(jsonify({
            'message': 'Login successful!',
            'username': username,
            'email': user[1],
            'token': token,
            'login_type': 'general'
        }), 200)

        # 設置 cookie，確保適當的 SameSite 屬性
        cookie_settings = get_cookie_settings(token)
        response.set_cookie(**cookie_settings)
        
        # 添加額外的 CORS header，確保能處理跨域情況
        origin = request.headers.get('Origin')
        if origin in allowed_origins or origin.startswith('http://localhost:'):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        return response
    finally:
        cur.close()
        conn.close()

# 忘記密碼 API
@app.route('/forgot_password', methods=['POST'])  
def forgot_password():
    try:
        data = request.json
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        try:
            cur = conn.cursor()
            cur.execute('SELECT username FROM users WHERE email = %s', (email,))
            user = cur.fetchone()
            if not user:
                return jsonify({'error': 'Email not found'}), 404
            
            if not app.config['MAIL_USERNAME'] or not app.config['MAIL_PASSWORD']:
                return jsonify({'error': 'Email configuration error: Mail settings not properly configured'}), 500

            # 發送密碼重置郵件
            token = ts.dumps(email, salt='password-reset')
            reset_url = f"https://login-api.jkl921102.org/reset-password/{token}"
            msg = Message('密碼重設要求', 
                        sender=app.config['MAIL_USERNAME'], 
                        recipients=[email])
            msg.html = f'''
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333; text-align: center; margin-bottom: 30px;">密碼重設要求</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    我們收到了您的密碼重設請求。請點擊下方按鈕重設您的密碼：
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #F4CD41; 
                              color: #1a1a40; 
                              padding: 12px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold; 
                              display: inline-block;">
                        重設密碼
                    </a>
                </div>
                <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
                    此連結將在1小時後失效。<br>
                    如果這不是您發起的請求，請忽略此郵件。
                </p>
            </div>
            '''
            mail.send(msg)

            return jsonify({'message': 'Password reset email sent!'}), 200
        except Exception as e:
            return jsonify({'error': f'Error: {str(e)}'}), 500
        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# 重置密碼重定向 - 處理從email點擊的連結
@app.route('/reset-password/<token>', methods=['GET'])
def reset_password_redirect(token):
    # 根據環境設定前端URL
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:8080')
    reset_url = f"{frontend_url}/reset-password/{token}"
    return redirect(reset_url)

# 重置密碼 API
@app.route('/reset_password/<token>', methods=['POST'])
def reset_password(token):
    try:
        email = ts.loads(token, salt='password-reset', max_age=3600)  # 1小時有效
        data = request.json
        new_password = data.get('new_password')

        if not new_password or len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400

        hashed_password = get_password_hash(new_password)

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor()
        cur.execute(
            'UPDATE users SET password = %s WHERE email = %s',
            (hashed_password, email)
        )
        conn.commit()
        return jsonify({'message': 'Password reset successfully!'}), 200
    except SignatureExpired:
        return jsonify({'error': 'Reset link has expired'}), 400
    except BadSignature:
        return jsonify({'error': 'Invalid reset link'}), 400
    finally:
        cur.close()
        conn.close()

# 修改密碼 API（需要登入）
@app.route('/change_password', methods=['POST'])
@token_required
def change_password():
    data = request.json
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not all([old_password, new_password]):
        return jsonify({'error': 'Old and new passwords are required'}), 400
    
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    token = request.cookies.get('token')
    data = verify_token(token)
    username = data.get('username')

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        cur.execute('SELECT password FROM users WHERE username = %s', (username,))
        user = cur.fetchone()
        if not user or not verify_password(old_password, user[0]):
            return jsonify({'error': 'Old password is incorrect'}), 403

        hashed_new_password = get_password_hash(new_password)
        cur.execute('UPDATE users SET password = %s WHERE username = %s', (hashed_new_password, username))
        conn.commit()

        return jsonify({'message': 'Password changed successfully!'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()
        
# 檢查登入狀態
@app.route('/check_login', methods=['GET'])
@token_required
def check_login():
    # 優先使用 Authorization header 中的 token
    auth_header = request.headers.get('Authorization')
    if auth_header:
        token = extract_token_from_header(auth_header)
        data = verify_token(token)
    else:
        # 只有在 Authorization header 不存在時才使用 cookie
        token = request.cookies.get('token')
        data = verify_token(token)
    
    username = data['username']
    
    # 從資料庫獲取用戶的email資訊
    conn = get_db_connection()
    email = None
    if conn:
        try:
            cur = conn.cursor()
            cur.execute('SELECT email FROM users WHERE username = %s', (username,))
            result = cur.fetchone()
            if result:
                email = result[0]
        except Exception as e:
            print(f"Error fetching email: {e}")
        finally:
            cur.close()
            conn.close()
    
    return jsonify({
        'message': f'User {username} is logged in',
        'username': username,
        'email': email,
        'login_type': data.get('login_type', 'general')
    }), 200

# 登出 API
@app.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'message': 'Logged out successfully!'}), 200)
    response.set_cookie('token', '', expires=0)
    return response

if __name__ == '__main__':
    port = int(os.getenv('PORT_LOGIN', 5501))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )
