const db = require('../config/db');
const { reloadScheduler } = require('../services/schedulerService');

/**
 * @desc    Get current reminder settings
 */
exports.getReminderSettings = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, current_month, 
                    today_date::DATE as today_date, 
                    gst_due_date::DATE as gst_due_date, 
                    gst_reminder_1_date::DATE as gst_reminder_1_date, 
                    gst_reminder_2_date::DATE as gst_reminder_2_date,
                    tds_due_date::DATE as tds_due_date,
                    tds_reminder_1_date::DATE as tds_reminder_1_date,
                    tds_reminder_2_date::DATE as tds_reminder_2_date,
                    password, scheduler_hour, scheduler_minute, scheduler_am_pm,
                    enable_whatsapp_reminders, enable_email_reminders,
                    created_at, updated_at
             FROM "user".reminder_settings 
             ORDER BY id DESC LIMIT 1`
        );
        
        if (result.rows.length === 0) {
            console.log('No reminder settings found, returning empty object');
            return res.status(200).json({});
        }
        
        res.json(result.rows[0]);
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
        const result = await db.query(
            `SELECT DISTINCT 
                EXTRACT(MONTH FROM TO_DATE(current_month, 'Month YYYY'))::integer as month,
                EXTRACT(YEAR FROM TO_DATE(current_month, 'Month YYYY'))::integer as year
             FROM "user".reminder_settings 
             ORDER BY year DESC, month DESC`
        );
        
        res.json(result.rows);
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
        
        // Convert month and year to a month year string (e.g., "January 2023")
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const monthYearString = `${monthName} ${year}`;
        
        console.log(`Fetching settings for month: ${monthYearString}`);
        
        const result = await db.query(
            `SELECT id, current_month, 
                    today_date::DATE as today_date, 
                    gst_due_date::DATE as gst_due_date, 
                    gst_reminder_1_date::DATE as gst_reminder_1_date, 
                    gst_reminder_2_date::DATE as gst_reminder_2_date,
                    tds_due_date::DATE as tds_due_date,
                    tds_reminder_1_date::DATE as tds_reminder_1_date, 
                    tds_reminder_2_date::DATE as tds_reminder_2_date,
                    password, scheduler_hour, scheduler_minute, scheduler_am_pm,
                    enable_whatsapp_reminders, enable_email_reminders,
                    created_at, updated_at
             FROM "user".reminder_settings 
             WHERE current_month = $1
             ORDER BY id DESC LIMIT 1`,
            [monthYearString]
        );
        
        if (result.rows.length === 0) {
            return res.status(200).json({});
        }
        
        res.json(result.rows[0]);
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
            scheduler_am_pm
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
        
        // Handle empty dates by converting them to null
        const handleEmptyDate = (date) => {
            return date === '' ? null : date;
        };
        
        // Insert new settings
        const result = await db.query(
            `INSERT INTO "user".reminder_settings (
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
                scheduler_am_pm
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING id, created_at, updated_at`,
            [
                current_month,
                today_date,
                gst_due_date,
                handleEmptyDate(gst_reminder_1_date),
                handleEmptyDate(gst_reminder_2_date),
                handleEmptyDate(tds_due_date),
                handleEmptyDate(tds_reminder_1_date),
                handleEmptyDate(tds_reminder_2_date),
                password || null,
                scheduler_hour || 9,
                scheduler_minute || 0,
                scheduler_am_pm || 'AM'
            ]
        );
        
        // Trigger scheduler reload to apply the new settings
        await reloadScheduler();
        
        // Return success
        res.status(201).json({ 
            message: 'Reminder settings created successfully',
            id: result.rows[0].id,
            created_at: result.rows[0].created_at,
            updated_at: result.rows[0].updated_at
        });
        
    } catch (error) {
        console.error('Error creating reminder settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
        
        // Convert month and year to a month year string (e.g., "January 2023")
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const monthYearString = `${monthName} ${parseInt(year)}`;
        
        // Ensure current_month matches the provided month and year
        settings.current_month = monthYearString;
        
        // Check if settings for this month already exist
        const existingResult = await db.query(
            `SELECT id FROM "user".reminder_settings
             WHERE current_month = $1
             ORDER BY id DESC LIMIT 1`,
            [monthYearString]
        );
        
        // Handle empty dates by converting them to null
        const handleEmptyDate = (date) => {
            return date === '' ? null : date;
        };
        
        let result;
        if (existingResult.rows.length === 0) {
            // Create new settings for this month
            const requiredFields = ['today_date', 'gst_due_date'];
            for (const field of requiredFields) {
                if (!settings[field]) {
                    return res.status(400).json({ error: `${field} is required` });
                }
            }
            
            // Insert new record
            result = await db.query(
                `INSERT INTO "user".reminder_settings (
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
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
                RETURNING id, created_at, updated_at`,
                [
                    monthYearString,
                    settings.today_date,
                    settings.gst_due_date,
                    handleEmptyDate(settings.gst_reminder_1_date),
                    handleEmptyDate(settings.gst_reminder_2_date),
                    handleEmptyDate(settings.tds_due_date),
                    handleEmptyDate(settings.tds_reminder_1_date),
                    handleEmptyDate(settings.tds_reminder_2_date),
                    settings.password || null,
                    settings.scheduler_hour || 9,
                    settings.scheduler_minute || 0,
                    settings.scheduler_am_pm || 'AM',
                    settings.enable_whatsapp_reminders !== undefined ? settings.enable_whatsapp_reminders : true,
                    settings.enable_email_reminders !== undefined ? settings.enable_email_reminders : true
                ]
            );
            
            // Trigger scheduler reload to apply the new settings
            await reloadScheduler();
            
            // Return success
            res.status(201).json({ 
                message: `Reminder settings for ${monthYearString} created successfully`,
                id: result.rows[0].id,
                created_at: result.rows[0].created_at,
                updated_at: result.rows[0].updated_at
            });
        } else {
            // Update existing settings
            const settingsId = existingResult.rows[0].id;
            
            // Define fields that can be updated
            const validFields = [
                'today_date', 
                'gst_due_date', 
                'gst_reminder_1_date', 
                'gst_reminder_2_date',
                'tds_due_date',
                'tds_reminder_1_date',
                'tds_reminder_2_date',
                'password',
                'scheduler_hour',
                'scheduler_minute',
                'scheduler_am_pm',
                'enable_whatsapp_reminders',
                'enable_email_reminders'
            ];
            
            // Build update query dynamically
            const updateFields = [];
            const values = [];
            let index = 1;
            
            // Add updated fields to query
            validFields.forEach(field => {
                if (settings[field] !== undefined) {
                    updateFields.push(`${field} = $${index}`);
                    if (['gst_reminder_1_date', 'gst_reminder_2_date', 'tds_reminder_1_date', 'tds_reminder_2_date', 'tds_due_date'].includes(field)) {
                        values.push(handleEmptyDate(settings[field]));
                    } else {
                        values.push(settings[field]);
                    }
                    index++;
                }
            });
            
            // Add updated_at timestamp
            updateFields.push(`updated_at = NOW()`);
            
            // Execute update query
            const query = `UPDATE "user".reminder_settings SET ${updateFields.join(', ')} WHERE id = $${index} RETURNING id, updated_at`;
            values.push(settingsId);
            
            result = await db.query(query, values);
            
            // Trigger scheduler reload to apply the new settings
            await reloadScheduler();
            
            // Return success
            res.json({ 
                message: `Reminder settings for ${monthYearString} updated successfully`,
                id: result.rows[0].id,
                updated_at: result.rows[0].updated_at
            });
        }
    } catch (error) {
        console.error('Error saving settings for month:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update reminder settings
 */
exports.updateReminderSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log('Received update request for settings ID:', id);
        console.log('Update data:', JSON.stringify(updates, null, 2));
        
        // Validate required fields if they are being updated
        if (updates.current_month === undefined && updates.today_date === undefined && updates.gst_due_date === undefined) {
            // If none of the required fields are being updated, proceed
        } else {
            if (updates.current_month === '') {
                return res.status(400).json({ error: 'Current month is required' });
            }
            if (updates.today_date === '') {
                return res.status(400).json({ error: 'Today date is required' });
            }
            if (updates.gst_due_date === '') {
                return res.status(400).json({ error: 'GST due date is required' });
            }
        }
        
        // Validate scheduler minute value if it's being updated
        if (updates.scheduler_minute !== undefined && 
            (updates.scheduler_minute < 0 || updates.scheduler_minute > 59)) {
            return res.status(400).json({
                error: 'Scheduler minute must be between 0 and 59'
            });
        }
        
        // Define valid fields that can be updated
        const validFields = [
            'current_month', 
            'today_date', 
            'gst_due_date', 
            'gst_reminder_1_date', 
            'gst_reminder_2_date',
            'tds_due_date',
            'tds_reminder_1_date',
            'tds_reminder_2_date',
            'password',
            'scheduler_hour',
            'scheduler_minute',
            'scheduler_am_pm',
            'enable_whatsapp_reminders',
            'enable_email_reminders'
        ];
        
        const updateFields = [];
        const values = [];
        let index = 1;
        
        // Handle empty dates by converting them to null
        const handleEmptyDate = (date) => {
            return date === '' ? null : date;
        };
        
        // Add each valid field to be updated
        validFields.forEach(field => {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = $${index}`);
                
                // Special handling for date fields
                if (['gst_reminder_1_date', 'gst_reminder_2_date', 'tds_reminder_1_date', 'tds_reminder_2_date', 'tds_due_date'].includes(field)) {
                    values.push(handleEmptyDate(updates[field]));
                } else {
                    values.push(updates[field]);
                }
                
                index++;
            }
        });
        
        // Add updated_at timestamp
        updateFields.push(`updated_at = NOW()`);
        
        // Check if there are fields to update
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        // Construct and execute the update query
        const query = `UPDATE "user".reminder_settings SET ${updateFields.join(', ')} WHERE id = $${index} RETURNING id, updated_at`;
        values.push(id);
        
        const result = await db.query(query, values);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Settings with the provided ID not found' });
        }
        
        // Reload the scheduler to apply the updated settings
        await reloadScheduler();
        
        res.json({ 
            message: 'Settings updated successfully',
            id: result.rows[0].id,
            updated_at: result.rows[0].updated_at
        });
        
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update notification settings
 */
