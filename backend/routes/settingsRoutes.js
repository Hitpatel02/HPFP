const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const { reloadScheduler } = require('../services/schedulerService');

/**
 * @route   GET /api/settings
 * @desc    Get current reminder settings
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
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
            return res.status(404).json({ error: 'No reminder settings found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching reminder settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   POST /api/settings
 * @desc    Create new reminder settings
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
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
        
        const result = await db.query(
            `INSERT INTO "user".reminder_settings 
                (current_month, today_date, gst_due_date, gst_reminder_1_date, gst_reminder_2_date, 
                 tds_due_date, tds_reminder_1_date, tds_reminder_2_date,
                 password, scheduler_hour, scheduler_minute, scheduler_am_pm) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING *`,
            [
                current_month, 
                today_date, 
                gst_due_date, 
                handleEmptyDate(gst_reminder_1_date), 
                handleEmptyDate(gst_reminder_2_date), 
                handleEmptyDate(tds_due_date),
                handleEmptyDate(tds_reminder_1_date),
                handleEmptyDate(tds_reminder_2_date),
                password,
                scheduler_hour || 9, 
                scheduler_minute || 0, 
                scheduler_am_pm || 'AM'
            ]
        );
        
        // Check if scheduler settings were included and reload the scheduler
        if (scheduler_hour !== undefined || scheduler_minute !== undefined || scheduler_am_pm !== undefined) {
            try {
                await reloadScheduler();
                console.log('✅ Scheduler reloaded with new settings');
            } catch (schedulerError) {
                console.error('Error reloading scheduler:', schedulerError);
                // Don't fail the request if scheduler reload fails
            }
        }
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating reminder settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   PATCH /api/settings/:id
 * @desc    Update reminder settings
 * @access  Private
 */
router.patch('/:id', authenticateToken, async (req, res) => {
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
        let schedulerUpdated = false;
        
        Object.keys(updates).forEach(key => {
            if (validFields.includes(key)) {
                // For date fields, use the PostgreSQL DATE type casting to prevent timezone issues
                if (key.includes('date')) {
                    if (updates[key] === '') {
                        updateFields.push(`${key} = NULL`);
                    } else {
                        updateFields.push(`${key} = $${index}::DATE`);
                        values.push(updates[key]);
                        console.log(`Adding update for field ${key} = ${updates[key]} (as DATE)`);
                        index++;
                    }
                } else {
                    updateFields.push(`${key} = $${index}`);
                    // Handle empty dates by converting them to null
                    const value = key.includes('date') && updates[key] === '' ? null : updates[key];
                    values.push(value);
                    console.log(`Adding update for field ${key} = ${value}`);
                    index++;
                }
                
                // Check if any scheduler-related fields are being updated
                if (key === 'scheduler_hour' || key === 'scheduler_minute' || key === 'scheduler_am_pm') {
                    schedulerUpdated = true;
                }
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }
        
        values.push(id); // Add id as the last parameter
        
        const query = `UPDATE "user".reminder_settings 
                       SET ${updateFields.join(', ')} 
                       WHERE id = $${index} 
                       RETURNING *`;
        
        console.log('Executing query:', query);
        console.log('With values:', values);
        
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reminder settings not found' });
        }
        
        console.log('Update successful. Updated record:', JSON.stringify(result.rows[0], null, 2));
        
        // If scheduler settings were updated, reload the scheduler
        if (schedulerUpdated) {
            try {
                console.log('Scheduler settings updated. Reloading scheduler...');
                const schedulerResult = await reloadScheduler();
                console.log(`Scheduler reloaded. New schedule: ${schedulerResult.cronSchedule}`);
            } catch (schedulerError) {
                console.error('Error reloading scheduler:', schedulerError);
                // Don't fail the request if scheduler reload fails
            }
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating reminder settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   GET /api/settings/scheduler/reload
 * @desc    Manually reload the scheduler with current settings
 * @access  Private
 */
router.get('/scheduler/reload', authenticateToken, async (req, res) => {
    try {
        const result = await reloadScheduler();
        res.json({ 
            success: true, 
            message: 'Scheduler reloaded successfully', 
            schedule: result.cronSchedule 
        });
    } catch (error) {
        console.error('Error reloading scheduler:', error);
        res.status(500).json({ error: 'Failed to reload scheduler' });
    }
});

module.exports = router; 