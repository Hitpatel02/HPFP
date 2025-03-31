const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReminderSettings extends Model {
    static associate(models) {
      // Define associations here
    }
  }

  ReminderSettings.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      current_month: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      today_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      gst_due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      gst_reminder_1_date: {
        type: DataTypes.DATEONLY,
      },
      gst_reminder_2_date: {
        type: DataTypes.DATEONLY,
      },
      password: {
        type: DataTypes.STRING,
      },
      created_at: {
        type: DataTypes.DATE,
      },
      updated_at: {
        type: DataTypes.DATE,
      },
      scheduler_hour: {
        type: DataTypes.INTEGER,
      },
      scheduler_minute: {
        type: DataTypes.INTEGER,
      },
      scheduler_am_pm: {
        type: DataTypes.STRING,
      },
      tds_due_date: {
        type: DataTypes.DATEONLY,
      },
      tds_reminder_1_date: {
        type: DataTypes.DATEONLY,
      },
      tds_reminder_2_date: {
        type: DataTypes.DATEONLY,
      },
      enable_whatsapp_reminders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      enable_email_reminders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      }
    },
    {
      sequelize,
      modelName: 'ReminderSettings',
      tableName: 'reminder_settings',
      schema: 'user',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ReminderSettings;
};