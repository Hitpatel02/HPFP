// This file represents the "reminder_email_view" database view
// View definition:
/*
 SELECT c.id AS client_id,
    c.name AS client_name,
    c.email_id_1 AS email_primary,
    c.email_id_2 AS email_secondary,
    c.email_id_3 AS email_tertiary,
    cd.document_month,
    cd.gst_1_received,
    cd.bank_statement_received,
    cd.tds_received,
    COALESCE(cd.gst_1_reminder_1_sent, false) AS gst_1_reminder_1_sent,
    COALESCE(cd.gst_1_reminder_2_sent, false) AS gst_1_reminder_2_sent,
    COALESCE(cd.tds_reminder_1_sent, false) AS tds_reminder_1_sent,
    COALESCE(cd.tds_reminder_2_sent, false) AS tds_reminder_2_sent,
    COALESCE(cd.bank_reminder_1_sent, false) AS bank_reminder_1_sent,
    COALESCE(cd.bank_reminder_2_sent, false) AS bank_reminder_2_sent,
    rs.gst_due_date,
    rs.tds_due_date,
    rs.gst_reminder_1_date,
    rs.gst_reminder_2_date,
    rs.tds_reminder_1_date,
    rs.tds_reminder_2_date
   FROM (("user".clients c
     JOIN "user".client_documents cd ON ((c.id = cd.client_id)))
     CROSS JOIN ( SELECT reminder_settings.id,
            reminder_settings.current_month,
            reminder_settings.today_date,
            reminder_settings.gst_due_date,
            reminder_settings.gst_reminder_1_date,
            reminder_settings.gst_reminder_2_date,
            reminder_settings.password,
            reminder_settings.created_at,
            reminder_settings.updated_at,
            reminder_settings.scheduler_hour,
            reminder_settings.scheduler_minute,
            reminder_settings.scheduler_am_pm,
            reminder_settings.tds_due_date,
            reminder_settings.tds_reminder_1_date,
            reminder_settings.tds_reminder_2_date
           FROM "user".reminder_settings
          ORDER BY reminder_settings.id DESC
         LIMIT 1) rs)
  WHERE ((cd.document_month)::text = (rs.current_month)::text);
*/

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReminderEmailView extends Model {}

  ReminderEmailView.init(
    {
      client_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      client_name: {
        type: DataTypes.STRING
      },
      email_primary: {
        type: DataTypes.STRING
      },
      email_secondary: {
        type: DataTypes.STRING
      },
      email_tertiary: {
        type: DataTypes.STRING
      },
      document_month: {
        type: DataTypes.STRING
      },
      gst_1_received: {
        type: DataTypes.BOOLEAN
      },
      bank_statement_received: {
        type: DataTypes.BOOLEAN
      },
      tds_received: {
        type: DataTypes.BOOLEAN
      },
      gst_1_reminder_1_sent: {
        type: DataTypes.BOOLEAN
      },
      gst_1_reminder_2_sent: {
        type: DataTypes.BOOLEAN
      },
      tds_reminder_1_sent: {
        type: DataTypes.BOOLEAN
      },
      tds_reminder_2_sent: {
        type: DataTypes.BOOLEAN
      },
      bank_reminder_1_sent: {
        type: DataTypes.BOOLEAN
      },
      bank_reminder_2_sent: {
        type: DataTypes.BOOLEAN
      },
      gst_due_date: {
        type: DataTypes.DATE
      },
      tds_due_date: {
        type: DataTypes.DATE
      },
      gst_reminder_1_date: {
        type: DataTypes.DATE
      },
      gst_reminder_2_date: {
        type: DataTypes.DATE
      },
      tds_reminder_1_date: {
        type: DataTypes.DATE
      },
      tds_reminder_2_date: {
        type: DataTypes.DATE
      }
    },
    {
      sequelize,
      modelName: 'ReminderEmailView',
      tableName: 'reminder_email_view',
      schema: 'user',
      timestamps: false,
    }
  );

  return ReminderEmailView;
};