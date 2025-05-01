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
      botLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
        allowNull: false
      },
      flexMessageLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        allowNull: false
      }
    }, {
      tableName: 'users',
      timestamps: false
    });
  
    User.associate = (models) => {
      User.hasMany(models.Bot, {
        foreignKey: 'userId',
        as: 'bots'
      });
      User.hasMany(models.FlexMessage, {
        foreignKey: 'userId',
        as: 'flexMessages'
      });
    };
  
    return User;
  };
