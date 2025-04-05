// D:\vs_files\code_file\linebotweb\linebot-web\backend\puzzleAPI\models\FlexMessage.js
module.exports = (sequelize, DataTypes) => {
    const FlexMessage = sequelize.define('FlexMessage', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // 改用 DataTypes.UUIDV4
        primaryKey: true,
      },
      botId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'bots',
          key: 'id',
        },
      },
      flexMessage: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }, {
      tableName: 'flex_messages',
    });
  
    return FlexMessage;
  };