const { 
    client, 
    isWhatsAppReady, 
    resetClientState, 
    initializeWhatsApp, 
    closeWhatsAppClient,
    restartWhatsAppClient,
    getConnectionInfo 
} = require('../config/whatsapp');
const { logger } = require('../utils/logger');

// Track if the client is in group ID retrieval mode
let groupIdRetrievalMode = false;
let groupIdCallback = null;
let connectionRetryTimer = null;
let maxRetryAttemptsReached = false;
let lastQrCodeTime = null;

/**
 * Get WhatsApp group ID from a message
 * @param {string} message - The message containing the group ID
 * @returns {string|null} - The group ID if found, null otherwise
 */
const getGroupIdFromMessage = (message) => {
    if (message === "!groupid") {
        return message.from;
    }
    return null;
};

/**
 * Validate WhatsApp group ID format
 * @param {string} groupId - The group ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateGroupId = (groupId) => {
    if (!groupId) return false;
    return groupId.includes('@g.us');
};

/**
 * Start WhatsApp client in group ID retrieval mode
 * @returns {Promise<boolean>} - Whether the client started successfully
 */
const startGroupIdRetrieval = async () => {
    try {
        logger.info('Starting WhatsApp client in group ID retrieval mode');
        
        // Check if we were already in this mode
        if (groupIdRetrievalMode && isWhatsAppReady()) {
            logger.info('WhatsApp client already running in group ID retrieval mode');
            
            // Just in case, ensure message handler is set up
            setupGroupIdMessageHandler();
            
            return true;
        }
        
        // Check if there was a previous connection attempt that failed
        if (maxRetryAttemptsReached) {
            // Force restart the client to give it a fresh start
            logger.info('Previous connection attempts failed, forcing restart of WhatsApp client');
            await restartWhatsAppClient();
            maxRetryAttemptsReached = false;
        }
        
        // Set mode flag before initialization
        groupIdRetrievalMode = true;
        
        // Initialize the WhatsApp client
        const initialized = await initializeWhatsApp();
        
        if (!initialized) {
            logger.error('Failed to start WhatsApp initialization for group ID retrieval');
            return false;
        }
        
        // Wait up to 30 seconds for client to be ready
        let attempts = 0;
        const maxAttempts = 15;
        const checkInterval = 2000; // 2 seconds
        
        while (attempts < maxAttempts && !isWhatsAppReady()) {
            logger.info(`Waiting for WhatsApp client to be ready (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            attempts++;
            
            // If QR code hasn't been shown for more than 30 seconds, we might be stuck
            const now = Date.now();
            if (lastQrCodeTime && (now - lastQrCodeTime) > 30000) {
                logger.warn('QR code timeout detected. Attempting to restart client');
                
                // Clear the timer value to avoid multiple restarts
                lastQrCodeTime = null;
                
                // Try to restart the client
                restartWhatsAppClient().catch(err => {
                    logger.error(`Error during client restart: ${err.message}`);
                });
                
                // Reset our counter to give more time
                attempts = 0;
            }
        }
        
        if (!isWhatsAppReady()) {
            logger.error('WhatsApp client initialization timed out');
            
            // Set a flag to indicate we've hit max attempts
            maxRetryAttemptsReached = true;
            
            // Schedule a retry after a delay if needed
            if (!connectionRetryTimer) {
                connectionRetryTimer = setTimeout(async () => {
                    logger.info('Attempting automatic WhatsApp reconnection after timeout');
                    connectionRetryTimer = null;
                    
                    // Don't reset the mode flag
                    await startGroupIdRetrieval();
                }, 60000); // Try again after 1 minute
            }
            
            return false;
        }
        
        // Setup message handler for group ID retrieval
        setupGroupIdMessageHandler();
        
        logger.info('WhatsApp client started in group ID retrieval mode');
        return true;
    } catch (error) {
        logger.error('Error starting WhatsApp client in group ID retrieval mode:', error);
        groupIdRetrievalMode = false;
        return false;
    }
};

/**
 * Stop WhatsApp client group ID retrieval mode
 * @returns {Promise<boolean>} - Whether the client stopped successfully
 */
const stopGroupIdRetrieval = async () => {
    try {
        logger.info('Stopping WhatsApp client group ID retrieval mode');
        
        // Clear any pending retry timers
        if (connectionRetryTimer) {
            clearTimeout(connectionRetryTimer);
            connectionRetryTimer = null;
        }
        
        groupIdRetrievalMode = false;
        groupIdCallback = null;
        maxRetryAttemptsReached = false;
        
        // If no other processes need the client, close it
        if (!isWhatsAppNeeded()) {
            await closeWhatsAppClient();
            logger.info('WhatsApp client closed after group ID retrieval');
        }
        
        return true;
    } catch (error) {
        logger.error('Error stopping WhatsApp client group ID retrieval:', error);
        return false;
    }
};

/**
 * Check if WhatsApp client is needed for any process
 * @returns {boolean} - Whether the client is needed
 */
const isWhatsAppNeeded = () => {
    // Add other conditions here if needed (e.g., reminder process running)
    return groupIdRetrievalMode;
};

/**
 * Setup message handler for group ID retrieval
 */
const setupGroupIdMessageHandler = () => {
    if (!isWhatsAppReady() || !client) return;
    
    // Remove existing listeners to avoid duplicates
    client.removeAllListeners('message');
    
    // Add listeners for tracking QR code display
    client.on('qr', () => {
        lastQrCodeTime = Date.now();
    });
    
    // Add new listener for group ID messages
    client.on('message', async (message) => {
        if (message.body === '!groupid') {
            const groupId = message.from;
            
            if (validateGroupId(groupId)) {
                logger.info(`Group ID retrieved: ${groupId}`);
                
                // Send confirmation message to the group
                await client.sendMessage(
                    groupId, 
                    `✅ Group ID captured: ${groupId}\n\nYou can now use this ID in the HPRT system.\nThis is a test message.\nPLEASE DO NOT REPLY TO THIS MESSAGE.\nPLEASE IGNORE. THANKS 🙏\n\nઆ એક પરીક્ષણ સંદેશ છે.\nકૃપા કરીને આ સંદેશનો જવાબ ન આપો.\n\nઆભાર 🙏
                    `
                );
                
                // Notify via callback if registered
                if (groupIdCallback && typeof groupIdCallback === 'function') {
                    groupIdCallback(groupId);
                }
            }
        }
    });
};

/**
 * Register a callback for when a group ID is retrieved
 * @param {Function} callback - Function to call with the group ID
 */
const onGroupIdRetrieved = (callback) => {
    groupIdCallback = callback;
};

/**
 * Send a test message to a WhatsApp group
 * @param {string} groupId - The group ID to send the message to
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
const sendTestMessage = async (groupId) => {
    try {
        if (!validateGroupId(groupId)) {
            throw new Error('Invalid group ID format');
        }

        if (!isWhatsAppReady()) {
            // Try to initialize WhatsApp if not ready
            logger.info('WhatsApp not ready, attempting to initialize for test message');
            await initializeWhatsApp();
            
            // Wait for it to become ready with timeout
            let timeout = 30000; // 30 seconds
            const interval = 2000; // 2 seconds
            let totalWait = 0;
            
            while (!isWhatsAppReady() && totalWait < timeout) {
                logger.info(`Waiting for WhatsApp to be ready for test message (${totalWait/1000}s/${timeout/1000}s)`);
                await new Promise(resolve => setTimeout(resolve, interval));
                totalWait += interval;
            }
            
            if (!isWhatsAppReady()) {
                throw new Error('WhatsApp client is not ready after initialization attempt');
            }
        }

        const message = 'Test message from HPFP system';
        await client.sendMessage(groupId, message);
        return true;
    } catch (error) {
        logger.error('Error sending test message:', error);
        return false;
    }
};

/**
 * Get the current status of WhatsApp client
 * @returns {Object} - Status information
 */
const getWhatsAppStatus = () => {
    const connectionInfo = getConnectionInfo();
    
    return {
        isReady: isWhatsAppReady(),
        groupIdRetrievalMode,
        maxRetryAttemptsReached,
        connectionInfo,
        timestamp: new Date().toISOString()
    };
};

/**
 * Force reconnect WhatsApp client
 * @returns {Promise<boolean>} - Whether reconnection was successful
 */
const forceReconnect = async () => {
    try {
        logger.info('Forcing WhatsApp client reconnection');
        
        // Clear any retry timers
        if (connectionRetryTimer) {
            clearTimeout(connectionRetryTimer);
            connectionRetryTimer = null;
        }
        
        // Reset flags
        maxRetryAttemptsReached = false;
        
        // Restart the client
        const success = await restartWhatsAppClient();
        
        if (success && groupIdRetrievalMode) {
            // If we were in group ID mode, set up the handler again
            setupGroupIdMessageHandler();
        }
        
        return success;
    } catch (error) {
        logger.error('Error forcing WhatsApp reconnection:', error);
        return false;
    }
};

module.exports = {
    getGroupIdFromMessage,
    validateGroupId,
    sendTestMessage,
    startGroupIdRetrieval,
    stopGroupIdRetrieval,
    onGroupIdRetrieved,
    getWhatsAppStatus,
    forceReconnect
}; 