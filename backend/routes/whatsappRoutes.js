const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    sendTest,
    startGroupIdRetrieval,
    stopGroupIdRetrieval,
    getStatus,
    forceReconnect
} = require('../controllers/whatsappController');

/**
 * @route   POST /api/whatsapp/test
 * @desc    Send a test message to a WhatsApp group
 * @access  Private
 */
router.post('/test', authenticateToken, sendTest);

/**
 * @route   POST /api/whatsapp/group-id/start
 * @desc    Start WhatsApp client in group ID retrieval mode
 * @access  Private
 */
router.post('/group-id/start', authenticateToken, startGroupIdRetrieval);

/**
 * @route   POST /api/whatsapp/group-id/stop
 * @desc    Stop WhatsApp client group ID retrieval mode
 * @access  Private
 */
router.post('/group-id/stop', authenticateToken, stopGroupIdRetrieval);

/**
 * @route   GET /api/whatsapp/status
 * @desc    Get WhatsApp client status
 * @access  Private
 */
router.get('/status', authenticateToken, getStatus);

/**
 * @route   POST /api/whatsapp/reconnect
 * @desc    Force reconnect WhatsApp client when automatic connection fails
 * @access  Private
 */
router.post('/reconnect', authenticateToken, forceReconnect);

module.exports = router; 