const express = require('express');
const { Sequelize } = require('sequelize');
const axios = require('axios');
const dotenv = require('dotenv');
const UserModel = require('./models/User');
const BotModel = require('./models/Bot');
const FlexMessageModel = require('./models/FlexMessage');

dotenv.config({ path: './.env' });
const app = express();
app.use(express.json());

// 設定 PostgreSQL 連線
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 初始化模型
const User = UserModel(sequelize);
const Bot = BotModel(sequelize);
const FlexMessage = FlexMessageModel(sequelize);

// 建立關聯
User.hasMany(Bot, { foreignKey: 'userId' });
Bot.belongsTo(User, { foreignKey: 'userId' });
Bot.hasMany(FlexMessage, { foreignKey: 'botId' });
FlexMessage.belongsTo(Bot, { foreignKey: 'botId' });

// 同步資料庫（僅新增表，不修改現有 users 表）
sequelize.sync({ force: false }).then(() => {
  console.log('資料庫同步完成');
}).catch((err) => {
  console.error('資料庫同步失敗:', err);
});

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

// 獲取用戶的機器人
app.get('/api/bots/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bots = await Bot.findAll({
      where: { userId },
      include: [{ model: FlexMessage, attributes: ['id', 'flexMessage', 'createdAt'] }],
    });
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 建立新機器人
app.post('/api/bots', async (req, res) => {
  try {
    const { userId, name } = req.body;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    const botCount = await Bot.count({ where: { userId } });
    if (botCount >= 3) {
      return res.status(400).json({ error: '已達機器人數量上限 (3)' });
    }
    const bot = await Bot.create({ userId, name });
    res.json(bot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 儲存 Flex Message
app.post('/api/flex-messages', async (req, res) => {
  try {
    const { botId, flexMessage } = req.body;
    const bot = await Bot.findByPk(botId, {
      include: [FlexMessage],
    });
    if (!bot) {
      return res.status(404).json({ error: '機器人不存在' });
    }
    if (bot.FlexMessages.length >= 10) {
      return res.status(400).json({ error: '已達 Flex Message 數量上限 (10)' });
    }
    const newFlexMessage = await FlexMessage.create({ botId, flexMessage });
    res.json(newFlexMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 發送 Flex Message
app.post('/api/send-message', async (req, res) => {
  try {
    const { botId, flexMessageId, userId } = req.body;
    const flexMessage = await FlexMessage.findOne({
      where: { id: flexMessageId, botId },
    });
    if (!flexMessage) {
      return res.status(404).json({ error: 'Flex Message 不存在' });
    }

    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: userId,
        messages: [flexMessage.flexMessage],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );
    res.json({ message: '訊息已發送' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器運行於 port ${PORT}`);
});