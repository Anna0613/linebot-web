from flask import Flask, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.secret_key = 'b03a02f4a3424a61ff02701dcec96805'  # 用於加密 session 的密鑰

# 連接到 PostgreSQL 資料庫
def get_db_connection():
    conn = psycopg2.connect(
        host='sql.jkl921102.org',
        port=5432,
        database='LineBot_01',
        user='11131230',
        password='11131230'
    )
    return conn

# 註冊 API
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password or not email:
        return jsonify({'message': 'Username, password, and email are required.'}), 400

    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
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
        return jsonify({'message': 'Username or email already exists.'}), 400
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
        return jsonify({'message': 'Username and password are required.'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            'SELECT password, email FROM users WHERE username = %s',
            (username,)
        )
        user = cur.fetchone()

        if user and check_password_hash(user[0], password):
            session['username'] = username  # 保存用戶到 session
            return jsonify({'message': 'Login successful!', 'username': username, 'email': user[1]}), 200
        else:
            return jsonify({'message': 'Invalid username or password.'}), 401
    finally:
        cur.close()
        conn.close()

# 檢查是否登入
@app.route('/check_login', methods=['GET'])
def check_login():
    if 'username' in session:
        return jsonify({'message': f'User {session["username"]} is logged in.'}), 200
    else:
        return jsonify({'message': 'Not logged in.'}), 401

# 登出 API
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)  # 清除 session
    return jsonify({'message': 'Logged out successfully!'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5501))
    app.run(host='0.0.0.0', port=port)  # 讓 Flask 监听所有外部請求
