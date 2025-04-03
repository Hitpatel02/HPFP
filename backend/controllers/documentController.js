const documentService = require('../services/documentService');
const documentQueries = require('../queries/documentQueries');
const { getFormattedMonth } = require('../utils/dateUtils');

/**
 * @desc    Get all document records for a specific month
 */
exports.getDocumentsByMonth = async (req, res) => {
    try {
        const { month } = req.params;
        
        const documents = await documentQueries.getDocumentsByMonth(month);
        
        res.json(documents);
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
        
        const document = await documentQueries.getDocumentById(id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document record not found' });
        }
        
        res.json(document);
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
        
        try {
            const updatedDocument = await documentQueries.updateDocument(id, updates);
            
            if (!updatedDocument) {
                return res.status(404).json({ error: 'Document record not found' });
            }
            
            res.json(updatedDocument);
        } catch (error) {
            if (error.message === 'No valid updates provided') {
                return res.status(400).json({ error: 'No valid updates provided' });
            }
            throw error;
        }
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
        
        const deleted = await documentQueries.deleteDocument(id);
        
        if (!deleted) {
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
        // Get month from request body or use current month
        const { month } = req.body;
        const documentMonth = month || getFormattedMonth();

        // Get all clients count
        const totalClients = await documentQueries.getClientCount();
        
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
        const existingCount = await documentQueries.getExistingDocumentCount(documentMonth);
        
        // Use the service function to create documents for all clients
        const results = await documentService.createDocumentsForAllClients(documentMonth);
        
        // The number of new documents created is the length of results
        const newCount = results.length;

        res.status(201).json({
            message: `Created ${newCount} new document records for ${documentMonth}`,
            count: newCount,
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
        const { month } = req.body;
        
        // Get month from request body or use current month
        const documentMonth = month || getFormattedMonth();
        
        // Check if client exists
        const client = await documentQueries.getClientById(clientId);
        
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Check if document already exists
        const existingDoc = await documentQueries.getExistingDocument(clientId, documentMonth);
        
        let documentId;
        let isNewDocument = false;
        
        if (existingDoc) {
            // Document already exists
            documentId = existingDoc.id;
            isNewDocument = false;
        } else {
            // Create new document using the service
            const document = await documentService.createDocumentForClient(clientId, documentMonth);
            documentId = document.id;
            isNewDocument = true;
        }
        
        // Get the complete document record
        const documentRecord = await documentQueries.getDocumentById(documentId);
        
        res.status(isNewDocument ? 201 : 200).json({
            message: isNewDocument 
                ? `Created new document record for client ${client.name} for ${documentMonth}` 
                : `Document for client ${client.name} for ${documentMonth} already exists`,
            isNewDocument: isNewDocument,
            currentMonth: documentMonth,
            document: documentRecord
        });
    } catch (error) {
        console.error(`Error creating document for client ${req.params.clientId}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}; 