from flask import Flask, request, jsonify, make_response
import psycopg2
import os
import base64
import re
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
from functools import wraps

from auth_service import verify_token, extract_token_from_header, create_access_token

# 載入 .env
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
    "http://setting-api.jkl921102.org",
    "https://setting-api.jkl921102.org",
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

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get('Origin')
        if origin and (origin in allowed_origins or origin.startswith('http://localhost:')):
            response = make_response()
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Referer, User-Agent, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform'
            response.headers['Access-Control-Max-Age'] = '600'
            return response

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
    return response

# 配置安全性設置
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', os.urandom(32))

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
        
        # 首先嘗試從 Authorization header 獲取 token
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = extract_token_from_header(auth_header)
                data = verify_token(token)
                if data:
                    request.current_user = data
                    return f(*args, **kwargs)
                return jsonify({'error': 'Invalid token from Authorization header'}), 401
            except Exception as e:
                return jsonify({'error': f'Invalid token: {str(e)}'}), 401
        
        # 嘗試從 cookies 獲取
        token = request.cookies.get('token')
        if token:
            try:
                data = verify_token(token)
                if data:
                    request.current_user = data
                    return f(*args, **kwargs)
                return jsonify({'error': 'Invalid token from cookie'}), 401
            except Exception as e:
                return jsonify({'error': f'Invalid token from cookie: {str(e)}'}), 401
        
        return jsonify({'error': 'Token is missing'}), 401
    return decorated

# 頭像驗證函數
def validate_avatar_base64(avatar_data):
    """驗證頭像Base64數據"""
    if not avatar_data:
        return False, "Avatar data is required"
    
    # 檢查是否是有效的data URL格式
    data_url_pattern = r'^data:image/(jpeg|jpg|png|gif);base64,([A-Za-z0-9+/=]+)$'
    match = re.match(data_url_pattern, avatar_data)
    
    if not match:
        return False, "Invalid image format. Only JPEG, PNG, and GIF are allowed"
    
    # 獲取base64部分
    base64_data = match.group(2)
    
    # 檢查大小（限制500KB的原始圖片，Base64編碼後約667KB）
    if len(base64_data) > 700000:  # 約500KB圖片的Base64編碼
        return False, "Image size too large. Maximum 500KB allowed"
    
    try:
        # 嘗試解碼base64以驗證有效性
        decoded = base64.b64decode(base64_data)
        if len(decoded) < 100:  # 太小可能不是有效圖片
            return False, "Invalid image data"
        return True, "Valid"
    except Exception:
        return False, "Invalid base64 encoding"

# 獲取用戶頭像
@app.route('/avatar', methods=['GET'])
@token_required
def get_avatar():
    username = request.current_user.get('username')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        cur.execute(
            'SELECT avatar_base64, avatar_updated_at FROM users WHERE username = %s',
            (username,)
        )
        result = cur.fetchone()
        
        if not result or not result[0]:
            return jsonify({
                'avatar': None,
                'updated_at': None,
                'message': 'No avatar found'
            }), 200
        
        return jsonify({
            'avatar': result[0],
            'updated_at': result[1].isoformat() if result[1] else None,
            'message': 'Avatar retrieved successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error retrieving avatar: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

# 更新用戶頭像
@app.route('/avatar', methods=['PUT'])
@token_required
def update_avatar():
    data = request.json
    avatar_data = data.get('avatar')
    username = request.current_user.get('username')
    
    # 驗證頭像數據
    is_valid, message = validate_avatar_base64(avatar_data)
    if not is_valid:
        return jsonify({'error': message}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        current_time = datetime.now()
        
        cur.execute(
            'UPDATE users SET avatar_base64 = %s, avatar_updated_at = %s WHERE username = %s RETURNING id',
            (avatar_data, current_time, username)
        )
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'User not found'}), 404
        
        conn.commit()
        
        return jsonify({
            'message': 'Avatar updated successfully',
            'avatar': avatar_data,
            'updated_at': current_time.isoformat()
        }), 200
        
    except psycopg2.Error as e:
        conn.rollback()
        if 'check_avatar_size' in str(e):
            return jsonify({'error': 'Avatar size exceeds maximum limit'}), 400
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Error updating avatar: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

# 刪除用戶頭像
@app.route('/avatar', methods=['DELETE'])
@token_required
def delete_avatar():
    username = request.current_user.get('username')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        
        cur.execute(
            'UPDATE users SET avatar_base64 = NULL, avatar_updated_at = NULL WHERE username = %s RETURNING id',
            (username,)
        )
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'User not found'}), 404
        
        conn.commit()
        
        return jsonify({
            'message': 'Avatar deleted successfully'
        }), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Error deleting avatar: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

