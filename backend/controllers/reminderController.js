const db = require('../config/db');
const { runTaskImmediately } = require('../services/schedulerService');

/**
 * @desc    Get current reminder dates
 */
exports.getReminders = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                TO_CHAR(gst_reminder_1_date, 'YYYY-MM-DD') AS gst_reminder_1_date, 
                TO_CHAR(gst_reminder_2_date, 'YYYY-MM-DD') AS gst_reminder_2_date, 
                TO_CHAR(tds_reminder_1_date, 'YYYY-MM-DD') AS tds_reminder_1_date, 
                TO_CHAR(tds_reminder_2_date, 'YYYY-MM-DD') AS tds_reminder_2_date
             FROM "user".reminder_settings 
             ORDER BY id DESC
             LIMIT 1`
        );
        
        if (result.rows.length === 0) {
            console.log('No reminder dates found, returning empty object');
            return res.status(200).json({});
        }
        
        res.json(result.rows[0]);
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
        const validFields = ['gst_reminder_1_date', 'gst_reminder_2_date', 'tds_reminder_1_date', 'tds_reminder_2_date'];
        const updateFields = [];
        const values = [];
        
        let index = 1;
        Object.keys(updates).forEach(key => {
            if (validFields.includes(key)) {
                updateFields.push(`${key} = $${index}`);
                values.push(updates[key]);
                index++;
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }
        
        // Get the latest settings ID
        const idResult = await db.query(
            `SELECT id FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
        );
        
        if (idResult.rows.length === 0) {
            console.log('No settings found, creating default settings before updating reminders');
            
            // Create default settings first
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const month = new Date().toLocaleString('default', { month: 'long' });
            const year = new Date().getFullYear();
            
            const defaultSettings = await db.query(
                `INSERT INTO "user".reminder_settings 
                    (current_month, today_date, gst_due_date, scheduler_hour, scheduler_minute, scheduler_am_pm)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [`${month} ${year}`, today, today, 9, 0, 'AM']
            );
            
            // Use the new settings ID
            settingsId = defaultSettings.rows[0].id;
        } else {
            settingsId = idResult.rows[0].id;
        }
        
        const query = `UPDATE "user".reminder_settings SET ${updateFields.join(', ')} WHERE id = $${index}`;
        values.push(settingsId);
        
        await db.query(query, values);
        
        res.json({ message: 'Reminders updated successfully' });
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
        const idResult = await db.query(
            `SELECT id FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
        );
        
        if (idResult.rows.length === 0) {
            console.log('No settings found, creating default settings before resetting reminders');
            
            // Create default settings first
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const month = new Date().toLocaleString('default', { month: 'long' });
            const year = new Date().getFullYear();
            
            const defaultSettings = await db.query(
                `INSERT INTO "user".reminder_settings 
                    (current_month, today_date, gst_due_date, scheduler_hour, scheduler_minute, scheduler_am_pm)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [`${month} ${year}`, today, today, 9, 0, 'AM']
            );
            
            // Use the new settings ID
            settingsId = defaultSettings.rows[0].id;
        } else {
            settingsId = idResult.rows[0].id;
        }
        
        await db.query(
            `UPDATE "user".reminder_settings 
             SET gst_reminder_1_date = NULL, 
                 gst_reminder_2_date = NULL, 
                 tds_reminder_1_date = NULL, 
                 tds_reminder_2_date = NULL
             WHERE id = $1`,
             [settingsId]
        );
        
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