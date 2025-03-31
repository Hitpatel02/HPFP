const db = require('../config/db');
const { sendClientReminder } = require('../services/whatsappService');

/**
 * @desc    Get all clients 
 */
exports.getAllClients = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM "user".clients
            ORDER BY name ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get client by ID
 */
exports.getClientById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT * FROM "user".clients
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching client by ID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Create a new client
 */
exports.createClient = async (req, res) => {
    try {
        const { 
            name, 
            phone_number, 
            email_id_1,
            email_id_2,
            email_id_3, 
            gst_1_enabled, 
            tds_document_enabled, 
            bank_statement_enabled, 
            gst_filing_type, 
            whatsapp_group_id,
            gst_number
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Client name is required' });
        }

        // Insert the new client
        const result = await db.query(`
            INSERT INTO "user".clients 
                (name, phone_number, email_id_1, email_id_2, email_id_3, gst_1_enabled, 
                tds_document_enabled, bank_statement_enabled, gst_filing_type, 
                whatsapp_group_id, gst_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            name, 
            phone_number || null, 
            email_id_1 || null,
            email_id_2 || null,
            email_id_3 || null,
            gst_1_enabled !== undefined ? gst_1_enabled : true, 
            tds_document_enabled !== undefined ? tds_document_enabled : false, 
            bank_statement_enabled !== undefined ? bank_statement_enabled : true, 
            gst_filing_type || 'Monthly',
            whatsapp_group_id || null,
            gst_number || null
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update client details
 */
exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Define valid fields for update
        const validFields = [
            'name', 
            'phone_number', 
            'email_id_1',
            'email_id_2',
            'email_id_3', 
            'gst_1_enabled', 
            'tds_document_enabled', 
            'bank_statement_enabled', 
            'gst_filing_type',
            'whatsapp_group_id',
            'gst_number'
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
        
        // Update the client
        const query = `
            UPDATE "user".clients 
            SET ${updateFields.join(', ')} 
            WHERE id = $${index} 
            RETURNING *
        `;
        
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Delete a client
 */
exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        
        // First, check if the client exists
        const clientExists = await db.query(`
            SELECT id FROM "user".clients WHERE id = $1
        `, [id]);
        
        if (clientExists.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Begin transaction to safely delete related records
        await db.query('BEGIN');
        
        try {
            // Delete client documents
            await db.query(`DELETE FROM "user".client_documents WHERE client_id = $1`, [id]);
            
            // Delete client
            await db.query(`DELETE FROM "user".clients WHERE id = $1`, [id]);
            
            // Commit transaction
            await db.query('COMMIT');
            
            res.json({ message: 'Client deleted successfully' });
        } catch (error) {
            // Rollback on error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Send WhatsApp reminder to a client
 */
exports.sendClientWhatsAppReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reminderType } = req.body;
        
        if (!reminderType || !['gst', 'tds', 'bank'].includes(reminderType)) {
            return res.status(400).json({ error: 'Valid reminder type is required (gst, tds, or bank)' });
        }
        
        // Get client information
        const clientResult = await db.query(`
            SELECT * FROM "user".clients WHERE id = $1
        `, [id]);
        
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        const client = clientResult.rows[0];
        
        // Ensure client has the required field
        let hasFeature = false;
        if (reminderType === 'gst') {
            hasFeature = client.gst_1_enabled;
        } else if (reminderType === 'tds') {
            hasFeature = client.tds_document_enabled;
        } else if (reminderType === 'bank') {
            hasFeature = client.bank_statement_enabled;
        }
        
        if (!hasFeature) {
            return res.status(400).json({ 
                error: `Client does not have ${reminderType.toUpperCase()} service enabled` 
            });
        }
        
        // Get current reminder settings
        const settingsResult = await db.query(`
            SELECT * FROM "user".reminder_settings ORDER BY id DESC LIMIT 1
        `);
        
        if (settingsResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reminder settings not found' });
        }
        
        const settings = settingsResult.rows[0];
        
        // Send manual reminder
        const result = await sendClientReminder(client, reminderType, settings, true);
        
        if (result.success) {
            res.json({ message: `${reminderType.toUpperCase()} reminder sent successfully` });
        } else {
            throw new Error(result.error || 'Failed to send reminder');
        }
    } catch (error) {
        console.error(`Error sending ${req.body?.reminderType || 'unknown'} reminder:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get reporting status for a client
 */
exports.getClientStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if client exists
        const clientCheck = await db.query(
            `SELECT id, gst_1_enabled, tds_document_enabled, bank_statement_enabled 
             FROM "user".clients WHERE id = $1`,
            [id]
        );
        
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Format response into a more convenient object
        const client = clientCheck.rows[0];
        const statusObject = {
            gst: {
                enabled: client.gst_1_enabled,
                status: client.gst_1_enabled ? 'active' : 'inactive'
            },
            tds: {
                enabled: client.tds_document_enabled,
                status: client.tds_document_enabled ? 'active' : 'inactive'
            },
            bank: {
                enabled: client.bank_statement_enabled,
                status: client.bank_statement_enabled ? 'active' : 'inactive'
            }
        };
        
        res.json(statusObject);
    } catch (error) {
        console.error('Error fetching client status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update reporting status for a client
 */
exports.updateClientStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { statusType, enabled, notes } = req.body;
        
        if (!statusType || !['gst', 'tds', 'bank'].includes(statusType)) {
            return res.status(400).json({ error: 'Valid status type is required (gst, tds, or bank)' });
        }
        
        if (enabled === undefined) {
            return res.status(400).json({ error: 'Enabled status is required' });
        }
        
        // Determine which field to update based on statusType
        let fieldToUpdate;
        if (statusType === 'gst') {
            fieldToUpdate = 'gst_1_enabled';
        } else if (statusType === 'tds') {
            fieldToUpdate = 'tds_document_enabled';
        } else { // bank
            fieldToUpdate = 'bank_statement_enabled';
        }
        
        // Update client status directly
        const updateResult = await db.query(
            `UPDATE "user".clients 
             SET ${fieldToUpdate} = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
             [enabled, id]
        );
        
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json({ 
            message: `${statusType.toUpperCase()} status updated successfully`,
            type: statusType,
            enabled: enabled
        });
    } catch (error) {
        console.error('Error updating client status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get all documents for a client
 */
exports.getClientDocuments = async (req, res) => {
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
}; 