const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClientDocuments extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  ClientDocuments.init(
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
      document_month: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gst_1_received: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      gst_1_received_date: {
        type: DataTypes.DATEONLY,
      },
      bank_statement_received: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      bank_statement_received_date: {
        type: DataTypes.DATEONLY,
      },
      itc_taken: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      created_at: {
        type: DataTypes.DATE,
      },
      updated_at: {
        type: DataTypes.DATE,
      },
      tds_received: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      tds_received_date: {
        type: DataTypes.DATEONLY,
      },
      gst_1_reminder_1_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      gst_1_reminder_1_sent_date: {
        type: DataTypes.DATE,
      },
      gst_1_reminder_2_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      gst_1_reminder_2_sent_date: {
        type: DataTypes.DATE,
      },
      tds_reminder_1_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      tds_reminder_1_sent_date: {
        type: DataTypes.DATE,
      },
      tds_reminder_2_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      tds_reminder_2_sent_date: {
        type: DataTypes.DATE,
      },
      bank_reminder_1_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      bank_reminder_1_sent_date: {
        type: DataTypes.DATE,
      },
      bank_reminder_2_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      bank_reminder_2_sent_date: {
        type: DataTypes.DATE,
      }
    },
    {
      sequelize,
      modelName: 'ClientDocuments',
      tableName: 'client_documents',
      schema: 'user',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ClientDocuments;
};