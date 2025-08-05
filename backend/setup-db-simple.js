const { Pool } = require('pg');

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
    
    console.log('📋 Creating tables...');
    
    // Create uploaded_files table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id SERIAL PRIMARY KEY,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table uploaded_files created');
    
    // Create excel_sheets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS excel_sheets (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES uploaded_files(id) ON DELETE CASCADE,
        sheet_name VARCHAR(255) NOT NULL,
        headers JSONB,
        row_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table excel_sheets created');
    
    // Create excel_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS excel_data (
        id SERIAL PRIMARY KEY,
        sheet_id INTEGER REFERENCES excel_sheets(id) ON DELETE CASCADE,
        row_number INTEGER NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table excel_data created');
    
    console.log('📊 Creating indexes...');
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_excel_sheets_file_id ON excel_sheets(file_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_excel_data_sheet_id ON excel_data(sheet_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_excel_data_row_number ON excel_data(sheet_id, row_number)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_excel_data_jsonb ON excel_data USING GIN (data)');
    console.log('✅ Indexes created');
    
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
      console.log('');
      console.log('🎉 Database setup completed successfully!');
      console.log('✅ Ready to start the server!');
      return true;
    } else {
      console.log('❌ Some tables are missing.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    return false;
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
  
  const setupSuccess = await setupDatabase();
  if (setupSuccess) {
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Server will start on http://localhost:3001');
    console.log('3. Update your frontend to use the backend API');
  }
}

main().catch(console.error);