# 獲取用戶設定
@app.route('/profile', methods=['GET'])
@token_required
def get_profile():
    username = request.current_user.get('username')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        cur.execute(
            'SELECT username, email, email_verified, created_at, avatar_base64, avatar_updated_at FROM users WHERE username = %s',
            (username,)
        )
        result = cur.fetchone()
        
        if not result:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'username': result[0],
            'email': result[1],
            'email_verified': result[2],
            'created_at': result[3].isoformat() if result[3] else None,
            'avatar': result[4],
            'avatar_updated_at': result[5].isoformat() if result[5] else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error retrieving profile: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

# 更新用戶設定
@app.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.json
    current_username = request.current_user.get('username')
    current_login_type = request.current_user.get('login_type', 'general')
    
    # 取得要更新的欄位
    new_username = data.get('username')
    new_email = data.get('email')
    
    # 驗證輸入
    if not new_username and not new_email:
        return jsonify({'error': 'No data provided for update'}), 400
    
    # 驗證用戶名稱格式（如果有提供）
    if new_username:
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', new_username):
            return jsonify({'error': 'Username must be 3-20 characters long and contain only letters, numbers, and underscores'}), 400
    
    # 驗證電子郵件格式（如果有提供）
    if new_email:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, new_email):
            return jsonify({'error': 'Invalid email format'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor()
        
        # 檢查新用戶名是否已存在（如果有提供新用戶名）
        if new_username and new_username != current_username:
            cur.execute('SELECT id FROM users WHERE username = %s', (new_username,))
            if cur.fetchone():
                return jsonify({'error': 'Username already exists'}), 409
        
        # 檢查新電子郵件是否已存在（如果有提供新電子郵件）
        if new_email:
            cur.execute('SELECT id FROM users WHERE email = %s AND username != %s', (new_email, current_username))
            if cur.fetchone():
                return jsonify({'error': 'Email already exists'}), 409
        
        # 建立更新查詢
        update_fields = []
        update_values = []
        
        if new_username:
            update_fields.append('username = %s')
            update_values.append(new_username)
        
        if new_email:
            update_fields.append('email = %s')
            update_values.append(new_email)
            # 如果更新email，重置驗證狀態
            update_fields.append('email_verified = %s')
            update_values.append(False)
        
        update_values.append(current_username)  # WHERE 條件的參數
        
        # 執行更新
        update_query = f'UPDATE users SET {", ".join(update_fields)} WHERE username = %s RETURNING id, username, email, email_verified'
        cur.execute(update_query, update_values)
        
        result = cur.fetchone()
        if not result:
            return jsonify({'error': 'User not found'}), 404
        
        conn.commit()
        
        # 準備回應數據
        updated_data = {
            'username': result[1],
            'email': result[2],
            'email_verified': result[3],
            'message': 'Profile updated successfully'
        }
        
        # 如果用戶名稱有更新，生成新的 JWT token
        if new_username and new_username != current_username:
            # 創建新的 token 數據
            token_data = {
                'username': new_username,
                'login_type': current_login_type
            }
            
            # 生成新的 token
            new_token = create_access_token(token_data)
            
            updated_data['username_changed'] = True
            updated_data['new_token'] = new_token
            updated_data['message'] += '. Username has been changed and new token generated.'
        
        return jsonify(updated_data), 200
        
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if 'username' in str(e):
            return jsonify({'error': 'Username already exists'}), 409
        elif 'email' in str(e):
            return jsonify({'error': 'Email already exists'}), 409
        else:
            return jsonify({'error': 'Database integrity error'}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Error updating profile: {str(e)}'}), 500
    finally:
        cur.close()
        conn.close()

# 健康檢查
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Setting API',
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT_SETTING', 5504))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )
