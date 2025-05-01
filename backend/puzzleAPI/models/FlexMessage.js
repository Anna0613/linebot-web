// D:\vs_files\code_file\linebotweb\linebot-web\backend\puzzleAPI\models\FlexMessage.js
module.exports = (sequelize, DataTypes) => {
    const FlexMessage = sequelize.define('FlexMessage', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
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
      timestamps: true
    });

    FlexMessage.associate = (models) => {
      FlexMessage.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    };
  
    return FlexMessage;
  };
