const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function viewData() {
  console.log('📊 Your Excel Data in PostgreSQL');
  console.log('================================\n');

  try {
    // 1. Show uploaded files
    console.log('📁 Uploaded Files:');
    const filesResult = await pool.query(`
      SELECT id, original_name, upload_date 
      FROM uploaded_files 
      ORDER BY upload_date DESC
    `);
    
    if (filesResult.rows.length === 0) {
      console.log('   No files uploaded yet.\n');
      return;
    }

    filesResult.rows.forEach(file => {
      console.log(`   ID: ${file.id} | File: ${file.original_name} | Uploaded: ${file.upload_date}`);
    });
    console.log('');

    // 2. Show sheets for each file
    console.log('📋 Sheets:');
    const sheetsResult = await pool.query(`
      SELECT 
        f.id as file_id,
        f.original_name,
        s.id as sheet_id,
        s.sheet_name,
        s.row_count
      FROM excel_sheets s
      JOIN uploaded_files f ON s.file_id = f.id
      ORDER BY f.upload_date DESC, s.sheet_name
    `);

    sheetsResult.rows.forEach(sheet => {
      console.log(`   File: ${sheet.original_name} | Sheet: ${sheet.sheet_name} | Rows: ${sheet.row_count} | Sheet ID: ${sheet.sheet_id}`);
    });
    console.log('');

    // 3. Show sample data from the first sheet
    if (sheetsResult.rows.length > 0) {
      const firstSheet = sheetsResult.rows[0];
      console.log(`💾 Sample Data from "${firstSheet.sheet_name}":`);
      
      const dataResult = await pool.query(`
        SELECT row_number, data
        FROM excel_data 
        WHERE sheet_id = $1 
        ORDER BY row_number 
        LIMIT 5
      `, [firstSheet.sheet_id]);

      if (dataResult.rows.length > 0) {
        // Show headers
        const headers = Object.keys(dataResult.rows[0].data);
        console.log('   Headers:', headers.join(' | '));
        console.log('   ' + '-'.repeat(100));
        
        // Show data rows
        dataResult.rows.forEach(row => {
          const values = headers.map(header => {
            const value = row.data[header];
            return value ? String(value).substring(0, 20) : 'null';
          });
          console.log(`   Row ${row.row_number}: ${values.join(' | ')}`);
        });
      }
      console.log('');
    }

    // 4. Show total counts
    console.log('📈 Statistics:');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT f.id) as total_files,
        COUNT(DISTINCT s.id) as total_sheets,
        COUNT(ed.id) as total_rows
      FROM uploaded_files f
      LEFT JOIN excel_sheets s ON f.id = s.file_id
      LEFT JOIN excel_data ed ON s.id = ed.sheet_id
    `);
    
    const stats = statsResult.rows[0];
    console.log(`   Total Files: ${stats.total_files}`);
    console.log(`   Total Sheets: ${stats.total_sheets}`);
    console.log(`   Total Data Rows: ${stats.total_rows}`);

  } catch (error) {
    console.error('❌ Error viewing data:', error.message);
  } finally {
    await pool.end();
  }
}

viewData();
