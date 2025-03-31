const db = require('../config/db');
const { Parser } = require('json2csv');
const { DateTime } = require('luxon');

/**
 * @desc    Get WhatsApp logs with date filter
 */
exports.getWhatsAppLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Convert dates to ISO format for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Validate date range
    if (startDateTime > endDateTime) {
      return res.status(400).json({ error: 'Start date cannot be greater than end date' });
    }
    
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Ensure the whatsapp_logs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'user' 
        AND table_name = 'whatsapp_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      return res.json([]);
    }
    
    // Query logs within date range
    const logs = await db.query(`
      SELECT * FROM "user".whatsapp_logs
      WHERE sent_at BETWEEN $1 AND $2 OR created_at BETWEEN $1 AND $2
      ORDER BY sent_at DESC, created_at DESC
    `, [startDateTime.toISOString(), endDateTime.toISOString()]);
    
    res.json(logs.rows);
  } catch (error) {
    console.error('Error fetching WhatsApp logs:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp logs' });
  }
};

/**
 * @desc    Get email logs with date filter
 */
exports.getEmailLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Convert dates to ISO format for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Validate date range
    if (startDateTime > endDateTime) {
      return res.status(400).json({ error: 'Start date cannot be greater than end date' });
    }
    
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Ensure the email_logs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'user' 
        AND table_name = 'email_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      return res.json([]);
    }
    
    // Query logs within date range
    const logs = await db.query(`
      SELECT * FROM "user".email_logs
      WHERE sent_at BETWEEN $1 AND $2
      ORDER BY sent_at DESC
    `, [startDateTime.toISOString(), endDateTime.toISOString()]);
    
    res.json(logs.rows);
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
};

/**
 * @desc    Download WhatsApp logs as CSV
 */
exports.downloadWhatsAppLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Convert dates to ISO format for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Validate date range
    if (startDateTime > endDateTime) {
      return res.status(400).json({ error: 'Start date cannot be greater than end date' });
    }
    
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Ensure the whatsapp_logs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'user' 
        AND table_name = 'whatsapp_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      return res.json({ error: 'No logs table found' });
    }
    
    // Query logs within date range
    const logs = await db.query(`
      SELECT * FROM "user".whatsapp_logs
      WHERE sent_at BETWEEN $1 AND $2 OR created_at BETWEEN $1 AND $2
      ORDER BY sent_at DESC, created_at DESC
    `, [startDateTime.toISOString(), endDateTime.toISOString()]);
    
    // Format dates for readability in CSV
    const formattedLogs = logs.rows.map((log, index) => ({
      sr_no: index + 1,
      ...log,
      sent_at: log.sent_at ? formatDateTime(log.sent_at) : '',
      created_at: log.created_at ? formatDateTime(log.created_at) : ''
    }));
    
    // Convert to CSV
    const fields = ['sr_no', 'id', 'group_id', 'message', 'status', 'sent_at', 'error_message', 'created_at'];
    const parser = new Parser({ fields });
    const csv = parser.parse(formattedLogs);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=whatsapp_logs_${startDate}_to_${endDate}.csv`);
    
    res.send(csv);
  } catch (error) {
    console.error('Error downloading WhatsApp logs:', error);
    res.status(500).json({ error: 'Failed to download WhatsApp logs' });
  }
};

/**
 * @desc    Download email logs as CSV
 */
exports.downloadEmailLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Convert dates to ISO format for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Validate date range
    if (startDateTime > endDateTime) {
      return res.status(400).json({ error: 'Start date cannot be greater than end date' });
    }
    
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Ensure the email_logs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'user' 
        AND table_name = 'email_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      return res.json({ error: 'No logs table found' });
    }
    
    // Query logs within date range
    const logs = await db.query(`
      SELECT * FROM "user".email_logs
      WHERE sent_at BETWEEN $1 AND $2
      ORDER BY sent_at DESC
    `, [startDateTime.toISOString(), endDateTime.toISOString()]);
    
    // Format dates for readability in CSV
    const formattedLogs = logs.rows.map((log, index) => ({
      sr_no: index + 1,
      ...log,
      sent_at: log.sent_at ? formatDateTime(log.sent_at) : ''
    }));
    
    // Convert to CSV
    const fields = ['sr_no', 'id', 'recipient', 'subject', 'status', 'sent_at', 'error_message'];
    const parser = new Parser({ fields });
    const csv = parser.parse(formattedLogs);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=email_logs_${startDate}_to_${endDate}.csv`);
    
    res.send(csv);
  } catch (error) {
    console.error('Error downloading email logs:', error);
    res.status(500).json({ error: 'Failed to download email logs' });
  }
};

/**
 * @desc    Clear WhatsApp logs for a date range
 */
exports.clearWhatsAppLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Convert dates to ISO format for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Validate date range
    if (startDateTime > endDateTime) {
      return res.status(400).json({ error: 'Start date cannot be greater than end date' });
    }
    
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Ensure the whatsapp_logs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'user' 
        AND table_name = 'whatsapp_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      return res.status(404).json({ error: 'WhatsApp logs table does not exist' });
    }
    
    // Delete logs within date range
    const result = await db.query(`
      DELETE FROM "user".whatsapp_logs
      WHERE (sent_at BETWEEN $1 AND $2) OR (created_at BETWEEN $1 AND $2)
    `, [startDateTime.toISOString(), endDateTime.toISOString()]);
    
    res.json({ 
      message: 'WhatsApp logs cleared successfully', 
      count: result.rowCount 
    });
  } catch (error) {
    console.error('Error clearing WhatsApp logs:', error);
    res.status(500).json({ error: 'Failed to clear WhatsApp logs' });
  }
};

/**
 * @desc    Clear email logs for a date range
 */
exports.clearEmailLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Convert dates to ISO format for comparison
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    // Validate date range
    if (startDateTime > endDateTime) {
      return res.status(400).json({ error: 'Start date cannot be greater than end date' });
    }
    
    // Set end date to end of day
    endDateTime.setHours(23, 59, 59, 999);
    
    // Ensure the email_logs table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'user' 
        AND table_name = 'email_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      return res.status(404).json({ error: 'Email logs table does not exist' });
    }
    
    // Delete logs within date range
    const result = await db.query(`
      DELETE FROM "user".email_logs
      WHERE sent_at BETWEEN $1 AND $2
    `, [startDateTime.toISOString(), endDateTime.toISOString()]);
    
    res.json({ 
      message: 'Email logs cleared successfully', 
      count: result.rowCount 
    });
  } catch (error) {
    console.error('Error clearing email logs:', error);
    res.status(500).json({ error: 'Failed to clear email logs' });
  }
};

// Helper function to format date time
function formatDateTime(dateTimeString) {
  try {
    // Parse the input string to a DateTime object
    const dt = DateTime.fromISO(dateTimeString);
    
    // Format the date and time in a readable format
    return dt.toLocaleString(DateTime.DATETIME_MED);
  } catch (error) {
    console.error('Error formatting date time:', error);
    return dateTimeString || '';
  }
} 