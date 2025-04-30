const cron = require('node-cron');
const { sendWhatsAppReminders, initWhatsAppForReminders } = require('./whatsappService');
const { sendEmailReminders } = require('./emailService');
const { generateMonthlyReport } = require('./reportService');
const { DateTime } = require('luxon');
const { initializeWhatsApp } = require('../config/whatsapp');
const { logger } = require('../utils/logger');
const settingsQueries = require('../queries/settingsQueries');
// Store scheduled tasks so they can be cancelled and restarted
let reminderTask = null;
let reportTask = null;

/**
 * Check if today is a reminder day
 */
const isTodayReminderDay = async () => {
  try {
    // Get current reminder settings
    const settings = await settingsQueries.getLatestReminderSettings();
    console.log(settings)
    if (!settings) {
      console.log('⚠️ No reminder settings found.');
      return false;
    }

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
        const settings = await settingsQueries.getLatestReminderSettings();
        
        if (!settings || !settings.enable_whatsapp_reminders) {
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
    return await settingsQueries.getLatestReminderSettings();
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
            const settings = await settingsQueries.getLatestReminderSettings();

            if (settings && settings.enable_email_reminders) {
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