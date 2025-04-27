const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmailLogs extends Model {
    static associate(models) {
      // Define associations here
      EmailLogs.belongsTo(models.Clients, {
        foreignKey: 'client_id',
        as: 'client'
      });
    }
  }

  EmailLogs.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      email_to: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Email recipient(s)'
      },
      email_subject: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Email subject line'
      },
      email_body: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Email content/body'
      },
      sent_at: {
        type: DataTypes.DATE,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      error_message: {
        type: DataTypes.TEXT,
      },
      document_month: {
        type: DataTypes.STRING,
      },
      reminder_number: {
        type: DataTypes.INTEGER,
      }
    },
    {
      sequelize,
      modelName: 'EmailLogs',
      tableName: 'email_logs',
      schema: 'user',
      timestamps: false,
    }
  );

  return EmailLogs;
};