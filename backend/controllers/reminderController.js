const { runTaskImmediately } = require('../services/schedulerService');
const settingsQueries = require('../queries/settingsQueries');

/**
 * @desc    Get current reminder dates
 */
exports.getReminders = async (req, res) => {
    try {
        const settings = await settingsQueries.getLatestReminderSettings();
        
        if (!settings) {
            console.log('No reminder dates found, returning empty object');
            return res.status(200).json({});
        }
        
        res.json({
            gst_reminder_1_date: settings.gst_reminder_1_date, 
            gst_reminder_2_date: settings.gst_reminder_2_date, 
            tds_reminder_1_date: settings.tds_reminder_1_date, 
            tds_reminder_2_date: settings.tds_reminder_2_date
        });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update reminder dates (partial update)
 */
exports.updateReminders = async (req, res) => {
    try {
        const updates = req.body;
        
        try {
            // Get the latest settings ID
            const settings = await settingsQueries.getLatestReminderSettings();
            let settingsId;
            
            if (!settings) {
                console.log('No settings found, creating default settings before updating reminders');
                const defaultSettings = await settingsQueries.createReminderSettings({
                    current_month: new Date().toISOString().split('T')[0],
                    today_date: new Date().toISOString().split('T')[0],
                    gst_due_date: new Date().toISOString().split('T')[0]
                });
                settingsId = defaultSettings.id;
            } else {
                settingsId = settings.id;
            }
            
            await settingsQueries.updateReminderSettings(settingsId, updates);
            
            res.json({ message: 'Reminders updated successfully' });
        } catch (error) {
            if (error.message === 'No valid updates provided') {
                return res.status(400).json({ error: 'No valid updates provided' });
            }
            throw error;
        }
    } catch (error) {
        console.error('Error updating reminders:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Reset all reminder dates
 */
exports.resetReminders = async (req, res) => {
    try {
        // Get the latest settings ID
        const settings = await settingsQueries.getLatestReminderSettings();
        let settingsId;
        
        if (!settings) {
            console.log('No settings found, creating default settings before resetting reminders');
            const defaultSettings = await settingsQueries.createReminderSettings({
                current_month: new Date().toISOString().split('T')[0],
                today_date: new Date().toISOString().split('T')[0],
                gst_due_date: new Date().toISOString().split('T')[0]
            });
            settingsId = defaultSettings.id;
        } else {
            settingsId = settings.id;
        }
        
        await settingsQueries.resetReminderDates(settingsId);
        
        res.json({ message: 'All reminders reset successfully' });
    } catch (error) {
        console.error('Error resetting reminders:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Manually trigger a specific reminder
 */
exports.triggerReminder = async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['whatsapp', 'email', 'report'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid reminder type' });
        }
        
        await runTaskImmediately(type);
        res.json({ message: `${type} reminder triggered successfully` });
    } catch (error) {
        console.error(`Error triggering ${req.params.type} reminder:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 