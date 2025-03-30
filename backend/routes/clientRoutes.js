const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const documentService = require('../services/documentService');

/**
 * @route   GET /api/clients
 * @desc    Get all clients
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                id, 
                name, 
                email_id_1, 
                email_id_2, 
                email_id_3, 
                gst_filing_type,
                whatsapp_group_id,
                gst_1_enabled,
                bank_statement_enabled,
                tds_document_enabled,
                gst_number,
                phone_number,
                created_at,
                updated_at
            FROM "user".clients
            ORDER BY name`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   GET /api/clients/:id
 * @desc    Get a single client by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT 
                id, 
                name, 
                email_id_1, 
                email_id_2, 
                email_id_3, 
                gst_filing_type,
                whatsapp_group_id,
                gst_1_enabled,
                bank_statement_enabled,
                tds_document_enabled,
                gst_number,
                phone_number,
                created_at,
                updated_at
            FROM "user".clients
            WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   POST /api/clients
 * @desc    Create a new client
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            name, 
            email_id_1, 
            email_id_2, 
            email_id_3, 
            gst_filing_type, 
            whatsapp_group_id,
            gst_1_enabled,
            bank_statement_enabled,
            tds_document_enabled,
            gst_number,
            phone_number
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Client name is required' });
        }
        
        if (!email_id_1) {
            return res.status(400).json({ error: 'Primary email is required' });
        }
        
        if (!gst_filing_type) {
            return res.status(400).json({ error: 'GST filing type is required' });
        }
        
        const result = await db.query(
            `INSERT INTO "user".clients 
                (
                    name, 
                    email_id_1, 
                    email_id_2, 
                    email_id_3, 
                    gst_filing_type, 
                    whatsapp_group_id,
                    gst_1_enabled,
                    bank_statement_enabled,
                    tds_document_enabled,
                    gst_number,
                    phone_number
                ) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING *`,
            [
                name, 
                email_id_1, 
                email_id_2, 
                email_id_3, 
                gst_filing_type, 
                whatsapp_group_id,
                gst_1_enabled !== undefined ? gst_1_enabled : true,
                bank_statement_enabled !== undefined ? bank_statement_enabled : true,
                tds_document_enabled !== undefined ? tds_document_enabled : false,
                gst_number,
                phone_number
            ]
        );
        
        const newClient = result.rows[0];
        
        // Create document record for the current month
        try {
            await documentService.createDocumentForClient(newClient.id);
        } catch (docError) {
            console.error('Error creating document for new client:', docError);
            // Continue even if document creation fails, as client is already created
        }
        
        res.status(201).json(newClient);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   PATCH /api/clients/:id
 * @desc    Update a client
 * @access  Private
 */
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Validate required fields if they are being updated
        if (updates.name === '') {
            return res.status(400).json({ error: 'Client name is required' });
        }
        
        if (updates.email_id_1 === '') {
            return res.status(400).json({ error: 'Primary email is required' });
        }
        
        if (updates.gst_filing_type === '') {
            return res.status(400).json({ error: 'GST filing type is required' });
        }
        
        // Define valid fields that can be updated
        const validFields = [
            'name', 
            'email_id_1', 
            'email_id_2', 
            'email_id_3', 
            'gst_filing_type', 
            'whatsapp_group_id',
            'gst_1_enabled',
            'bank_statement_enabled',
            'tds_document_enabled',
            'gst_number',
            'phone_number'
        ];
        const updateFields = [];
        const values = [];
        
        let index = 1;
        Object.keys(updates).forEach(key => {
            if (validFields.includes(key)) {
                updateFields.push(`${key} = $${index}`);
                values.push(updates[key]);
                index++;
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }
        
        values.push(id); // Add id as the last parameter
        
        const query = `UPDATE "user".clients SET ${updateFields.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete a client
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            `DELETE FROM "user".clients WHERE id = $1 RETURNING id`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @route   GET /api/clients/:id/documents
 * @desc    Get all documents for a client
 * @access  Private
 */
router.get('/:id/documents', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // First check if client exists
        const clientCheck = await db.query(
            `SELECT id FROM "user".clients WHERE id = $1`,
            [id]
        );
        
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        const result = await db.query(
            `SELECT 
                id,
                client_id,
                document_month,
                gst_1_received,
                gst_1_received_date,
                bank_statement_received,
                bank_statement_received_date,
                tds_received,
                tds_received_date,
                gst_1_reminder_1_sent,
                gst_1_reminder_1_sent_date,
                gst_1_reminder_2_sent,
                gst_1_reminder_2_sent_date,
                tds_reminder_1_sent,
                tds_reminder_1_sent_date,
                tds_reminder_2_sent,
                tds_reminder_2_sent_date,
                bank_reminder_1_sent,
                bank_reminder_1_sent_date,
                bank_reminder_2_sent,
                bank_reminder_2_sent_date,
                notes,
                created_at,
                updated_at
            FROM "user".client_documents
            WHERE client_id = $1
            ORDER BY document_month DESC`,
            [id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching client documents:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router; 