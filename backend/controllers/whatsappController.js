const { 
    sendTestMessage, 
    startGroupIdRetrieval, 
    stopGroupIdRetrieval,
    getWhatsAppStatus,
    forceReconnect
} = require('../services/whatsappGroupService');

/**
 * @desc    Send a test message to a WhatsApp group
 */
exports.sendTest = async (req, res) => {
    try {
        const { groupId } = req.body;
        
        if (!groupId) {
            return res.status(400).json({ error: 'Group ID is required' });
        }
        
        const success = await sendTestMessage(groupId);
        
        if (success) {
            res.json({ message: 'Test message sent successfully' });
        } else {
            res.status(400).json({ error: 'Failed to send test message' });
        }
    } catch (error) {
        console.error('Error sending test message:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Start WhatsApp client in group ID retrieval mode
 */
exports.startGroupIdRetrieval = async (req, res) => {
    try {
        console.log('Starting WhatsApp group ID retrieval mode');
        const success = await startGroupIdRetrieval();
        
        if (success) {
            res.json({ 
                message: 'WhatsApp group ID retrieval mode started',
                instructions: 'Send "!groupid" in your WhatsApp group to retrieve the group ID'
            });
        } else {
            const status = getWhatsAppStatus();
            res.status(500).json({ 
                error: 'Failed to start WhatsApp group ID retrieval mode',
                status,
                recovery: 'If this problem persists, try using the force reconnect feature.'
            });
        }
    } catch (error) {
        console.error('Error starting WhatsApp group ID retrieval:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Stop WhatsApp client group ID retrieval mode
 */
exports.stopGroupIdRetrieval = async (req, res) => {
    try {
        console.log('Stopping WhatsApp group ID retrieval mode');
        const success = await stopGroupIdRetrieval();
        
        if (success) {
            res.json({ message: 'WhatsApp group ID retrieval mode stopped' });
        } else {
            res.status(500).json({ error: 'Failed to stop WhatsApp group ID retrieval mode' });
        }
    } catch (error) {
        console.error('Error stopping WhatsApp group ID retrieval:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get WhatsApp client status
 */
exports.getStatus = async (req, res) => {
    try {
        const status = getWhatsAppStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Force reconnect WhatsApp client when automatic connection fails
 */
exports.forceReconnect = async (req, res) => {
    try {
        console.log('Forcing WhatsApp client reconnection');
        const success = await forceReconnect();
        
        if (success) {
            res.json({ 
                message: 'WhatsApp reconnection initiated successfully',
                instructions: 'Check status endpoint for connection progress'
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to reconnect WhatsApp client',
                suggestion: 'Try restarting the server if problems persist'
            });
        }
    } catch (error) {
        console.error('Error reconnecting WhatsApp client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 