const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Clients extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  Clients.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email_id_1: {
        type: DataTypes.STRING,
      },
      email_id_2: {
        type: DataTypes.STRING,
      },
      email_id_3: {
        type: DataTypes.STRING,
      },
      gst_filing_type: {
        type: DataTypes.STRING,
      },
      created_at: {
        type: DataTypes.DATE,
      },
      updated_at: {
        type: DataTypes.DATE,
      },
      whatsapp_group_id: {
        type: DataTypes.STRING,
      },
      gst_1_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      bank_statement_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      tds_document_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      gst_number: {
        type: DataTypes.STRING,
      },
      phone_number: {
        type: DataTypes.STRING,
      }
    },
    {
      sequelize,
      modelName: 'Clients',
      tableName: 'clients',
      schema: 'user',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Clients;
};