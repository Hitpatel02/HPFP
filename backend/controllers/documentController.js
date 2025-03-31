const db = require('../config/db');
const documentService = require('../services/documentService');

/**
 * @desc    Create a new document record for a client
 */
exports.createDocument = async (req, res) => {
    try {
        const { 
            client_id, 
            document_month, 
            gst_1_received, 
            gst_1_received_date,
            bank_statement_received,
            bank_statement_received_date,
            tds_received,
            tds_received_date,
            notes
        } = req.body;
        
        if (!client_id || !document_month) {
            return res.status(400).json({ error: 'Client ID and document month are required' });
        }
        
        // Check if client exists
        const clientCheck = await db.query(
            `SELECT id, gst_1_enabled, bank_statement_enabled, tds_document_enabled 
             FROM "user".clients WHERE id = $1`,
            [client_id]
        );
        
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Check if document record already exists for this client and month
        const existingDoc = await db.query(
            `SELECT id FROM "user".client_documents 
             WHERE client_id = $1 AND document_month = $2`,
            [client_id, document_month]
        );
        
        if (existingDoc.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Document record already exists for this client and month',
                document_id: existingDoc.rows[0].id
            });
        }
        
        const client = clientCheck.rows[0];
        
        const result = await db.query(
            `INSERT INTO "user".client_documents 
                (client_id, document_month, 
                 gst_1_received, gst_1_received_date,
                 bank_statement_received, bank_statement_received_date, 
                 tds_received, tds_received_date, 
                 notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [
                client_id, 
                document_month, 
                client.gst_1_enabled ? (gst_1_received || false) : false, 
                client.gst_1_enabled ? (gst_1_received_date || null) : null,
                client.bank_statement_enabled ? (bank_statement_received || false) : false,
                client.bank_statement_enabled ? (bank_statement_received_date || null) : null,
                client.tds_document_enabled ? (tds_received || false) : false,
                client.tds_document_enabled ? (tds_received_date || null) : null,
                notes
            ]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating document record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get all document records for a specific month
 */
exports.getDocumentsByMonth = async (req, res) => {
    try {
        const { month } = req.params;
        
        const result = await db.query(
            `SELECT cd.*, c.name, c.email_id_1, c.email_id_2, c.email_id_3, c.gst_filing_type,
                    c.gst_1_enabled, c.bank_statement_enabled, c.tds_document_enabled
             FROM "user".client_documents cd
             JOIN "user".clients c ON cd.client_id = c.id
             WHERE cd.document_month = $1
             ORDER BY c.name`,
            [month]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching document records for month:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Get a document record by ID
 */
exports.getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if id is a number
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'Invalid document ID' });
        }
        
        const result = await db.query(
            `SELECT * FROM "user".client_documents WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching document record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Update a document record
 */
exports.updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Define valid fields that can be updated
        const validFields = [
            'gst_1_received', 
            'gst_1_received_date',
            'bank_statement_received',
            'bank_statement_received_date',
            'tds_received',
            'tds_received_date',
            'gst_1_reminder_1_sent',
            'gst_1_reminder_1_sent_date',
            'gst_1_reminder_2_sent',
            'gst_1_reminder_2_sent_date',
            'tds_reminder_1_sent',
            'tds_reminder_1_sent_date',
            'tds_reminder_2_sent',
            'tds_reminder_2_sent_date',
            'bank_reminder_1_sent',
            'bank_reminder_1_sent_date',
            'bank_reminder_2_sent',
            'bank_reminder_2_sent_date',
            'notes'
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
        
        const query = `UPDATE "user".client_documents 
                       SET ${updateFields.join(', ')} 
                       WHERE id = $${index} 
                       RETURNING *`;
        
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating document record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Delete a document record
 */
exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            `DELETE FROM "user".client_documents WHERE id = $1 RETURNING id`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document record not found' });
        }
        
        res.json({ message: 'Document record deleted successfully' });
    } catch (error) {
        console.error('Error deleting document record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Create document records for all clients for the current month
 */
exports.createDocumentsForAll = async (req, res) => {
    try {
        // Get current month
        const currentDate = new Date();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const documentMonth = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

        // Get all active clients
        const clients = await db.query(
            `SELECT id, name FROM "user".clients ORDER BY name`
        );
        
        const totalClients = clients.rows.length;
        
        if (totalClients === 0) {
            return res.status(200).json({
                message: "No clients found to create documents for",
                count: 0,
                existingCount: 0,
                totalClients: 0,
                currentMonth: documentMonth
            });
        }

        // Check how many clients already have documents for this month
        const existingDocs = await db.query(
            `SELECT client_id FROM "user".client_documents 
             WHERE document_month = $1`,
            [documentMonth]
        );

        const existingClientIds = new Set(existingDocs.rows.map(row => row.client_id));
        const existingCount = existingClientIds.size;
        
        // Create documents only for clients who don't have them
        const results = [];
        for (const client of clients.rows) {
            if (!existingClientIds.has(client.id)) {
                try {
                    const document = await documentService.createDocumentForClient(client.id, documentMonth);
                    results.push(document);
                } catch (error) {
                    console.error(`Error creating document for client ${client.name} (ID: ${client.id}):`, error);
                    // Continue with other clients even if one fails
                    continue;
                }
            }
        }

        res.status(201).json({
            message: `Created ${results.length} new document records for the current month (${documentMonth})`,
            count: results.length,
            existingCount: existingCount,
            totalClients: totalClients,
            currentMonth: documentMonth
        });
    } catch (error) {
        console.error('Error creating documents for all clients:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Create document record for a specific client for the current month
 */
exports.createDocumentForClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        
        // Get current month
        const currentDate = new Date();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const documentMonth = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        
        // Check if client exists
        const clientCheck = await db.query(
            `SELECT id, name FROM "user".clients WHERE id = $1`,
            [clientId]
        );
        
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        const client = clientCheck.rows[0];
        
        // Check if document already exists
        const existingDoc = await db.query(
            `SELECT id FROM "user".client_documents 
             WHERE client_id = $1 AND document_month = $2`,
            [clientId, documentMonth]
        );
        
        let documentId;
        let isNewDocument = false;
        
        if (existingDoc.rows.length > 0) {
            // Document already exists
            documentId = existingDoc.rows[0].id;
            isNewDocument = false;
        } else {
            // Create new document
            const result = await documentService.createDocumentForClient(clientId, documentMonth);
            documentId = result.id;
            isNewDocument = true;
        }
        
        // Get the complete document record
        const documentRecord = await db.query(
            `SELECT * FROM "user".client_documents WHERE id = $1`,
            [documentId]
        );
        
        res.status(isNewDocument ? 201 : 200).json({
            message: isNewDocument 
                ? `Created new document record for client ${client.name} for ${documentMonth}` 
                : `Document for client ${client.name} for ${documentMonth} already exists`,
            isNewDocument: isNewDocument,
            currentMonth: documentMonth,
            document: documentRecord.rows[0]
        });
    } catch (error) {
        console.error(`Error creating document for client ${req.params.clientId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * @desc    Clean up duplicate document records for the current month or specified month
 */
exports.cleanupDuplicates = async (req, res) => {
    try {
        const { month } = req.body;
        
        // Use the cleanup function from documentService
        const result = await documentService.cleanupDuplicateDocuments(month || null);
        
        res.status(200).json({
            message: `Found ${result.duplicatesFound} clients with duplicate documents. Removed ${result.recordsRemoved} duplicate records.`,
            ...result
        });
    } catch (error) {
        console.error('Error cleaning up duplicate documents:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 