const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const { 
    getReminderSettings, 
    createReminderSettings, 
    updateReminderSettings,
    updateNotificationSettings,
    reloadSchedulerHandler,
    getAvailableMonths,
    getSettingsForMonth,
    saveSettingsForMonth
} = require('../controllers/settingsController');

/**
 * @route   GET /api/settings/reminder
 * @desc    Get current reminder settings
 * @access  Private
 */
router.get('/reminder', authenticateToken, getReminderSettings);

/**
 * @route   GET /api/settings/reminder/months
 * @desc    Get all available months with reminder settings
 * @access  Private
 */
router.get('/reminder/months', authenticateToken, getAvailableMonths);

/**
 * @route   GET /api/settings/reminder/:year/:month
 * @desc    Get reminder settings for a specific month and year
 * @access  Private
 */
router.get('/reminder/:year/:month', authenticateToken, getSettingsForMonth);

/**
 * @route   POST /api/settings/reminder
 * @desc    Create new reminder settings
 * @access  Private
 */
router.post('/reminder', authenticateToken, createReminderSettings);

/**
 * @route   POST /api/settings/reminder/:year/:month
 * @desc    Save settings for a specific month and year
 * @access  Private
 */
router.post('/reminder/:year/:month', authenticateToken, saveSettingsForMonth);

/**
 * @route   PUT /api/settings/reminder/:id
 * @desc    Update reminder settings
 * @access  Private
 */
router.put('/reminder/:id', authenticateToken, updateReminderSettings);

/**
 * @route   PATCH /api/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 */
router.patch('/notifications', authenticateToken, updateNotificationSettings);

/**
 * @route   GET /api/settings/scheduler/reload
 * @desc    Manually reload the scheduler
 * @access  Private
 */
router.get('/scheduler/reload', authenticateToken, reloadSchedulerHandler);

// Apply authentication middleware to all routes
router.use(authenticateToken);

module.exports = router; 