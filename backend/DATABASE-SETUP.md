# Database Setup Guide for HPFP

This guide explains how to set up the PostgreSQL database for the HPFP application on a new computer.

## Prerequisites

1. PostgreSQL installed and running on your computer
2. Node.js installed (version 14 or higher)

## Automatic Setup (Recommended)

For the easiest setup experience, use our installation assistant:

```bash
# Navigate to the backend directory
cd backend

# Install dependencies if not already installed
npm install

# Run the installation assistant
node install.js
```

The installation assistant will:
1. Check if required dependencies are installed
2. Guide you through PostgreSQL configuration
3. Create the database if it doesn't exist
4. Set up all tables automatically
5. Create an admin user

## Manual Setup

If you prefer to set up the database manually, follow these steps:

1. Make sure PostgreSQL is installed and running

2. Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE HPFP;
   ```

3. Configure your database connection:
   
   Edit `backend/config/config.json` and update the credentials:
   ```json
   {
     "development": {
       "username": "your_postgres_username",
       "password": "your_postgres_password",
       "database": "HPFP",
       "host": "localhost",
       "port": 5432,
       "dialect": "postgres"
     }
   }
   ```

4. Run the database migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```

5. Create an admin user manually or by running the second migration:
   ```bash
   npx sequelize-cli db:migrate --to 20240520000001-create-admin-user.js
   ```

## Troubleshooting

### Error: "Cannot find module 'sequelize-cli'"

Install Sequelize CLI:
```bash
npm install --save-dev sequelize-cli
```

### Error: "Cannot find config/config.json" 

This error occurs when Sequelize CLI can't find its configuration file. Make sure:

1. You've created the `config/config.json` file as described above
2. You're running the commands from the `backend` directory
3. If the issue persists, try running:
   ```bash
   npx sequelize-cli init
   ```
   Then copy over your database configuration to the newly created config file.

### Error: "password authentication failed"

This means the PostgreSQL credentials in your configuration are incorrect. Update the username and password in `config/config.json`.

### Error: "role 'your_username' does not exist"

You need to create the PostgreSQL user:

```sql
CREATE ROLE your_username WITH LOGIN PASSWORD 'your_password';
ALTER ROLE your_username CREATEDB;
```

### Error: "permission denied to create database"

Your PostgreSQL user doesn't have permission to create databases. Either:

1. Create the database manually as a superuser
2. Grant your user the CREATEDB permission:
   ```sql
   ALTER USER your_username WITH CREATEDB;
   ```

## Admin Login Credentials

After successful setup, you can log in with:
- Email: admin@example.com
- Password: Admin@123

Please change this password after your first login for security reasons. 