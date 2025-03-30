const { Op } = require('sequelize');
const db = require('../config/db');
const { Client, ClientDocument, ReminderSettings } = require('../models');
const { sendEmail } = require('./emailService');
const TEMPLATES = require('../constants/emailTemplates');
const { DateTime } = require('luxon');

/**
 * Checks for clients who need reminders and sends emails
 */
async function sendReminderEmails() {
  try {
    console.log('Starting reminder email service...');
    
    const today = DateTime.now().toFormat("yyyy-MM-dd");
    
    // Get reminder settings
    const settings = await getReminderSettings();
    
    // GST Reminder 1
    if (settings.gst_reminder_1_date) {
      const gstReminder1Date = DateTime.fromJSDate(new Date(settings.gst_reminder_1_date)).toFormat('yyyy-MM-dd');
      if (today === gstReminder1Date) {
        // Find clients who haven't received GST 1 and haven't received the first reminder
        const gstReminder1Clients = await getClientsForReminder({
          reminderNumber: 1,
          reminderType: 'gst',
          documentField: 'gst_1_received',
          reminderField: 'gst_1_reminder_1_sent',
          dueDateField: 'gst_due_date'
        });
        
        console.log(`Found ${gstReminder1Clients.length} clients for GST 1 first reminder`);
        
        // Send emails to these clients
        await sendReminderEmails(gstReminder1Clients, 1, 'gst');
      }
    }
    
    // GST Reminder 2
    if (settings.gst_reminder_2_date) {
      const gstReminder2Date = DateTime.fromJSDate(new Date(settings.gst_reminder_2_date)).toFormat('yyyy-MM-dd');
      if (today === gstReminder2Date) {
        // Find clients who haven't received GST 1 and haven't received the second reminder
        const gstReminder2Clients = await getClientsForReminder({
          reminderNumber: 2,
          reminderType: 'gst',
          documentField: 'gst_1_received',
          reminderField: 'gst_1_reminder_2_sent',
          dueDateField: 'gst_due_date'
        });
        
        console.log(`Found ${gstReminder2Clients.length} clients for GST 1 second reminder`);
        
        // Send emails to these clients
        await sendReminderEmails(gstReminder2Clients, 2, 'gst');
      }
    }
    
    // Run different checks for different document types
    await processTDSReminders(settings, today);
    await processBankStatementReminders(settings, today);
    
    console.log('Reminder email service completed.');
  } catch (error) {
    console.error('Error in reminder service:', error);
  }
}

/**
 * Process GST reminders
 */
async function processGSTReminders(settings, currentDay) {
  try {
    // Check for GST first reminder
    if (settings.gst_reminder_1_date && currentDay === settings.gst_reminder_1_date) {
      console.log('Processing GST first reminders...');
      
      // Find clients who haven't received GST 1 and haven't received the first reminder
      const clients = await getClientsForReminder({
        documentField: 'gst_1_received',
        reminderField: 'gst_1_reminder_1_sent',
        settings
      });
      
      // Send emails and mark as sent
      await sendReminderEmailsToClients({
        clients,
        documentType: 'GST',
        reminderNumber: 1,
        reminderField: 'gst_1_reminder_1_sent',
        reminderDateField: 'gst_1_reminder_1_sent_date',
        dueDateDay: settings.gst_due_date,
      });
    }
    
    // Check for GST second reminder
    if (settings.gst_reminder_2_date && currentDay === settings.gst_reminder_2_date) {
      console.log('Processing GST second reminders...');
      
      // Find clients who haven't received GST 1 and haven't received the second reminder
      const clients = await getClientsForReminder({
        documentField: 'gst_1_received',
        reminderField: 'gst_1_reminder_2_sent',
        settings
      });
      
      // Send emails and mark as sent
      await sendReminderEmailsToClients({
        clients,
        documentType: 'GST',
        reminderNumber: 2,
        reminderField: 'gst_1_reminder_2_sent',
        reminderDateField: 'gst_1_reminder_2_sent_date',
        dueDateDay: settings.gst_due_date,
      });
    }
  } catch (error) {
    console.error('Error processing GST reminders:', error);
  }
}

/**
 * Process TDS reminders
 */
