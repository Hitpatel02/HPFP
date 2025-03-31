const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const {
    createDocument,
    getDocumentsByMonth,
    getDocumentById,
    updateDocument,
    deleteDocument,
    createDocumentsForAll,
    createDocumentForClient,
    cleanupDuplicates
} = require('../controllers/documentController');

/**
 * @route   POST /api/documents
 * @desc    Create a new document record for a client
 * @access  Private
 */
router.post('/', authenticateToken, createDocument);

/**
 * @route   GET /api/documents/month/:month
 * @desc    Get all document records for a specific month
 * @access  Private
 */
router.get('/month/:month', authenticateToken, getDocumentsByMonth);

/**
 * @route   GET /api/documents/:id
 * @desc    Get a document record by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, getDocumentById);

/**
 * @route   PATCH /api/documents/:id
 * @desc    Update a document record
 * @access  Private
 */
router.patch('/:id', authenticateToken, updateDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document record
 * @access  Private
 */
router.delete('/:id', authenticateToken, deleteDocument);

/**
 * @route   POST /api/documents/create-for-all
 * @desc    Create document records for all clients for the current month
 * @access  Private
 */
router.post('/create-for-all', authenticateToken, createDocumentsForAll);

/**
 * @route   POST /api/documents/create-for-client/:clientId
 * @desc    Create document record for a specific client for the current month
 * @access  Private
 */
router.post('/create-for-client/:clientId', authenticateToken, createDocumentForClient);

/**
 * @route   POST /api/documents/cleanup-duplicates
 * @desc    Clean up duplicate document records for the current month or specified month
 * @access  Private
 */
router.post('/cleanup-duplicates', authenticateToken, cleanupDuplicates);

module.exports = router; 