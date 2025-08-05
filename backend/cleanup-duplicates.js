require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'excel_query_db',
});

async function cleanupDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting duplicate cleanup...');
    
    // Get all files with their counts
    const filesResult = await client.query(`
      SELECT original_name, COUNT(*) as count, 
             array_agg(id ORDER BY upload_date DESC) as file_ids
      FROM uploaded_files 
      GROUP BY original_name 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${filesResult.rows.length} files with duplicates`);
    
    for (const file of filesResult.rows) {
      console.log(`\n📄 File: ${file.original_name} (${file.count} copies)`);
      
      // Keep the latest one, delete the rest
      const keepFileId = file.file_ids[0]; // First one is the latest
      const deleteFileIds = file.file_ids.slice(1);
      
      console.log(`  ✅ Keeping file ID: ${keepFileId}`);
      console.log(`  🗑️  Deleting file IDs: ${deleteFileIds.join(', ')}`);
      
      await client.query('BEGIN');
      
      try {
        // Delete data for old files
        for (const fileId of deleteFileIds) {
          // Delete excel_data
          await client.query('DELETE FROM excel_data WHERE sheet_id IN (SELECT id FROM excel_sheets WHERE file_id = $1)', [fileId]);
          
          // Delete excel_sheets
          await client.query('DELETE FROM excel_sheets WHERE file_id = $1', [fileId]);
          
          // Delete uploaded_files
          await client.query('DELETE FROM uploaded_files WHERE id = $1', [fileId]);
        }
        
        await client.query('COMMIT');
        console.log(`  ✅ Cleanup completed for ${file.original_name}`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Error cleaning up ${file.original_name}:`, error.message);
      }
    }
    
    // Show final stats
    const finalStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM uploaded_files) as total_files,
        (SELECT COUNT(*) FROM excel_sheets) as total_sheets,
        (SELECT COUNT(*) FROM excel_data) as total_rows
    `);
    
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total Files: ${finalStats.rows[0].total_files}`);
    console.log(`   Total Sheets: ${finalStats.rows[0].total_sheets}`);
    console.log(`   Total Rows: ${finalStats.rows[0].total_rows}`);
    console.log(`\n🎉 Cleanup completed successfully!`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  This will remove duplicate files from PostgreSQL. Continue? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    cleanupDuplicates();
  } else {
    console.log('Cleanup cancelled.');
    process.exit(0);
  }
  rl.close();
});
