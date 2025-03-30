#!/usr/bin/env node

/**
 * Setup Database
 * 
 * This script will create all the necessary tables and seed the database with initial data.
 * Run this script with: node setup-database.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { Sequelize } = require('sequelize');

async function setupDatabase() {
  console.log('Starting database setup...');
  
  // Create database if it doesn't exist
  try {
    console.log('Checking database connection...');
    
    // Connect to PostgreSQL without specifying a database to create the database if needed
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      username: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      logging: false
    });
    
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL successfully.');
    
    const dbName = process.env.PGDATABASE || 'HPFP';
    
    // Check if database exists
    const [results] = await sequelize.query(
      `SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('${dbName}')`
    );
    
    if (results.length === 0) {
      console.log(`Database ${dbName} does not exist. Creating...`);
      await sequelize.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
    
    await sequelize.close();
    
    // Run migrations
    console.log('Running migrations...');
    try {
      execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
      console.log('Migrations completed successfully.');
    } catch (error) {
      console.error('Error running migrations:', error.message);
      process.exit(1);
    }
    
    console.log('Database setup completed successfully!');
    console.log('\nYou can now log in with:');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    
  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase(); 