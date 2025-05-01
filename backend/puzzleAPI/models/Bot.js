// D:\vs_files\code_file\linebotweb\linebot-web\backend\puzzleAPI\models\Bot.js
module.exports = (sequelize, DataTypes) => {
    const Bot = sequelize.define('Bot', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      channel_access_token: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      channel_secret: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    }, {
      tableName: 'bots',
      timestamps: true
    });

    Bot.associate = (models) => {
      Bot.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    };

    return Bot;
  };
