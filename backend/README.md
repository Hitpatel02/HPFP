# HPFP Backend

This is the backend server for the HPFP (HP Reminder Tool) application. It provides APIs for managing groups, GST document status, and automated reminders via WhatsApp and Email.

## Features

- **Authentication**: JWT-based authentication for secure API access
- **Group Management**: APIs to manage groups and their GST document status
- **WhatsApp Reminders**: Automated WhatsApp reminders for pending GST documents
- **Email Reminders**: Automated email reminders using Microsoft Graph API
- **Report Generation**: PDF report generation for GST document status
- **Scheduled Tasks**: Configurable scheduled tasks for automated reminders

## Tech Stack

- Node.js & Express.js
- PostgreSQL (via node-postgres)
- WhatsApp Web.js for WhatsApp integration
- Microsoft Graph API for Outlook email integration
- PDFMake for PDF generation
- node-cron for scheduling tasks

## Project Structure

```
backend/
├── config/             # Configuration files
│   ├── db.js           # Database configuration
│   ├── msGraph.js      # Microsoft Graph API configuration
│   └── whatsapp.js     # WhatsApp client configuration
├── middleware/         # Express middleware
│   └── auth.js         # JWT authentication middleware
├── routes/             # API routes
│   ├── authRoutes.js   # Authentication routes
│   ├── groupRoutes.js  # Group management routes
│   ├── reminderRoutes.js # Reminder management routes
│   └── reportRoutes.js # Report generation routes
├── services/           # Business logic services
│   ├── emailService.js # Email reminder service
│   ├── reportService.js # PDF report generation service
│   ├── schedulerService.js # Task scheduler service
│   └── whatsappService.js # WhatsApp reminder service
├── .env                # Environment variables
├── package.json        # Project dependencies
├── server.js           # Main application entry point
└── README.md           # This file
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   cd backend
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   # Database Configuration
   DATABASE_URL=postgres://username:password@localhost:5432/database
   PGUSER=username
   PGPASSWORD=password
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=database

   # JWT Authentication
   JWT_SECRET=your_jwt_secret

   # Microsoft Graph API (for Outlook Email)
   TENANT_ID=your_tenant_id
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   SENDER_EMAIL=your_sender_email

   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```
4. Start the server:
   ```
   npm start
   ```
   For development with auto-reload:
   ```
   npm run dev
   ```

## WhatsApp Setup

On first run, the WhatsApp service will generate a QR code in the terminal. Scan this with your WhatsApp mobile app to authenticate the session.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username and password

### Groups
- `GET /api/groups` - Get all groups
- `GET /api/groups/:id` - Get a specific group
- `PATCH /api/groups/:id` - Update a group's GST status (partial update)
- `POST /api/groups/reset` - Reset all groups' GST status

### Reminders
- `GET /api/reminders` - Get reminder dates
- `PATCH /api/reminders` - Update reminder dates (partial update)
- `DELETE /api/reminders` - Reset all reminder dates
- `POST /api/reminders/trigger/:type` - Manually trigger a reminder (whatsapp, email, or report)

### Reports
- `GET /api/reports/generate` - Generate a monthly report
- `GET /api/reports/download` - Download the latest report

## License

This project is proprietary and confidential. 