async function processTDSReminders(settings, currentDay) {
  try {
    // Check for TDS first reminder
    if (settings.tds_reminder_1_date && currentDay === settings.tds_reminder_1_date) {
      console.log('Processing TDS first reminders...');
      
      // Find clients who haven't received TDS data and haven't received the first reminder
      const clients = await getClientsForReminder({
        documentField: 'tds_received',
        reminderField: 'tds_reminder_1_sent',
        settings
      });
      
      // Send emails and mark as sent
      await sendReminderEmailsToClients({
        clients,
        documentType: 'TDS',
        reminderNumber: 1,
        reminderField: 'tds_reminder_1_sent',
        reminderDateField: 'tds_reminder_1_sent_date',
        dueDateDay: settings.tds_due_date,
      });
    }
    
    // Check for TDS second reminder
    if (settings.tds_reminder_2_date && currentDay === settings.tds_reminder_2_date) {
      console.log('Processing TDS second reminders...');
      
      // Find clients who haven't received TDS data and haven't received the second reminder
      const clients = await getClientsForReminder({
        documentField: 'tds_received',
        reminderField: 'tds_reminder_2_sent',
        settings
      });
      
      // Send emails and mark as sent
      await sendReminderEmailsToClients({
        clients,
        documentType: 'TDS',
        reminderNumber: 2,
        reminderField: 'tds_reminder_2_sent',
        reminderDateField: 'tds_reminder_2_sent_date',
        dueDateDay: settings.tds_due_date,
      });
    }
  } catch (error) {
    console.error('Error processing TDS reminders:', error);
  }
}

/**
 * Process Bank Statement reminders
 */
async function processBankStatementReminders(settings, currentDay) {
  try {
    // Check for Bank Statement first reminder
    if (settings.bank_reminder_1_date && currentDay === settings.bank_reminder_1_date) {
      console.log('Processing Bank Statement first reminders...');
      
      // Find clients who haven't received bank statements and haven't received the first reminder
      const clients = await getClientsForReminder({
        documentField: 'bank_statement_received',
        reminderField: 'bank_reminder_1_sent',
        settings
      });
      
      // Send emails and mark as sent
      await sendReminderEmailsToClients({
        clients,
        documentType: 'Bank Statement',
        reminderNumber: 1,
        reminderField: 'bank_reminder_1_sent',
        reminderDateField: 'bank_reminder_1_sent_date',
        dueDateDay: settings.gst_due_date, // Using GST due date as fallback
      });
    }
    
    // Check for Bank Statement second reminder
    if (settings.bank_reminder_2_date && currentDay === settings.bank_reminder_2_date) {
      console.log('Processing Bank Statement second reminders...');
      
      // Find clients who haven't received bank statements and haven't received the second reminder
      const clients = await getClientsForReminder({
        documentField: 'bank_statement_received',
        reminderField: 'bank_reminder_2_sent',
        settings
      });
      
      // Send emails and mark as sent
      await sendReminderEmailsToClients({
        clients,
        documentType: 'Bank Statement',
        reminderNumber: 2,
        reminderField: 'bank_reminder_2_sent',
        reminderDateField: 'bank_reminder_2_sent_date',
        dueDateDay: settings.gst_due_date, // Using GST due date as fallback
      });
    }
  } catch (error) {
    console.error('Error processing Bank Statement reminders:', error);
  }
}

/**
 * Get clients who need reminders for a specific document type
 */
async function getClientsForReminder({ documentField, reminderField, settings }) {
  const currentMonth = new Date(settings.current_month);
  
  // Find clients who haven't received the document and haven't received this reminder
  const clients = await Client.findAll({
    include: [
      {
        model: ClientDocument,
        as: 'documents',
        where: {
          document_month: {
            [Op.gte]: currentMonth,
            [Op.lt]: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
          },
          [documentField]: false,
          [reminderField]: false
        }
      }
    ]
  });
  
  return clients;
}

/**
 * Send reminder emails to clients and update their records
 */
async function sendReminderEmailsToClients({ 
  clients, 
  documentType, 
  reminderNumber, 
  reminderField, 
  reminderDateField,
  dueDateDay 
}) {
  const template = reminderNumber === 1 ? TEMPLATES.FIRST_REMINDER : TEMPLATES.SECOND_REMINDER;
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const count = clients.length;
  
  console.log(`Sending ${documentType} reminder #${reminderNumber} to ${count} clients...`);
  
  // Begin transaction
  const t = await db.transaction();
  
  try {
    for (const client of clients) {
      const clientDoc = client.documents[0];
      
      // Send email
      await sendEmail({
        to: client.email_primary,
        cc: client.email_secondary,
        subject: `${documentType} Reminder for ${currentMonth}`,
        template,
        variables: {
          clientName: client.name,
          documentType,
          dueDay: dueDateDay,
          month: currentMonth
        }
      });
      
      // Update client document to mark reminder as sent
      await ClientDocument.update(
        {
          [reminderField]: true,
          [reminderDateField]: new Date()
        },
        {
          where: { id: clientDoc.id },
          transaction: t
        }
      );
      
      console.log(`Sent ${documentType} reminder #${reminderNumber} to ${client.name} (${client.email_primary})`);
    }
    
    // Commit transaction
    await t.commit();
    console.log(`Successfully sent ${count} ${documentType} reminder emails.`);
    
  } catch (error) {
    // Rollback transaction on error
    await t.rollback();
    console.error(`Error sending ${documentType} reminder emails:`, error);
  }
}

module.exports = {
  sendReminderEmails
}; 