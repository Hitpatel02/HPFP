const { reloadScheduler } = require('../services/schedulerService');
const settingsQueries = require('../queries/settingsQueries');
const { MONTHS } = require('../utils/dateUtils');

/**
 * @desc    Get current reminder settings
 */
exports.getReminderSettings = async (req, res) => {
    try {
        const settings = await settingsQueries.getLatestReminderSettings();
        
        if (!settings) {
            return res.status(200).json({});
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching reminder settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get all available months with reminder settings
 */
exports.getAvailableMonths = async (req, res) => {
    try {
        const result = await settingsQueries.getAvailableMonths();
        
        // Format the months with month names for easier display
        const months = result.map(row => {
            // Get month name from the MONTHS array in dateUtils
            const monthName = MONTHS[row.month - 1]; // Subtract 1 since array is 0-indexed
            
            return {
                ...row,
                month_name: monthName,
                formatted: `${monthName} ${row.year}`
            };
        });
        
        res.json(months);
    } catch (error) {
        console.error('Error fetching available months:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get settings for a specific month and year
 */
exports.getSettingsForMonth = async (req, res) => {
    try {
        const { year, month } = req.params;
        
        // Validate month and year
        if (!month || !year || isNaN(month) || isNaN(year)) {
            return res.status(400).json({ error: 'Valid month and year are required' });
        }
        
        // Convert month and year to a month year string (e.g., "January 2023")
        const monthIndex = parseInt(month) - 1; // Convert to 0-based index
        if (monthIndex < 0 || monthIndex >= 12) {
            return res.status(400).json({ error: 'Month must be between 1 and 12' });
        }
        
        const monthName = MONTHS[monthIndex];
        const monthYearString = `${monthName} ${year}`;
        
        const settings = await settingsQueries.getSettingsForMonth(monthYearString);
        
        if (!settings) {
            // Get the most recent settings to use as a template
            const defaultSettings = await settingsQueries.getLatestReminderSettings();
            
            if (!defaultSettings) {
                return res.status(200).json({});
            }
            
            // Create placeholder settings for the requested month
            const templateSettings = {
                ...defaultSettings,
                id: null, // Clear ID so frontend knows this is a new record
                today_date: null,
                gst_due_date: null,
                gst_reminder_1_date: null,
                gst_reminder_2_date: null,
                tds_due_date: null,
                tds_reminder_1_date: null,
                tds_reminder_2_date: null,
                current_month: monthYearString,
                isNewRecord: true // Flag to indicate this is not saved yet
            };
            
            return res.json(templateSettings);
        }
        
        // Return the found settings without the isNewRecord flag
        const result = {
            ...settings,
            isNewRecord: false
        };
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching settings for month:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Create new reminder settings
 */
exports.createReminderSettings = async (req, res) => {
    try {
        const {
            current_month,
            today_date, 
            gst_due_date,
            gst_reminder_1_date,
            gst_reminder_2_date,
            tds_due_date,
            tds_reminder_1_date,
            tds_reminder_2_date,
            password,
            scheduler_hour,
            scheduler_minute,
            scheduler_am_pm,
            enable_whatsapp_reminders,
            enable_email_reminders
        } = req.body;
        
        // Validate required fields
        if (!current_month || !today_date || !gst_due_date) {
            return res.status(400).json({ 
                error: 'Current month, today date, and GST due date are required' 
            });
        }
        
        // Validate scheduler minute value (must be between 0-59)
        if (scheduler_minute !== undefined && (scheduler_minute < 0 || scheduler_minute > 59)) {
            return res.status(400).json({
                error: 'Scheduler minute must be between 0 and 59'
            });
        }
        
        // Create settings
        const result = await settingsQueries.createReminderSettings({
            current_month,
            today_date,
            gst_due_date,
            gst_reminder_1_date,
            gst_reminder_2_date,
            tds_due_date,
            tds_reminder_1_date,
            tds_reminder_2_date,
            password,
            scheduler_hour,
            scheduler_minute,
            scheduler_am_pm,
            enable_whatsapp_reminders,
            enable_email_reminders
        });
        
        // Trigger scheduler reload to apply the new settings
        await reloadScheduler();
        
        // Return success
        res.status(201).json({ 
            success: true,
            message: 'Reminder settings created successfully',
            settings: result
        });
        
    } catch (error) {
        console.error('Error creating reminder settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error' 
        });
    }
};

/**
 * @desc    Save settings for specific month
 */
exports.saveSettingsForMonth = async (req, res) => {
    try {
        const { year, month } = req.params;
        const settings = req.body;
        
        // Validate month and year
        if (!month || !year || isNaN(month) || isNaN(year)) {
            return res.status(400).json({ error: 'Valid month and year are required' });
        }
        
        // Import dateUtils to use the standard MONTHS array
        const monthIndex = parseInt(month) - 1; // Convert to 0-based index
        if (monthIndex < 0 || monthIndex >= 12) {
            return res.status(400).json({ error: 'Month must be between 1 and 12' });
        }
        
        const monthName = MONTHS[monthIndex];
        const monthYearString = `${monthName} ${parseInt(year)}`;
        
        // Ensure current_month matches the provided month and year
        settings.current_month = monthYearString;
        
        // Remove month and year fields if they exist as they don't exist in the database
        delete settings.month;
        delete settings.year;
        
        // Validate today_date - ensure it's a proper date
        // Always use the current date for today_date
        const today = new Date();
        // Format as YYYY-MM-DD with UTC adjustment to ensure consistency
        const currentYear = today.getFullYear();
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');  
        const currentDay = String(today.getDate()).padStart(2, '0');
        settings.today_date = `${currentYear}-${currentMonth}-${currentDay}`;
        
        // Check if settings for this month already exist
        const existingResult = await settingsQueries.getSettingsForMonth(monthYearString);
        
        let result;
        if (existingResult === null) {
            // Create new settings for this month
            const requiredFields = ['today_date', 'gst_due_date'];
            for (const field of requiredFields) {
                if (!settings[field]) {
                    return res.status(400).json({ error: `${field} is required` });
                }
            }
            
            // Insert new record
            result = await settingsQueries.createReminderSettings(settings);
            
            // Trigger scheduler reload to apply the new settings
            await reloadScheduler();
            
            // Return success
            res.status(201).json({ 
                success: true,
                message: `Reminder settings for ${monthYearString} created successfully`,
                settings: result
            });
        } else {
            // Update existing settings
            const settingsId = existingResult.id;
            
            // Update the settings
            result = await settingsQueries.updateReminderSettings(settingsId, settings);
            
            // Trigger scheduler reload to apply the new settings
            await reloadScheduler();
            
            // Return success
            res.json({ 
                success: true,
                message: `Reminder settings for ${monthYearString} updated successfully`,
                settings: result
            });
        }
    } catch (error) {
        console.error('Error saving settings for month:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error' 
        });
    }
};

/**
 * @desc    Update reminder settings
 */
exports.updateReminderSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Validate id
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'Valid ID is required' });
        }
        
        // Validate required fields if they are being updated
        if (updates.current_month === '' || updates.today_date === '' || updates.gst_due_date === '') {
            return res.status(400).json({ 
                error: 'Current month, today date, and GST due date cannot be empty if provided' 
            });
        }
        
        // Validate scheduler minute value if it's being updated
        if (updates.scheduler_minute !== undefined && 
            (updates.scheduler_minute < 0 || updates.scheduler_minute > 59)) {
            return res.status(400).json({
                error: 'Scheduler minute must be between 0 and 59'
            });
        }
        
        // Check if settings exist
        const settings = await settingsQueries.getReminderSettingsById(id);
        
        if (!settings) {
            return res.status(404).json({ error: 'Settings not found' });
        }
        
        // Update settings
        const result = await settingsQueries.updateReminderSettings(id, updates);
        
        // Check if scheduler-related fields were updated
        const schedulerUpdated = updates.scheduler_hour !== undefined || 
                               updates.scheduler_minute !== undefined || 
                               updates.scheduler_am_pm !== undefined;
        
        // If scheduler settings were updated, reload the scheduler
        if (schedulerUpdated) {
            await reloadScheduler();
        }
        
        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: result
        });
    } catch (error) {
        console.error('Error updating reminder settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error' 
        });
    }
};

