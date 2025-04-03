const db = require('../config/db');

/**
 * @desc    Get all document records with pending status
 */
exports.getPendingDocuments = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT cd.*, c.name as client_name, c.email_id_1, c.gst_filing_type,
                   c.gst_1_enabled, c.bank_statement_enabled, c.tds_document_enabled
             FROM "user".client_documents cd
             JOIN "user".clients c ON cd.client_id = c.id
             WHERE (c.gst_1_enabled = true AND cd.gst_1_received = false) OR
                   (c.bank_statement_enabled = true AND cd.bank_statement_received = false) OR
                   (c.tds_document_enabled = true AND cd.tds_received = false)
             ORDER BY cd.document_month DESC, c.name`,
            []
        );
        
        // Calculate last reminder date for each document
        const documentsWithReminders = result.rows.map(doc => {
            // Find the most recent reminder date across all document types
            const reminderDates = [
                // GST reminders
                doc.gst_1_reminder_1_sent_date,
                doc.gst_1_reminder_2_sent_date,
                // TDS reminders
                doc.tds_reminder_1_sent_date,
                doc.tds_reminder_2_sent_date,
                // Bank statement reminders
                doc.bank_reminder_1_sent_date,
                doc.bank_reminder_2_sent_date
            ].filter(date => date !== null);
            
            // Sort dates in descending order (most recent first)
            reminderDates.sort((a, b) => new Date(b) - new Date(a));
            
            // Get the most recent date (first in the sorted array) or null if no reminders
            const lastReminderDate = reminderDates.length > 0 ? reminderDates[0] : null;
            
            return {
                ...doc,
                last_reminder_date: lastReminderDate
            };
        });
        
        res.json(documentsWithReminders);
    } catch (error) {
        console.error('Error fetching pending document records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 