exports.updateNotificationSettings = async (req, res) => {
    try {
        const updates = req.body;
        const validFields = ['enable_whatsapp_reminders', 'enable_email_reminders'];
        
        // Get the latest settings ID
        const idResult = await db.query(
            `SELECT id FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
        );
        
        if (idResult.rows.length === 0) {
            return res.status(404).json({ error: 'No settings found to update' });
        }
        
        const settingsId = idResult.rows[0].id;
        const updateFields = [];
        const values = [];
        let index = 1;
        
        // Add each valid field to be updated
        validFields.forEach(field => {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = $${index}`);
                values.push(updates[field]);
                index++;
            }
        });
        
        // Add updated_at timestamp
        updateFields.push(`updated_at = NOW()`);
        
        // Check if there are fields to update
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        // Execute the update query
        const query = `UPDATE "user".reminder_settings SET ${updateFields.join(', ')} WHERE id = $${index}`;
        values.push(settingsId);
        
        await db.query(query, values);
        
        // Reload the scheduler to apply the updated settings
        await reloadScheduler();
        
        res.json({ message: 'Notification settings updated successfully' });
        
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Reload scheduler
 */
exports.reloadSchedulerHandler = async (req, res) => {
    try {
        await reloadScheduler();
        res.json({ message: 'Scheduler reloaded successfully' });
    } catch (error) {
        console.error('Error reloading scheduler:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 