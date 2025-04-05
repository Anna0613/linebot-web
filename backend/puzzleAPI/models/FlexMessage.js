const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FlexMessage = sequelize.define('FlexMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
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