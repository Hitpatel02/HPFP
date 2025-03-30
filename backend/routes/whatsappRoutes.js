const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
    sendTestMessage, 
    startGroupIdRetrieval, 
    stopGroupIdRetrieval,
    getWhatsAppStatus,
    forceReconnect
} = require('../services/whatsappGroupService');

/**
 * @route   POST /api/whatsapp/test
 * @desc    Send a test message to a WhatsApp group
 * @access  Private
 */
router.post('/test', authenticateToken, async (req, res) => {
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
});

/**
 * @route   POST /api/whatsapp/group-id/start
 * @desc    Start WhatsApp client in group ID retrieval mode
 * @access  Private
 */
router.post('/group-id/start', authenticateToken, async (req, res) => {
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
});

/**
 * @route   POST /api/whatsapp/group-id/stop
 * @desc    Stop WhatsApp client group ID retrieval mode
 * @access  Private
 */
router.post('/group-id/stop', authenticateToken, async (req, res) => {
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
});

/**
 * @route   GET /api/whatsapp/status
 * @desc    Get WhatsApp client status
 * @access  Private
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const status = getWhatsAppStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   POST /api/whatsapp/reconnect
 * @desc    Force reconnect WhatsApp client when automatic connection fails
 * @access  Private
 */
router.post('/reconnect', authenticateToken, async (req, res) => {
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
});

module.exports = router; 