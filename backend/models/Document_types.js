const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentTypes extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  DocumentTypes.init(
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
      description: {
        type: DataTypes.TEXT,
      },
      created_at: {
        type: DataTypes.DATE,
      }
    },
    {
      sequelize,
      modelName: 'DocumentTypes',
      tableName: 'document_types',
      schema: 'user',
      timestamps: false,
    }
  );

  return DocumentTypes;
};