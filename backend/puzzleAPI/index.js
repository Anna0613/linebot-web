const express = require('express');
const { Sequelize, DataTypes } = require('sequelize'); // 修正：引入 DataTypes
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });
const app = express();
app.use(express.json());

// 設定 PostgreSQL 連線
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

// 初始化模型
const User = require('./models/User')(sequelize, DataTypes); // 傳入 DataTypes
const Bot = require('./models/Bot')(sequelize, DataTypes);
const FlexMessage = require('./models/FlexMessage')(sequelize, DataTypes);

// 建立關聯
User.hasMany(Bot, { foreignKey: 'userId' });
Bot.belongsTo(User, { foreignKey: 'userId' });
Bot.hasMany(FlexMessage, { foreignKey: 'botId' });
FlexMessage.belongsTo(Bot, { foreignKey: 'botId' });

// 同步資料庫
sequelize.sync({ force: false }).then(() => {
  console.log('資料庫同步完成');
}).catch((err) => {
  console.error('資料庫同步失敗:', err);
});

const PORT = process.env.PORT_PUZZLE || 3000;

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
    const { userId, name, channel_access_token, channel_secret } = req.body;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    const botCount = await Bot.count({ where: { userId } });
    if (botCount >= 3) {
      return res.status(400).json({ error: '已達機器人數量上限 (3)' });
    }
    const bot = await Bot.create({ userId, name, channel_access_token, channel_secret });
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
      include: [{ model: Bot }] // 關聯查詢 Bot
    });
    if (!flexMessage) {
      return res.status(404).json({ error: 'Flex Message 不存在' });
    }

    const bot = flexMessage.Bot;
    if (!bot.channel_access_token) {
      return res.status(400).json({ error: '此 Bot 缺少 CHANNEL_ACCESS_TOKEN' });
    }

    let messagePayload = flexMessage.flexMessage;
    if (!messagePayload.type || messagePayload.type !== 'flex') {
      messagePayload = {
        type: 'flex',
        altText: 'Default Flex Message',
        contents: messagePayload
      };
    }

    const response = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: userId,
        messages: [messagePayload],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bot.channel_access_token}`, // 使用 Bot 特定的 token
        },
      }
    );
    res.json({ message: '訊息已發送' });
  } catch (error) {
    if (error.response) {
      console.error('LINE API 錯誤:', error.response.data);
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 修改機器人資訊
app.put('/api/bots/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    const { name } = req.body;

    const bot = await Bot.findByPk(botId);
    if (!bot) {
      return res.status(404).json({ error: '機器人不存在' });
    }

    if (name) {
      bot.name = name;
      await bot.save();
    }

    res.json({
      id: bot.id,
      userId: bot.userId,
      name: bot.name,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 修改 Flex Message
app.put('/api/flex-messages/:flexMessageId', async (req, res) => {
  try {
    const { flexMessageId } = req.params;
    const { flexMessage } = req.body;

    const message = await FlexMessage.findByPk(flexMessageId);
    if (!message) {
      return res.status(404).json({ error: 'Flex Message 不存在' });
    }

    if (flexMessage) {
      message.flexMessage = flexMessage;
      await message.save();
    }

    res.json({
      id: message.id,
      botId: message.botId,
      flexMessage: message.flexMessage,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 刪除機器人
app.delete('/api/bots/:botId', async (req, res) => {
  try {
    const { botId } = req.params;

    const bot = await Bot.findByPk(botId);
    if (!bot) {
      return res.status(404).json({ error: '機器人不存在' });
    }

    await bot.destroy();
    res.json({ message: '機器人已刪除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 刪除 Flex Message
app.delete('/api/flex-messages/:flexMessageId', async (req, res) => {
  try {
    const { flexMessageId } = req.params;

    const flexMessage = await FlexMessage.findByPk(flexMessageId);
    if (!flexMessage) {
      return res.status(404).json({ error: 'Flex Message 不存在' });
    }

    await flexMessage.destroy();
    res.json({ message: 'Flex Message 已刪除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook 端點
app.post('/webhook', (req, res) => {
  console.log('Webhook 收到請求:', req.body);
  res.status(200).send('OK');
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 port ${PORT}`);
});