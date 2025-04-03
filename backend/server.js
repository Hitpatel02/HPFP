require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const documentService = require('./services/documentService');
const { getPreviousMonthFormatted } = require('./utils/dateUtils');

// Import routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const clientRoutes = require('./routes/clientRoutes');
const documentRoutes = require('./routes/documentRoutes');
const pendingDocumentRoutes = require('./routes/pendingDocumentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const logsRoutes = require('./routes/logsRoutes');

// Import services
// Don't initialize WhatsApp client on startup
// const { initializeWhatsApp } = require('./config/whatsapp');
const { initializeScheduledTasks } = require('./services/schedulerService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cors());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/pending-documents', pendingDocumentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/logs', logsRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Function to check if it's the 1st of the month and create documents
const createDocumentsIfFirstOfMonth = async () => {
  // Check if today is the 1st of the month
  const today = new Date();
  const isFirstOfMonth = today.getDate() === 1;
  
  if (isFirstOfMonth) {
    const previousMonth = getPreviousMonthFormatted();
    console.log(`Server started on 1st of month. Creating document records for all clients for ${previousMonth}...`);
    try {
      const results = await documentService.createDocumentsForAllClients(previousMonth);
      console.log(`Created ${results.length} document records for previous month (${previousMonth})`);
    } catch (error) {
      console.error('Error creating documents on server start:', error);
    }
  }
};

// Start the server
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    
    try {
        // Initialize scheduled tasks (now async)
        await initializeScheduledTasks();
        console.log('✅ Scheduler service initialized');
        
        // Check if it's the 1st of the month and create documents if needed
        await createDocumentsIfFirstOfMonth();
    } catch (error) {
        console.error('❌ Error in server startup tasks:', error);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

module.exports = app;
