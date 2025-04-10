const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WhatsappLogs extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  WhatsappLogs.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      client_id: {
        type: DataTypes.INTEGER,
      },
      group_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      }
    },
    {
      sequelize,
      modelName: 'WhatsappLogs',
      tableName: 'whatsapp_logs',
      schema: 'user',
      timestamps: false,
    }
  );

  return WhatsappLogs;
}; 