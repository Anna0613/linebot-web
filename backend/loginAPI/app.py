from flask import Flask, request, jsonify, make_response
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import os
from flask_cors import CORS
from datetime import timedelta, datetime
from dotenv import load_dotenv
import jwt
import secrets
from functools import wraps
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

# 載入 .env（與 app.py 同目錄）
load_dotenv(dotenv_path=".env")

app = Flask(__name__)
CORS(app, supports_credentials=True)

# 配置安全性設置
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
JWT_SECRET = os.getenv('JWT_SECRET', secrets.token_hex(32))

# 郵件配置（使用 Gmail SMTP）
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
mail = Mail(app)

# 調試環境變數
print("Loading .env from:", os.path.abspath(".env"))
print("MAIL_USERNAME:", app.config['MAIL_USERNAME'])
print("MAIL_PASSWORD:", app.config['MAIL_PASSWORD'])
print("MAIL_DEFAULT_SENDER:", app.config['MAIL_DEFAULT_SENDER'])

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
        token = request.cookies.get('token')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
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

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

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
        msg = Message('Verify Your Email', sender=app.config['MAIL_USERNAME'], recipients=[email])
        msg.body = f'Please click this link to verify your email: {verify_url}\nLink expires in 24 hours.'
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

# Email 驗證 API
@app.route('/verify_email/<token>', methods=['GET'])
def verify_email(token):
    try:
        email = ts.loads(token, salt='email-verify', max_age=86400)  # 24小時有效
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor()
        cur.execute(
            'UPDATE users SET email_verified = TRUE WHERE email = %s AND email_verified = FALSE',
            (email,)
        )
        if cur.rowcount == 0:
            return jsonify({'error': 'Email already verified or invalid'}), 400
        conn.commit()
        return jsonify({'message': 'Email verified successfully!'}), 200
    except SignatureExpired:
        return jsonify({'error': 'Verification link has expired'}), 400
    except BadSignature:
        return jsonify({'error': 'Invalid verification link'}), 400
    finally:
        cur.close()
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

        if not user or not check_password_hash(user[0], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user[2]:  # email_verified
            return jsonify({'error': 'Please verify your email first'}), 403

        token = jwt.encode({
            'username': username,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        response = make_response(jsonify({
            'message': 'Login successful!',
            'username': username,
            'email': user[1]
        }), 200)
        response.set_cookie(
            'token', token, httponly=True, secure=True, samesite='Strict', max_age=604800
        )
        return response
    finally:
        cur.close()
        conn.close()

# 忘記密碼 API
@app.route('/forgot_password', methods=['POST'])
def forgot_password():
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

        # 發送密碼重置郵件
        token = ts.dumps(email, salt='password-reset')
        reset_url = f"https://login-api.jkl921102.org/reset_password/{token}"
        msg = Message('Reset Your Password', sender=app.config['MAIL_USERNAME'], recipients=[email])
        msg.body = f'Click this link to reset your password: {reset_url}\nLink expires in 1 hour.'
        mail.send(msg)

        return jsonify({'message': 'Password reset email sent!'}), 200
    except Exception as e:
        return jsonify({'error': f'Error: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

# 重置密碼 API
@app.route('/reset_password/<token>', methods=['POST'])
def reset_password(token):
    try:
        email = ts.loads(token, salt='password-reset', max_age=3600)  # 1小時有效
        data = request.json
        new_password = data.get('new_password')

        if not new_password or len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400

        hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256', salt_length=16)

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
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    username = payload['username']

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        cur.execute('SELECT password FROM users WHERE username = %s', (username,))
        user = cur.fetchone()

        if not user or not check_password_hash(user[0], old_password):
            return jsonify({'error': 'Invalid old password'}), 401

        hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256', salt_length=16)
        cur.execute('UPDATE users SET password = %s WHERE username = %s', (hashed_password, username))
        conn.commit()
        return jsonify({'message': 'Password changed successfully!'}), 200
    finally:
        cur.close()
        conn.close()

# 檢查登入狀態
@app.route('/check_login', methods=['GET'])
@token_required
def check_login():
    token = request.cookies.get('token')
    data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return jsonify({'message': f'User {data["username"]} is logged in'}), 200

# 登出 API
@app.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'message': 'Logged out successfully!'}), 200)
    response.set_cookie('token', '', expires=0)
    return response

if __name__ == '__main__':
    port = int(os.getenv('PORT_LOGIN', 5501))
    app.run(host='0.0.0.0', port=port, ssl_context='adhoc')