const { ReminderSettings } = require('../models');

/**
 * Get the current reminder settings
 */
const getReminderSettings = async (req, res) => {
  try {
    const settings = await ReminderSettings.findOne({
      order: [['id', 'DESC']]
    });
    
    res.json(settings || {});
  } catch (error) {
    console.error('Error fetching reminder settings:', error);
    res.status(500).json({ error: 'Failed to fetch reminder settings' });
  }
};

/**
 * Update or create reminder settings
 */
const updateReminderSettings = async (req, res) => {
  try {
    const {
      current_month,
      gst_due_date,
      tds_due_date,
      gst_reminder_1_date,
      gst_reminder_2_date,
      tds_reminder_1_date,
      tds_reminder_2_date,
      bank_reminder_1_date,
      bank_reminder_2_date
    } = req.body;
    
    // Create new settings record
    const settings = await ReminderSettings.create({
      current_month,
      gst_due_date,
      tds_due_date,
      gst_reminder_1_date,
      gst_reminder_2_date,
      tds_reminder_1_date,
      tds_reminder_2_date,
      bank_reminder_1_date,
      bank_reminder_2_date
    });
    
    res.status(201).json(settings);
  } catch (error) {
    console.error('Error updating reminder settings:', error);
    res.status(500).json({ error: 'Failed to update reminder settings' });
  }
};

module.exports = {
  getReminderSettings,
  updateReminderSettings
}; 