/**
 * @desc    Delete reminder settings
 */
exports.deleteReminderSettings = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'Valid ID is required' });
        }
        
        // Check if the settings exist
        const settings = await settingsQueries.getReminderSettingsById(id);
        
        if (!settings) {
            return res.status(404).json({ error: 'Settings not found' });
        }
        
        // Delete the settings
        await settingsQueries.deleteReminderSettings(id);
        
        res.json({
            success: true,
            message: 'Reminder settings deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting reminder settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error' 
        });
    }
};

/**
 * @desc    Update notification settings
 */
exports.updateNotificationSettings = async (req, res) => {
    try {
        const { enable_whatsapp_reminders, enable_email_reminders } = req.body;
        
        // Validate that at least one toggle is provided
        if (enable_whatsapp_reminders === undefined && enable_email_reminders === undefined) {
            return res.status(400).json({ 
                success: false,
                error: 'At least one notification toggle must be provided' 
            });
        }
        
        // Get the latest settings
        const settings = await settingsQueries.getLatestReminderSettings();
        let settingsId;
        
        if (!settings) {
            // Create default settings if none exist
            console.log('No settings found, creating default settings before updating notification settings');
            const defaultSettings = await settingsQueries.createReminderSettings({
                current_month: new Date().toISOString().split('T')[0],
                today_date: new Date().toISOString().split('T')[0],
                gst_due_date: new Date().toISOString().split('T')[0],
                enable_whatsapp_reminders: enable_whatsapp_reminders !== undefined ? enable_whatsapp_reminders : true,
                enable_email_reminders: enable_email_reminders !== undefined ? enable_email_reminders : true
            });
            settingsId = defaultSettings.id;
        } else {
            settingsId = settings.id;
            
            // Update the notification settings
            const updates = {};
            if (enable_whatsapp_reminders !== undefined) {
                updates.enable_whatsapp_reminders = enable_whatsapp_reminders;
            }
            if (enable_email_reminders !== undefined) {
                updates.enable_email_reminders = enable_email_reminders;
            }
            
            await settingsQueries.updateReminderSettings(settingsId, updates);
        }
        
        res.json({
            success: true,
            message: 'Notification settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error' 
        });
    }
};

/**
 * @desc    Reload the scheduler
 */
exports.reloadSchedulerSettings = async (req, res) => {
    try {
        const result = await reloadScheduler();
        
        res.json({
            success: true,
            message: 'Scheduler reloaded successfully',
            schedule: result.cronSchedule
        });
    } catch (error) {
        console.error('Error reloading scheduler:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to reload scheduler' 
        });
    }
}; 