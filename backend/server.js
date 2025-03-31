require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const documentService = require('./services/documentService');

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

// Set up scheduled tasks
// Schedule task to run at midnight on the 1st day of each month
cron.schedule('0 0 1 * *', async () => {
  console.log('Running monthly task to create document records for all clients...');
  try {
    const results = await documentService.createDocumentsForAllClients();
    console.log(`Created ${results.length} document records for current month`);
  } catch (error) {
    console.error('Error in monthly document creation task:', error);
  }
});

// Start the server
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    
    try {
        // Initialize scheduled tasks (now async)
        await initializeScheduledTasks();
        console.log('✅ Scheduler service initialized');
    } catch (error) {
        console.error('❌ Error initializing scheduler:', error);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

module.exports = app;
