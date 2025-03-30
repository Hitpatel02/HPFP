const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminUsers extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  AdminUsers.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      password_hash: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
      },
      created_at: {
        type: DataTypes.DATE,
      },
      last_login: {
        type: DataTypes.DATE,
      }
    },
    {
      sequelize,
      modelName: 'AdminUsers',
      tableName: 'admin_users',
      schema: 'user',
      timestamps: false,
    }
  );

  return AdminUsers;
};