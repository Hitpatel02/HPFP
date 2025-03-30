#!/usr/bin/env node

/**
 * HPFP Installation Script
 * 
 * This script will help set up the HPFP application by:
 * 1. Checking for required dependencies
 * 2. Creating necessary configuration files
 * 3. Setting up the database
 * 4. Creating an admin user
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n===================================');
console.log('  HPFP Installation Assistant');
console.log('===================================\n');

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function runInstallation() {
  try {
    // Check for required dependencies
    console.log('Checking dependencies...');
    
    try {
      execSync('npx sequelize-cli --version', { stdio: 'pipe' });
      console.log('✓ Sequelize CLI is installed.');
    } catch (error) {
      console.log('Installing Sequelize CLI...');
      execSync('npm install --save-dev sequelize-cli', { stdio: 'inherit' });
    }

    // Check if PostgreSQL is accessible
    console.log('\nChecking PostgreSQL connection...');
    let dbConfig = getDbConfig();
    
    // Ask for database credentials if needed
    if (!dbConfig.username || !dbConfig.password) {
      console.log('\nDatabase credentials are required.');
      dbConfig.username = await prompt('Enter PostgreSQL username [postgres]: ') || 'postgres';
      dbConfig.password = await prompt('Enter PostgreSQL password: ');
      
      // Update config.json with the provided credentials
      updateConfigJson(dbConfig);
    }

    // Confirm settings
    console.log('\nDatabase configuration:');
    console.log(`- Host: ${dbConfig.host}`);
    console.log(`- Port: ${dbConfig.port}`);
    console.log(`- Database: ${dbConfig.database}`);
    console.log(`- Username: ${dbConfig.username}`);
    
    const proceed = await prompt('\nProceed with these settings? (Y/n): ');
    if (proceed.toLowerCase() === 'n') {
      console.log('Installation cancelled.');
      rl.close();
      return;
    }
    
    // Run the database setup
    console.log('\nSetting up the database...');
    execSync('node setup-database.js', { stdio: 'inherit' });
    
    console.log('\n✓ Installation completed successfully!\n');
    console.log('You can now start the application with:');
    console.log('npm start');
    console.log('\nLog in with:');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    
  } catch (error) {
    console.error('\nInstallation failed:', error.message);
    
    // Provide troubleshooting tips based on error
    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\nTroubleshooting tips:');
      console.log('1. Make sure PostgreSQL is running');
      console.log('2. Check if username and password are correct');
      console.log('3. Verify that PostgreSQL is listening on the specified port');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\nTroubleshooting tips:');
      console.log('1. The provided PostgreSQL password is incorrect');
      console.log('2. Run this script again with the correct credentials');
    }
  } finally {
    rl.close();
  }
}

function getDbConfig() {
  // Try to get configuration from config.json
  const configJsonPath = path.join(__dirname, 'config', 'config.json');
  
  if (fs.existsSync(configJsonPath)) {
    const config = require(configJsonPath);
    const env = process.env.NODE_ENV || 'development';
    return config[env];
  }
  
  // Fallback to .env if config.json doesn't exist
  return {
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'HPFP',
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    dialect: 'postgres'
  };
}

function updateConfigJson(dbConfig) {
  const configJsonPath = path.join(__dirname, 'config', 'config.json');
  
  if (fs.existsSync(configJsonPath)) {
    const config = require(configJsonPath);
    const env = process.env.NODE_ENV || 'development';
    
    config[env].username = dbConfig.username;
    config[env].password = dbConfig.password;
    
    fs.writeFileSync(configJsonPath, JSON.stringify(config, null, 2));
    console.log('✓ Configuration updated in config.json');
  }
}

runInstallation(); 