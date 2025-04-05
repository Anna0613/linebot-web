// D:\vs_files\code_file\linebotweb\linebot-web\backend\puzzleAPI\models\User.js
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    }, {
      tableName: 'users',
      timestamps: false, // 假設現有表沒有 createdAt/updatedAt
    });
  
    return User;
  };