const cron = require('node-cron');
const { sendWhatsAppReminders, initWhatsAppForReminders } = require('./whatsappService');
const { sendEmailReminders } = require('./emailService');
const { generateMonthlyReport } = require('./reportService');
const { DateTime } = require('luxon');
const db = require('../config/db');
const { initializeWhatsApp } = require('../config/whatsapp');
const { logger } = require('../utils/logger');

// Store scheduled tasks so they can be cancelled and restarted
let reminderTask = null;
let reportTask = null;

/**
 * Check if today is a reminder day
 */
const isTodayReminderDay = async () => {
  try {
    // Get current reminder settings
    const settingsResult = await db.query(
      `SELECT * FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
    );

    if (settingsResult.rows.length === 0) {
      console.log('⚠️ No reminder settings found.');
      return false;
    }

    const settings = settingsResult.rows[0];
    const today = DateTime.now().toFormat('yyyy-MM-dd');
    
    // Check if today is a GST reminder date
    const isGstReminderDay = 
      today === DateTime.fromJSDate(new Date(settings.gst_reminder_1_date)).toFormat('yyyy-MM-dd') || 
      today === DateTime.fromJSDate(new Date(settings.gst_reminder_2_date)).toFormat('yyyy-MM-dd');

    // Check if today is a TDS reminder date
    const isTdsReminderDay = 
      today === DateTime.fromJSDate(new Date(settings.tds_reminder_1_date)).toFormat('yyyy-MM-dd') || 
      today === DateTime.fromJSDate(new Date(settings.tds_reminder_2_date)).toFormat('yyyy-MM-dd');
    
    // Return true if today matches any reminder date
    return isGstReminderDay || isTdsReminderDay;
  } catch (error) {
    console.error('❌ Error checking if today is a reminder day:', error);
    return false;
  }
};

/**
 * Get the scheduler time from database settings
 * @returns {Promise<{hour: number, minute: number}>}
 */
const getSchedulerTime = async () => {
  try {
    // Try to get the new scheduler settings first
    try {
      const settingsResult = await db.query(
        `SELECT scheduler_hour, scheduler_minute, scheduler_am_pm FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
      );

      if (settingsResult.rows.length > 0) {
        const settings = settingsResult.rows[0];
        
        // Convert to 24-hour format for cron job
        let hour = settings.scheduler_hour;
        if (settings.scheduler_am_pm === 'PM' && hour < 12) {
          hour += 12;
        } else if (settings.scheduler_am_pm === 'AM' && hour === 12) {
          hour = 0;
        }
        
        return { 
          hour, 
          minute: settings.scheduler_minute 
        };
      }
    } catch (error) {
      // If columns don't exist yet, just log and continue with default
      console.warn('Could not fetch scheduler time settings, using defaults. Error:', error.message);
    }
    
    // Fall back to getting basic settings if new columns aren't available
    const basicResult = await db.query(
      `SELECT * FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
    );
    
    if (basicResult.rows.length === 0) {
      console.log('⚠️ No reminder settings found. Using default time (9:00 AM).');
      return { hour: 9, minute: 0 };
    }
    
    // Default to 9:00 AM if we have some settings but not the scheduler columns
    return { hour: 9, minute: 0 };
    
  } catch (error) {
    console.error('❌ Error getting scheduler time:', error);
    return { hour: 9, minute: 0 }; // Default to 9:00 AM
  }
};

/**
 * Configure and return a cron job schedule based on the user-defined time
 */
const configureCronSchedule = async () => {
  const { hour, minute } = await getSchedulerTime();
  
  // Format for cron expression
  return `${minute} ${hour} * * *`;
};

/**
 * Stop any currently running scheduled tasks
 */
const stopScheduledTasks = () => {
  if (reminderTask) {
    reminderTask.stop();
    console.log('📅 Stopped existing reminder task');
  }
  
  if (reportTask) {
    reportTask.stop();
    console.log('📅 Stopped existing report task');
  }
};

/**
 * Wait for WhatsApp client to be ready with multiple retries
 * @param {number} maxRetries - Maximum number of retries to wait for WhatsApp client
 * @param {number} retryInterval - Time in ms between retries
 * @returns {Promise<boolean>} - True if client is ready, false otherwise
 */
const waitForWhatsAppReady = async (maxRetries = 10, retryInterval = 20000) => {
    const { client, isWhatsAppReady } = require('../config/whatsapp');
    let retries = 0;
    
    console.log(`⏳ Waiting for WhatsApp client to be ready (max ${maxRetries} attempts)...`);
    
    while (retries < maxRetries) {
        if (isWhatsAppReady()) {
            console.log('✅ WhatsApp client is ready!');
            return true;
        }
        
        console.log(`Waiting for WhatsApp client to initialize... (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        retries++;
    }
    
    console.error('❌ WhatsApp client failed to initialize after maximum retries.');
    return false;
};

/**
 * Gracefully close the WhatsApp client
 * @returns {Promise<boolean>} - True if client was closed successfully
 */
const closeWhatsAppClient = async () => {
    try {
        const { client } = require('../config/whatsapp');
        console.log('🔒 Attempting to gracefully close WhatsApp client...');
        
        // Only try to destroy if client exists and is initialized
        if (client && client.pupPage) {
            await client.destroy();
            console.log('✅ WhatsApp client closed successfully');
            return true;
        }
        console.log('ℹ️ No active WhatsApp client to close');
        return true;
    } catch (error) {
        console.error('❌ Error closing WhatsApp client:', error);
        return false;
    }
};

/**
 * Execute the WhatsApp reminder process
 */
const executeWhatsAppReminders = async () => {
    try {
        console.log('🚀 Starting WhatsApp reminder process...');
        
        // Check if today is a reminder day before initializing WhatsApp
        const isReminderDay = await isTodayReminderDay();
        if (!isReminderDay) {
            console.log('📅 Today is not a reminder day. Skipping WhatsApp reminders.');
            return false;
        }
        
        // Check if WhatsApp reminders are enabled in database settings
        const settingsResult = await db.query(
            `SELECT enable_whatsapp_reminders FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
        );
        
        if (settingsResult.rows.length === 0 || !settingsResult.rows[0].enable_whatsapp_reminders) {
            console.log('ℹ️ WhatsApp reminders are disabled in settings. Skipping WhatsApp reminders.');
            return false;
        }
        
        // Initialize WhatsApp client
        console.log('🔄 Initializing WhatsApp client...');
        initializeWhatsApp();
        
        // Wait for client to be ready
        const clientReady = await waitForWhatsAppReady(15, 20000); // 15 attempts, 20 seconds each
        if (!clientReady) {
            console.error('❌ WhatsApp client initialization failed. Skipping reminders.');
            await closeWhatsAppClient();
            return false;
        }
        
        // Send reminders
        console.log('📲 Sending WhatsApp reminders...');
        await sendWhatsAppReminders();
        
        // Close client after sending
        console.log('🏁 WhatsApp reminders sent. Closing client...');
        await closeWhatsAppClient();
        
        console.log('✅ WhatsApp reminder process completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Error in WhatsApp reminder process:', error);
        // Try to close client in case of error
        await closeWhatsAppClient();
        return false;
    }
};

/**
 * Run the daily reminder job
 */
const runReminderJob = async () => {
  console.log(`🚀 Running reminder job at: ${new Date().toLocaleString()}`);
  
  try {
    // Initialize WhatsApp for reminders if enabled
    await initWhatsAppForReminders();
    
    // Run email and WhatsApp reminders in parallel
    await Promise.all([
      (async () => {
        console.log('📧 Running email reminder job...');
        await sendEmailReminders();
      })(),
      (async () => {
        console.log('📱 Running WhatsApp reminder job...');
        await sendWhatsAppReminders();
      })()
    ]);
    
    console.log('✅ Reminder job completed.');
  } catch (error) {
    console.error('❌ Error in reminder job:', error);
  }
};

/**
 * Get the latest scheduler settings from the database
 * @returns {Promise<Object|null>} - The settings object or null if not found
 */
const getLatestSettings = async () => {
  try {
    const result = await db.query(
      `SELECT * FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    logger.error('Error getting latest scheduler settings:', error);
    return null;
  }
};

/**
 * Initialize scheduled tasks with current settings from database
 */
const initializeScheduledTasks = async () => {
    try {
        const settings = await getLatestSettings();
        
        if (!settings) {
            logger.warn('No scheduler settings found. Using defaults (9:00 AM)');
            // Default to 9:00 AM
            reminderTask = cron.schedule('0 9 * * *', async () => {
                await runReminderJob();
            });
            
            reportTask = cron.schedule('0 9 1 * *', async () => {
                logger.info('Running monthly report generation task');
                await generateMonthlyReport();
            });
            
            return { success: true, schedule: '0 9 * * *' };
        }
        
        // Convert settings to 24-hour time format for cron
        const hour24 = settings.scheduler_hour;
        const minute = settings.scheduler_minute;
        const amPm = settings.scheduler_am_pm;
        
        // Convert 12-hour time to 24-hour time
        const hour = amPm === 'PM' && hour24 < 12 
            ? hour24 + 12 
            : (amPm === 'AM' && hour24 === 12 ? 0 : hour24);
        
        // Cron format: minute hour * * * (runs daily at specified time)
        const cronSchedule = `${minute} ${hour} * * *`;
        console.log(`📅 Configuring scheduler to run at: ${cronSchedule} (server time)`);
        
        // Stop existing tasks if they exist
        if (reminderTask) {
            logger.info('📅 Stopped existing reminder task');
            reminderTask.stop();
        }
        
        if (reportTask) {
            logger.info('📅 Stopped existing report task');
            reportTask.stop();
        }
        
        // Schedule reminder task to run at specified time
        reminderTask = cron.schedule(cronSchedule, async () => {
            await runReminderJob();
        });
        
        // Schedule report task to run on the 1st of each month at the specified time
        const reportCronSchedule = `${minute} ${hour} 1 * *`;
        reportTask = cron.schedule(reportCronSchedule, async () => {
            logger.info('Running monthly report generation task');
            await generateMonthlyReport();
        });
        
        console.log('✅ All scheduled tasks initialized');
        return { success: true, cronSchedule };
    } catch (error) {
        logger.error('Error initializing scheduled tasks:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Reload the scheduler with updated settings
 * This should be called whenever settings are updated
 */
const reloadScheduler = async () => {
    console.log('🔄 Reloading scheduler with updated settings...');
    const result = await initializeScheduledTasks();
    console.log(`✅ Scheduler reloaded successfully. New schedule: ${result.cronSchedule}`);
    return result;
};

/**
 * Run a specific task immediately (for testing or manual triggering)
 */
const runTaskImmediately = async (taskName) => {
    switch (taskName) {
        case 'whatsapp':
            console.log('🚀 Running WhatsApp reminder task immediately');
            await executeWhatsAppReminders();
            break;
        case 'email':
            console.log('🚀 Running email reminder task immediately');
            // Check if email reminders are enabled in database settings
            const emailSettings = await db.query(
                `SELECT enable_email_reminders FROM "user".reminder_settings ORDER BY id DESC LIMIT 1`
            );

            if (emailSettings.rows.length > 0 && emailSettings.rows[0].enable_email_reminders) {
                console.log('📧 Running email reminder job immediately...');
                await sendEmailReminders();
            } else {
                console.log('ℹ️ Email reminders are disabled in settings. Skipping email reminders.');
            }
            break;
        case 'report':
            console.log('🚀 Running report generation task immediately');
            await generateMonthlyReport();
            break;
        default:
            throw new Error(`Unknown task: ${taskName}`);
    }
};

module.exports = { initializeScheduledTasks, runTaskImmediately, reloadScheduler }; 