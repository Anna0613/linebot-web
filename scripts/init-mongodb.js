// MongoDB 初始化腳本
// 切換到 admin 資料庫以創建用戶
db = db.getSiblingDB('admin');

// 創建應用程序用戶
try {
  db.createUser({
    user: "mongo_user",
    pwd: "mongo_password",
    roles: [
      {
        role: "readWrite",
        db: "linebot_conversations"
      }
    ]
  });
  print("✅ 應用程序用戶已創建");
} catch (e) {
  print("⚠️ 用戶可能已存在: " + e);
}

// 切換到 linebot_conversations 資料庫
db = db.getSiblingDB('linebot_conversations');

// 創建集合和索引
try {
  db.createCollection("conversations");
  print("✅ conversations 集合已創建");
} catch (e) {
  print("⚠️ conversations 集合可能已存在");
}

try {
  db.createCollection("messages");
  print("✅ messages 集合已創建");
} catch (e) {
  print("⚠️ messages 集合可能已存在");
}

// 為 conversations 集合創建索引
db.conversations.createIndex({ "user_id": 1 });
db.conversations.createIndex({ "created_at": 1 });
db.conversations.createIndex({ "updated_at": 1 });
print("✅ conversations 索引已創建");

// 為 messages 集合創建索引
db.messages.createIndex({ "conversation_id": 1 });
db.messages.createIndex({ "timestamp": 1 });
db.messages.createIndex({ "user_id": 1 });
print("✅ messages 索引已創建");

print("✅ MongoDB 初始化完成");
