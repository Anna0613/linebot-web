// MongoDB 初始化腳本
// 切換到 linebot_conversations 資料庫
db = db.getSiblingDB('linebot_conversations');

// 創建用戶（如果需要）
// db.createUser({
//   user: "linebot_user",
//   pwd: "linebot_password",
//   roles: [
//     {
//       role: "readWrite",
//       db: "linebot_conversations"
//     }
//   ]
// });

// 創建集合和索引
db.createCollection("conversations");
db.createCollection("messages");

// 為 conversations 集合創建索引
db.conversations.createIndex({ "user_id": 1 });
db.conversations.createIndex({ "created_at": 1 });
db.conversations.createIndex({ "updated_at": 1 });

// 為 messages 集合創建索引
db.messages.createIndex({ "conversation_id": 1 });
db.messages.createIndex({ "timestamp": 1 });
db.messages.createIndex({ "user_id": 1 });

print("MongoDB 初始化完成");
