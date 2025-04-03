const { sendClientReminder } = require('../services/whatsappService');
const clientQueries = require('../queries/clientQueries');

/**
 * @desc    Get all clients 
 */
exports.getAllClients = async (req, res) => {
    try {
        const clients = await clientQueries.getAllClients();
        res.json(clients);
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
        
        const client = await clientQueries.getClientById(id);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
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

        // Create the client
        const client = await clientQueries.createClient({
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
        });

        res.status(201).json(client);
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
        
        try {
            const updatedClient = await clientQueries.updateClient(id, updates);
            
            if (!updatedClient) {
                return res.status(404).json({ error: 'Client not found' });
            }
            
            res.json(updatedClient);
        } catch (error) {
            if (error.message === 'No valid updates provided') {
                return res.status(400).json({ error: 'No valid updates provided' });
            }
            throw error;
        }
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
        const exists = await clientQueries.clientExists(id);
        
        if (!exists) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Delete the client and related records
        await clientQueries.deleteClient(id);
        
        res.json({ message: 'Client deleted successfully' });
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
        const clientResult = await clientQueries.getClientById(id);
        
        if (!clientResult) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        const client = clientResult;
        
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
        const settingsResult = await clientQueries.getReminderSettings();
        
        if (settingsResult.length === 0) {
            return res.status(404).json({ error: 'Reminder settings not found' });
        }
        
        const settings = settingsResult[0];
        
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
        const clientCheck = await clientQueries.getClientById(id);
        
        if (!clientCheck) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Format response into a more convenient object
        const statusObject = {
            gst: {
                enabled: clientCheck.gst_1_enabled,
                status: clientCheck.gst_1_enabled ? 'active' : 'inactive'
            },
            tds: {
                enabled: clientCheck.tds_document_enabled,
                status: clientCheck.tds_document_enabled ? 'active' : 'inactive'
            },
            bank: {
                enabled: clientCheck.bank_statement_enabled,
                status: clientCheck.bank_statement_enabled ? 'active' : 'inactive'
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
        const updateResult = await clientQueries.updateClientStatus(id, fieldToUpdate, enabled);
        
        if (!updateResult) {
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
        const clientCheck = await clientQueries.getClientById(id);
        
        if (!clientCheck) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        const result = await clientQueries.getClientDocuments(id);
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching client documents:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 