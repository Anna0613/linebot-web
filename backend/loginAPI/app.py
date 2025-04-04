from flask import Flask, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import os
from flask_cors import CORS
from datetime import timedelta

app = Flask(__name__)
CORS(app)

# 設置 session 安全性
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your_default_secret_key')  
app.permanent_session_lifetime = timedelta(days=7)  # Session 7 天內有效

# 連接 PostgreSQL 資料庫
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'sql.jkl921102.org'),
            port=os.getenv('DB_PORT', 5432),
            database=os.getenv('DB_NAME', 'LineBot_01'),
            user=os.getenv('DB_USER', '11131230'),
            password=os.getenv('DB_PASS', '11131230')
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        return None

# 註冊 API
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password or not email:
        return jsonify({'error': 'Username, password, and email are required.'}), 400

    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        cur.execute(
            'INSERT INTO users (username, password, email) VALUES (%s, %s, %s)',
            (username, hashed_password, email)
        )
        conn.commit()
        return jsonify({'message': 'User registered successfully!'}), 201
    except psycopg2.IntegrityError:
        conn.rollback()
        return jsonify({'error': 'Username or email already exists.'}), 400
    except psycopg2.Error as e:
        conn.rollback()
        return jsonify({'error': f'Database error: {e}'}), 500
    finally:
        cur.close()
        conn.close()

# 登入 API
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        cur.execute(
            'SELECT password, email FROM users WHERE username = %s',
            (username,)
        )
        user = cur.fetchone()

        if user and check_password_hash(user[0], password):
            session.permanent = True
            session['username'] = username  # 保存用戶到 session
            return jsonify({'message': 'Login successful!', 'username': username, 'email': user[1]}), 200
        else:
            return jsonify({'error': 'Invalid username or password.'}), 401
    finally:
        cur.close()
        conn.close()

# 檢查是否登入
@app.route('/check_login', methods=['GET'])
def check_login():
    if 'username' in session:
        return jsonify({'message': f'User {session["username"]} is logged in.'}), 200
    else:
        return jsonify({'error': 'Not logged in.'}), 401

# 登出 API
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)  # 清除 session
    return jsonify({'message': 'Logged out successfully!'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5501))
    app.run(host='0.0.0.0', port=port)  # 讓 Flask 监听所有外部請求
