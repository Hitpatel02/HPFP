const { Op } = require('sequelize');
const { Client, ClientDocument } = require('../models');
const { sendEmail } = require('./emailService');
const { getFormattedMonth } = require('../utils/dateUtils');
const reminderQueries = require('../queries/reminderQueries');
const TEMPLATES = require('../constants/emailTemplates');
const { DateTime } = require('luxon');

/**
 * Get current reminder settings
 * @returns {Promise<Object>} - The reminder settings
 */
async function getReminderSettings() {
  return await reminderQueries.getLatestReminderSettings();
}

/**
 * Checks for clients who need reminders and sends emails
 */
async function sendReminderEmails() {
  try {
    console.log('Starting reminder email service...');
    
    const today = DateTime.now().toFormat("yyyy-MM-dd");
    
    // Get reminder settings
    const settings = await getReminderSettings();
    if (!settings) {
      console.log('No reminder settings found, skipping email reminders');
      return;
    }
    
    const currentMonth = getFormattedMonth();
    
    // GST Reminder 1
    if (settings.gst_reminder_1_date) {
      const gstReminder1Date = DateTime.fromJSDate(new Date(settings.gst_reminder_1_date)).toFormat('yyyy-MM-dd');
      if (today === gstReminder1Date) {
        await processReminderBatch({
          documentField: 'gst_1_received',
          reminderField: 'gst_1_reminder_1_sent',
          reminderDateField: 'gst_1_reminder_1_sent_date',
          documentType: 'GST',
          reminderNumber: 1,
          month: currentMonth,
          dueDateDay: settings.gst_due_date
        });
      }
    }
    
    // GST Reminder 2
    if (settings.gst_reminder_2_date) {
      const gstReminder2Date = DateTime.fromJSDate(new Date(settings.gst_reminder_2_date)).toFormat('yyyy-MM-dd');
      if (today === gstReminder2Date) {
        await processReminderBatch({
          documentField: 'gst_1_received',
          reminderField: 'gst_1_reminder_2_sent',
          reminderDateField: 'gst_1_reminder_2_sent_date',
          documentType: 'GST',
          reminderNumber: 2,
          month: currentMonth,
          dueDateDay: settings.gst_due_date
        });
      }
    }
    
    // TDS Reminder 1
    if (settings.tds_reminder_1_date) {
      const tdsReminder1Date = DateTime.fromJSDate(new Date(settings.tds_reminder_1_date)).toFormat('yyyy-MM-dd');
      if (today === tdsReminder1Date) {
        await processReminderBatch({
          documentField: 'tds_received',
          reminderField: 'tds_reminder_1_sent',
          reminderDateField: 'tds_reminder_1_sent_date',
          documentType: 'TDS',
          reminderNumber: 1,
          month: currentMonth,
          dueDateDay: settings.tds_due_date || settings.gst_due_date
        });
      }
    }
    
    // TDS Reminder 2
    if (settings.tds_reminder_2_date) {
      const tdsReminder2Date = DateTime.fromJSDate(new Date(settings.tds_reminder_2_date)).toFormat('yyyy-MM-dd');
      if (today === tdsReminder2Date) {
        await processReminderBatch({
          documentField: 'tds_received',
          reminderField: 'tds_reminder_2_sent',
          reminderDateField: 'tds_reminder_2_sent_date',
          documentType: 'TDS',
          reminderNumber: 2,
          month: currentMonth,
          dueDateDay: settings.tds_due_date || settings.gst_due_date
        });
      }
    }
    
    // Bank statement reminders could be added here in a similar way
    
    console.log('Reminder email service completed.');
  } catch (error) {
    console.error('Error in reminder service:', error);
  }
}

/**
 * Process a batch of reminders for a specific document type
 */
async function processReminderBatch(options) {
  const { 
    documentField, 
    reminderField, 
    reminderDateField,
    documentType,
    reminderNumber,
    month,
    dueDateDay
  } = options;
  
  try {
    // Get clients who need reminders
    const clients = await reminderQueries.getClientsForReminder({
      documentField,
      reminderField,
      documentMonth: month
    });
    
    console.log(`Found ${clients.length} clients for ${documentType} reminder #${reminderNumber}`);
    
    // Get the appropriate email template
    const template = reminderNumber === 1 
      ? TEMPLATES.FIRST_REMINDER 
      : TEMPLATES.SECOND_REMINDER;
    
    // Send emails to each client
    for (const client of clients) {
      try {
        // Send the email
      await sendEmail({
          to: client.email_id_1,
          cc: client.email_id_2 ? [client.email_id_2, client.email_id_3].filter(Boolean) : [],
          subject: `${documentType} Reminder for ${month}`,
        template,
        variables: {
          clientName: client.name,
          documentType,
          dueDay: dueDateDay,
            month
          }
        });
        
        // Mark as sent in the database
        await reminderQueries.markReminderSent(
          client.document_id,
          reminderField,
          reminderDateField
        );
        
        console.log(`Sent ${documentType} reminder #${reminderNumber} to ${client.name}`);
      } catch (error) {
        console.error(`Error sending reminder to client ${client.name}:`, error);
        // Continue with next client
      }
    }
    
    console.log(`Successfully processed ${clients.length} ${documentType} reminder emails`);
  } catch (error) {
    console.error(`Error processing ${documentType} reminders:`, error);
  }
}

module.exports = {
  sendReminderEmails,
  getReminderSettings
}; 