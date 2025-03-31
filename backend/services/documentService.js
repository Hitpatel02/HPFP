const db = require('../config/db');

/**
 * Create a document record for a client for the current month
 * @param {number} clientId - The client ID
 * @param {string} documentMonth - Optional month in format "Month YYYY" (e.g., "January 2023")
 * @returns {Promise<Object>} - The created document record
 */
async function createDocumentForClient(clientId, documentMonth = null) {
  try {
    // Check if client exists and get document type preferences
    const clientCheck = await db.query(
      `SELECT id, name, gst_1_enabled, bank_statement_enabled, tds_document_enabled 
       FROM "user".clients WHERE id = $1`,
      [clientId]
    );

    if (clientCheck.rows.length === 0) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    const client = clientCheck.rows[0];

    // Get current month if not provided
    if (!documentMonth) {
      const currentDate = new Date();
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      documentMonth = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    // Check if document record already exists for this client and month
    const existingDoc = await db.query(
      `SELECT id FROM "user".client_documents 
       WHERE client_id = $1 AND document_month = $2`,
      [clientId, documentMonth]
    );

    if (existingDoc.rows.length > 0) {
      console.log(`Document for client ${client.name} (ID: ${clientId}) and month ${documentMonth} already exists with ID ${existingDoc.rows[0].id}`);
      return existingDoc.rows[0];
    }

    // Create document record with all fields initialized to false/null except enabled document types
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
        clientId,
        documentMonth,
        false, // Always initialize to false (pending)
        null,
        false, // Always initialize to false (pending)
        null,
        false, // Always initialize to false (pending)
        null,
        ''
      ]
    );

    console.log(`Created document for client ${client.name} (ID: ${clientId}) for month ${documentMonth}`);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating document for client:', error);
    throw error;
  }
}

/**
 * Create document records for all clients for the current month
 * @returns {Promise<Array>} - Array of created document records
 */
async function createDocumentsForAllClients() {
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

    const results = [];
    for (const client of clients.rows) {
      try {
        const document = await createDocumentForClient(client.id, documentMonth);
        results.push(document);
      } catch (error) {
        console.error(`Error creating document for client ${client.name} (ID: ${client.id}):`, error);
        // Continue with other clients even if one fails
        continue;
      }
    }

    return results;
  } catch (error) {
    console.error('Error creating documents for all clients:', error);
    throw error;
  }
}

/**
 * Check for and remove duplicate document records for clients for a specific month
 * @param {string} documentMonth - Month in format "Month YYYY" (e.g., "January 2023")
 * @returns {Promise<Object>} - Object with counts of duplicates found and removed
 */
async function cleanupDuplicateDocuments(documentMonth = null) {
  try {
    // Get current month if not provided
    if (!documentMonth) {
      const currentDate = new Date();
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      documentMonth = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }

    // Find duplicate document records (more than one record for same client and month)
    const duplicatesQuery = await db.query(
      `SELECT client_id, COUNT(*) as count 
       FROM "user".client_documents 
       WHERE document_month = $1 
       GROUP BY client_id 
       HAVING COUNT(*) > 1`,
      [documentMonth]
    );

    const duplicates = duplicatesQuery.rows;
    let removedCount = 0;

    // Process each client with duplicates
    for (const dup of duplicates) {
      try {
        // Get all documents for this client and month
        const documents = await db.query(
          `SELECT id, created_at 
           FROM "user".client_documents 
           WHERE client_id = $1 AND document_month = $2
           ORDER BY created_at DESC`,
          [dup.client_id, documentMonth]
        );
        
        // Keep the newest one (first in the sorted list), delete the rest
        for (let i = 1; i < documents.rows.length; i++) {
          await db.query(
            `DELETE FROM "user".client_documents WHERE id = $1`,
            [documents.rows[i].id]
          );
          removedCount++;
        }
      } catch (error) {
        console.error(`Error cleaning up duplicates for client ${dup.client_id}:`, error);
        // Continue with other clients even if one fails
      }
    }

    return {
      duplicatesFound: duplicates.length,
      clientsWithDuplicates: duplicates.map(d => d.client_id),
      recordsRemoved: removedCount
    };
  } catch (error) {
    console.error('Error cleaning up duplicate documents:', error);
    throw error;
  }
}

module.exports = {
  createDocumentForClient,
  createDocumentsForAllClients,
  cleanupDuplicateDocuments
}; 