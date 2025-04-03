const { Parser } = require('json2csv');
const { DateTime } = require('luxon');
const logsQueries = require('../queries/logsQueries');
const db = require('../config/db');

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
    
    // Get logs from the database
    const logs = await logsQueries.getWhatsAppLogs(startDateTime, endDateTime);
    
    res.json(logs);
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
    
    // Get logs from the database
    const logs = await logsQueries.getEmailLogs(startDateTime, endDateTime);
    
    res.json(logs);
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
    
    // Get logs from the database
    const logs = await logsQueries.getWhatsAppLogs(startDateTime, endDateTime);
    
    // Format dates for readability in CSV
    const formattedLogs = logs.map((log, index) => ({
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
    
    // Get logs from the database
    const logs = await logsQueries.getEmailLogs(startDateTime, endDateTime);
    
    // Format dates for readability in CSV
    const formattedLogs = logs.map((log, index) => ({
      sr_no: index + 1,
      ...log,
      sent_at: log.sent_at ? formatDateTime(log.sent_at) : '',
      created_at: log.created_at ? formatDateTime(log.created_at) : ''
    }));
    
    // Convert to CSV
    const fields = ['sr_no', 'id', 'to_email', 'cc_emails', 'subject', 'template_used', 'status', 'sent_at', 'error_message'];
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
 * @desc    Get system logs with date filter
 */
exports.getSystemLogs = async (req, res) => {
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
    
    // Get logs from the database
    const logs = await logsQueries.getSystemLogs(startDateTime, endDateTime);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
};

/**
 * @desc    Get document update logs with date filter
 */
exports.getDocumentUpdateLogs = async (req, res) => {
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
    
    // Get logs from the database
    const logs = await logsQueries.getDocumentUpdateLogs(startDateTime, endDateTime);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching document update logs:', error);
    res.status(500).json({ error: 'Failed to fetch document update logs' });
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
    
    // Check if the whatsapp_logs table exists
    const exists = await logsQueries.tableExists('whatsapp_logs');
    
    if (!exists) {
      return res.status(404).json({ error: 'WhatsApp logs table does not exist' });
    }
    
    // Delete logs within date range using our query module
    const count = await logsQueries.deleteWhatsAppLogs(startDateTime, endDateTime);
    
    res.json({ 
      message: 'WhatsApp logs cleared successfully', 
      count: count 
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
    
    // Check if the email_logs table exists
    const exists = await logsQueries.tableExists('email_logs');
    
    if (!exists) {
      return res.status(404).json({ error: 'Email logs table does not exist' });
    }
    
    // Delete logs within date range using our query module
    const count = await logsQueries.deleteEmailLogs(startDateTime, endDateTime);
    
    res.json({ 
      message: 'Email logs cleared successfully', 
      count: count 
    });
  } catch (error) {
    console.error('Error clearing email logs:', error);
    res.status(500).json({ error: 'Failed to clear email logs' });
  }
};

/**
 * Format date and time for display in logs
 * @param {string} dateTimeString - ISO date string
 * @returns {string} - Formatted date and time
 */
function formatDateTime(dateTimeString) {
  try {
    const dt = DateTime.fromISO(dateTimeString);
    return dt.toFormat('dd/MM/yyyy HH:mm:ss');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateTimeString;
  }
} 