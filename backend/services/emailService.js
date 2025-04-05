const axios = require('axios');
const { DateTime } = require('luxon');
const db = require('../config/db');
const { getToken } = require('../config/msGraph');
const logsQueries = require('../queries/logsQueries');
const loggingService = require('./loggingService');
const clientDocumentsQueries = require('../queries/clientDocumentsQueries');

/**
 * Send email reminders to clients with pending documents
 */
const sendEmailReminders = async () => {
  try {
    // Get Microsoft Graph access token
    const authResponse = await getToken();
    const accessToken = authResponse.accessToken;

    // Get current reminder settings
    const settingsResult = await db.query(
      `SELECT * FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
    );

    if (settingsResult.rows.length === 0) {
      console.log('⚠️ No reminder settings found. Skipping email reminders.');
      return;
    }

    const settings = settingsResult.rows[0];
    
    // Check if email reminders are enabled
    if (!settings.enable_email_reminders) {
      console.log('⚠️ Email reminders are disabled in settings. Skipping email reminders.');
      return;
    }
    
    const today = DateTime.now().toFormat('yyyy-MM-dd');
    console.log('📅 Today:', today);

    // Check if today is a GST reminder date
    const isGstFirstReminderDay = DateTime.fromJSDate(new Date(settings.gst_reminder_1_date)).toFormat('yyyy-MM-dd') === today;
    const isGstSecondReminderDay = DateTime.fromJSDate(new Date(settings.gst_reminder_2_date)).toFormat('yyyy-MM-dd') === today;
    const isGstReminderDay = isGstFirstReminderDay || isGstSecondReminderDay;
    
    // Check if today is a TDS reminder date
    const isTdsFirstReminderDay = DateTime.fromJSDate(new Date(settings.tds_reminder_1_date)).toFormat('yyyy-MM-dd') === today;
    const isTdsSecondReminderDay = DateTime.fromJSDate(new Date(settings.tds_reminder_2_date)).toFormat('yyyy-MM-dd') === today;
    const isTdsReminderDay = isTdsFirstReminderDay || isTdsSecondReminderDay;
    
    // Skip if today is not any reminder day
    if (!isGstReminderDay && !isTdsReminderDay) {
      console.log('⚠️ Today is not a reminder day for GST or TDS. Skipping email reminders.');
      return;
    }

    // Get clients with pending documents
    // We want ALL clients with any pending documents on reminder day
    console.log('Querying for clients with pending documents...');
    const result = await db.query(
      `SELECT 
          c.id, 
          c.name, 
          c.email_id_1, 
          c.email_id_2, 
          c.email_id_3,
          cd.document_month,
          cd.gst_1_received,
          cd.bank_statement_received,
          cd.tds_received,
          cd.itc_taken,
          c.gst_1_enabled,
          c.bank_statement_enabled,
          c.tds_document_enabled
       FROM "user".clients c
       JOIN "user".client_documents cd ON c.id = cd.client_id
       WHERE 
          (NOT cd.gst_1_received OR NOT cd.bank_statement_received OR NOT cd.tds_received)
          AND (c.email_id_1 IS NOT NULL OR c.email_id_2 IS NOT NULL OR c.email_id_3 IS NOT NULL)`,
      []
    );

    console.log(`🔍 Found ${result.rows.length} clients needing email reminders.`);

    if (result.rows.length === 0) {
      console.log('⚠️ No clients with pending documents found for today.');
      return;
    }

    // Determine which reminder number we're sending today
    const gstReminderNumber = isGstFirstReminderDay ? 1 : (isGstSecondReminderDay ? 2 : 0);
    const tdsReminderNumber = isTdsFirstReminderDay ? 1 : (isTdsSecondReminderDay ? 2 : 0);

    const graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const senderEmail = process.env.SENDER_EMAIL;

    // Process each client
    for (let i = 0; i < result.rows.length; i++) {
      const client = result.rows[i];
      
      try {
        // Skip if no email addresses
        if (!client.email_id_1 && !client.email_id_2 && !client.email_id_3) {
          console.log(`⚠️ No email addresses found for client ${client.name}. Skipping.`);
          continue;
        }

        // Prepare recipients
        const recipients = [];
        if (client.email_id_1) recipients.push({ emailAddress: { address: client.email_id_1 } });
        if (client.email_id_2) recipients.push({ emailAddress: { address: client.email_id_2 } });
        if (client.email_id_3) recipients.push({ emailAddress: { address: client.email_id_3 } });

        // Organize pending documents
        const needsGst = !client.gst_1_received && client.gst_1_enabled;
        const needsBank = !client.bank_statement_received && client.bank_statement_enabled;
        const needsTds = !client.tds_received && client.tds_document_enabled;
        
        // Skip if all documents are submitted or not applicable
        if (!needsGst && !needsBank && !needsTds) {
          console.log(`⏭️ Skipping email for ${client.name}, all applicable documents are received.`);
          continue;
        }
        
        console.log(`Processing ${client.name} - GST: ${needsGst ? 'Pending' : (client.gst_1_enabled ? 'Received' : 'Not applicable')}, Bank: ${needsBank ? 'Pending' : (client.bank_statement_enabled ? 'Received' : 'Not applicable')}, TDS: ${needsTds ? 'Pending' : (client.tds_document_enabled ? 'Received' : 'Not applicable')}`);
        
        // Determine which documents to group together based on the scenarios
        
        // Scenario 1: All 3 documents applicable
        if (client.gst_1_enabled && client.tds_document_enabled && client.bank_statement_enabled) {
          // For TDS and Bank Statement, use TDS reminder dates
          if (isTdsReminderDay && (needsTds || needsBank)) {
            const tdsBankDocs = [];
            if (needsTds) tdsBankDocs.push("TDS data");
            if (needsBank) tdsBankDocs.push("Bank statement");
            
            if (tdsBankDocs.length > 0) {
              console.log(`Sending ${tdsBankDocs.join(' and ')} reminder email to ${client.name}`);
              await sendDocumentEmail(
                graphClient,
                senderEmail,
                client,
                recipients,
                tdsBankDocs,
                tdsReminderNumber,
                settings.tds_due_date
              );
              
              // Update reminder status for each document type
              if (tdsReminderNumber > 0) {
                if (tdsBankDocs.includes("TDS data")) {
                  await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, "tds");
                }
                if (tdsBankDocs.includes("Bank statement")) {
                  await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, "bank");
                }
              }
            }
          }
          
          // For GST, use GST reminder dates
          if (isGstReminderDay && needsGst) {
            console.log(`Sending GSTR 1 reminder email to ${client.name}`);
          await sendDocumentEmail(
            graphClient,
            senderEmail,
            client,
            recipients,
              ["GSTR 1"],
            gstReminderNumber,
            settings.gst_due_date
          );
          
            // Update reminder status for GST
          if (gstReminderNumber > 0) {
            await updateReminderStatus(client.id, client.document_month, gstReminderNumber, "gst");
            }
          }
        }
        // Scenario 2: 2 documents applicable
        else if (
          (client.gst_1_enabled && client.tds_document_enabled && !client.bank_statement_enabled) ||
          (client.gst_1_enabled && !client.tds_document_enabled && client.bank_statement_enabled) ||
          (!client.gst_1_enabled && client.tds_document_enabled && client.bank_statement_enabled)
        ) {
          // Case 1: GST and TDS - Send separate reminders
          if (client.gst_1_enabled && client.tds_document_enabled) {
            if (isGstReminderDay && needsGst) {
              console.log(`Sending GSTR 1 reminder email to ${client.name}`);
          await sendDocumentEmail(
            graphClient,
            senderEmail,
            client,
            recipients,
                ["GSTR 1"],
            gstReminderNumber,
            settings.gst_due_date
          );
          
          // Update reminder status for GST
          if (gstReminderNumber > 0) {
                await updateReminderStatus(client.id, client.document_month, gstReminderNumber, "gst");
              }
            }
            
            if (isTdsReminderDay && needsTds) {
              console.log(`Sending TDS data reminder email to ${client.name}`);
              await sendDocumentEmail(
                graphClient,
                senderEmail,
                client,
                recipients,
                ["TDS data"],
                tdsReminderNumber,
                settings.tds_due_date
              );
              
              // Update reminder status for TDS
              if (tdsReminderNumber > 0) {
                await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, "tds");
              }
            }
          }
          // Case 2: GST and Bank Statement - Group together with GST dates
          else if (client.gst_1_enabled && client.bank_statement_enabled) {
            if (isGstReminderDay) {
              const gstBankDocs = [];
              if (needsGst) gstBankDocs.push("GSTR 1");
              if (needsBank) gstBankDocs.push("Bank statement");
              
              if (gstBankDocs.length > 0) {
                console.log(`Sending ${gstBankDocs.join(' and ')} reminder email to ${client.name}`);
                await sendDocumentEmail(
                  graphClient,
                  senderEmail,
                  client,
                  recipients,
                  gstBankDocs,
                  gstReminderNumber,
                  settings.gst_due_date
                );
                
                // Update reminder status for each document type
                if (gstReminderNumber > 0) {
                  if (gstBankDocs.includes("GSTR 1")) {
                    await updateReminderStatus(client.id, client.document_month, gstReminderNumber, "gst");
                  }
                  if (gstBankDocs.includes("Bank statement")) {
                    await updateReminderStatus(client.id, client.document_month, gstReminderNumber, "bank");
                  }
                }
              }
            }
          }
          // Case 3: TDS and Bank Statement - Group together with TDS dates
          else if (client.tds_document_enabled && client.bank_statement_enabled) {
            if (isTdsReminderDay) {
        const tdsBankDocs = [];
              if (needsTds) tdsBankDocs.push("TDS data");
              if (needsBank) tdsBankDocs.push("Bank statement");
        
              if (tdsBankDocs.length > 0) {
          console.log(`Sending ${tdsBankDocs.join(' and ')} reminder email to ${client.name}`);
          await sendDocumentEmail(
            graphClient,
            senderEmail,
            client,
            recipients,
            tdsBankDocs,
                  tdsReminderNumber,
                  settings.tds_due_date
          );
          
          // Update reminder status for each document type
                if (tdsReminderNumber > 0) {
            if (tdsBankDocs.includes("TDS data")) {
                    await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, "tds");
                  }
                  if (tdsBankDocs.includes("Bank statement")) {
                    await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, "bank");
                  }
                }
              }
            }
          }
        }
        // Scenario 3: Only 1 document applicable
        else {
          // Only GST applicable
          if (client.gst_1_enabled && !client.tds_document_enabled && !client.bank_statement_enabled) {
            if (isGstReminderDay && needsGst) {
              console.log(`Sending GSTR 1 reminder email to ${client.name}`);
              await sendDocumentEmail(
                graphClient,
                senderEmail,
                client,
                recipients,
                ["GSTR 1"],
                gstReminderNumber,
                settings.gst_due_date
              );
              
              // Update reminder status for GST
              if (gstReminderNumber > 0) {
                await updateReminderStatus(client.id, client.document_month, gstReminderNumber, "gst");
              }
            }
          }
          // Only TDS applicable
          else if (!client.gst_1_enabled && client.tds_document_enabled && !client.bank_statement_enabled) {
            if (isTdsReminderDay && needsTds) {
              console.log(`Sending TDS data reminder email to ${client.name}`);
              await sendDocumentEmail(
                graphClient,
                senderEmail,
                client,
                recipients,
                ["TDS data"],
                tdsReminderNumber,
                settings.tds_due_date
              );
              
              // Update reminder status for TDS
              if (tdsReminderNumber > 0) {
                await updateReminderStatus(client.id, client.document_month, tdsReminderNumber, "tds");
              }
            }
          }
          // Only Bank Statement applicable
          else if (!client.gst_1_enabled && !client.tds_document_enabled && client.bank_statement_enabled) {
            if (isGstReminderDay && needsBank) {
              console.log(`Sending Bank statement reminder email to ${client.name}`);
              await sendDocumentEmail(
                graphClient,
                senderEmail,
                client,
                recipients,
                ["Bank statement"],
                gstReminderNumber,
                settings.gst_due_date
              );
              
              // Update reminder status for Bank
              if (gstReminderNumber > 0) {
                await updateReminderStatus(client.id, client.document_month, gstReminderNumber, "bank");
              }
            }
          }
        }

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to send email to ${client.name}:`, error.response?.data || error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error in email reminder service:', error);
  }
};

/**
 * Log email in database using standardized field names
 */
async function logEmailToDatabase(clientId, emailTo, emailSubject, emailBody, reminderNumber, documentMonth, status = 'sent') {
  try {
    // Create log data object
    const logData = {
      client_id: clientId,
      to_email: emailTo,
      subject: emailSubject,
      body: emailBody,
      reminder_number: reminderNumber,
      document_month: documentMonth,
      status: status
    };
    
    // Use the loggingService to log the email
    await loggingService.logEmail(logData);
    console.log(`✅ Email logged to database successfully`);
  } catch (error) {
    console.error('Error logging email:', error.message);
    
    // Fallback to minimal required fields if full insertion fails
    try {
      // Create minimal log data object
      const minimalLogData = {
        client_id: clientId,
        to_email: emailTo,
        status: status
      };
      
      // Use the loggingService to log the minimal email data
      await loggingService.logEmail(minimalLogData);
      console.log(`✅ Email logged to database with minimal fields`);
    } catch (minimalError) {
      console.error('Email logging completely failed:', minimalError.message);
    }
  }
}

/**
 * Send email for specific documents to a client
 */
async function sendDocumentEmail(graphClient, senderEmail, client, recipients, pendingDocs, reminderNumber, dueDate) {
  if (pendingDocs.length === 0) return;
  
  // Create email subject
  const emailSubject = `Reminder to share ${pendingDocs.join(" and ")} for ${client.document_month} - ${client.name}`;

  // Create email body
  const reminderType = reminderNumber === 2 ? "⚠️ URGENT REMINDER" : "📢 Gentle reminder";
  const emailBody = `${reminderType} to share ${pendingDocs.join(" and ")} for the month of ${client.document_month}.

The Last date for submission is ${DateTime.fromJSDate(new Date(dueDate)).toFormat('dd MMMM yyyy')}.

Act now to avoid late fees. Ignore, if data is already provided.

Need assistance? Contact us ASAP.

Thank you for your prompt attention🤝.

Best regards
Team HPRT

M.No. 966 468 7247`;

  const message = {
    message: {
      subject: emailSubject,
      body: { contentType: 'Text', content: emailBody },
      toRecipients: recipients,
    },
    saveToSentItems: 'true',
  };

  // Send email
  await graphClient.post(`/users/${senderEmail}/sendMail`, message);
  console.log(`✅ Email sent to ${client.name} (${recipients.map(r => r.emailAddress.address).join(', ')})`);

  // Log email in database using the new standardized function
  try {
    const emailTo = recipients.map(r => r.emailAddress.address).join(', ');
    await logEmailToDatabase(
      client.id,
      emailTo,
      emailSubject,
      emailBody,
      reminderNumber,
      client.document_month
    );
    console.log(`✅ Email logged to database for ${client.name}`);
  } catch (error) {
    console.error('Error logging email:', error.message);
  }
}

/**
 * Update reminder status in the database
 */
async function updateReminderStatus(clientId, documentMonth, reminderNumber, documentType) {
  let columnPrefix = '';
  
  switch (documentType) {
    case 'gst':
      columnPrefix = 'gst_1_reminder_';
      break;
    case 'tds':
      columnPrefix = 'tds_reminder_';
      break;
    case 'bank':
      columnPrefix = 'bank_reminder_';
      break;
    default:
      columnPrefix = 'reminder_';
  }
  
  try {
    // Create a structured reminder update object
    const reminderUpdate = {
      client_id: clientId,
      document_month: documentMonth,
      reminder_number: reminderNumber,
      document_type: documentType,
      column_prefix: columnPrefix
    };
    
    // This is a placeholder - we would need to create this function in clientDocumentsQueries
    await clientDocumentsQueries.updateReminderStatus(reminderUpdate);
    
    console.log(`✅ Updated ${documentType} reminder ${reminderNumber} status for client ID ${clientId}`);
  } catch (error) {
    console.error(`❌ Error updating ${documentType} reminder status: ${error.message}`);
  }
}

module.exports = { sendEmailReminders };
