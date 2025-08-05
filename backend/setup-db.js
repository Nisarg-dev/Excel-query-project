const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Connect to default postgres database first
  password: 'Nisarg@2305',
  port: 5432,
};

async function setupDatabase() {
  console.log('🔄 Setting up PostgreSQL database...');
  
  let pool = new Pool(config);
  
  try {
    // First, create the database if it doesn't exist
    console.log('📝 Creating database excel_query_db...');
    
    try {
      await pool.query('CREATE DATABASE excel_query_db');
      console.log('✅ Database excel_query_db created successfully');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('ℹ️ Database excel_query_db already exists');
      } else {
        throw error;
      }
    }
    
    // Close connection to postgres database
    await pool.end();
    
    // Connect to the new database
    console.log('🔌 Connecting to excel_query_db...');
    pool = new Pool({
      ...config,
      database: 'excel_query_db'
    });
    
    // Read and execute the setup SQL
    const setupSqlPath = path.join(__dirname, 'database', 'setup.sql');
    const setupSql = fs.readFileSync(setupSqlPath, 'utf8');
    
    console.log('📋 Creating tables and indexes...');
    
    // Split SQL commands and execute them
    const commands = setupSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('CREATE DATABASE'));
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          await pool.query(command);
          console.log(`✓ Executed: ${command.substring(0, 50)}...`);
        } catch (error) {
          console.log(`⚠️ Command failed (might be OK): ${command.substring(0, 50)}...`);
          console.log(`   Error: ${error.message}`);
        }
      }
    }
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('uploaded_files', 'excel_sheets', 'excel_data')
      ORDER BY tablename
    `);
    
    console.log('📊 Tables found:', result.rows.map(row => row.tablename));
    
    if (result.rows.length === 3) {
      console.log('🎉 Database setup completed successfully!');
      console.log('');
      console.log('✅ Ready to start the server with: npm run dev');
    } else {
      console.log('❌ Some tables are missing. Please check the setup.');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting tips:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check your credentials in .env file');
    console.log('3. Ensure postgres user has database creation privileges');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Test connection first
async function testConnection() {
  console.log('🔌 Testing PostgreSQL connection...');
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Main execution
async function main() {
  console.log('🚀 PostgreSQL Database Setup for Excel Query Tool');
  console.log('================================================');
  
  const isConnected = await testConnection();
  if (!isConnected) {
    console.log('');
    console.log('💡 Please check:');
    console.log('1. PostgreSQL is running on localhost:5432');
    console.log('2. Username: postgres');
    console.log('3. Password: Nisarg@2305');
    console.log('4. PostgreSQL service is started');
    return;
  }
  
  await setupDatabase();
}

main().catch(console.error);
