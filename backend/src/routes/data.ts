import express from 'express';
import { pool } from '../index';

const router = express.Router();

// GET /api/data/files - Get all uploaded files
router.get('/files', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, original_name, upload_date FROM uploaded_files ORDER BY upload_date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// GET /api/data/files/latest - Get the most recent uploaded file with sheets
router.get('/files/latest', async (req, res) => {
  try {
    const fileResult = await pool.query(
      'SELECT id, original_name, upload_date FROM uploaded_files ORDER BY upload_date DESC LIMIT 1'
    );
    
    if (fileResult.rows.length === 0) {
      return res.json({ hasFiles: false });
    }

    const file = fileResult.rows[0];
    const sheetsResult = await pool.query(
      'SELECT id, sheet_name FROM excel_sheets WHERE file_id = $1 ORDER BY id',
      [file.id]
    );

    res.json({
      hasFiles: true,
      file: {
        id: file.id,
        name: file.original_name,
        uploadDate: file.upload_date
      },
      sheets: sheetsResult.rows.map(row => ({
        id: row.id,
        name: row.sheet_name
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching latest file:', error);
    res.status(500).json({ error: 'Failed to fetch latest file' });
  }
});

// GET /api/data/files/check/:filename - Check if filename already exists
router.get('/files/check/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await pool.query(
      'SELECT id, upload_date FROM uploaded_files WHERE original_name = $1 ORDER BY upload_date DESC LIMIT 1',
      [filename]
    );
    
    res.json({
      exists: result.rows.length > 0,
      file: result.rows.length > 0 ? {
        id: result.rows[0].id,
        uploadDate: result.rows[0].upload_date
      } : null
    });
  } catch (error) {
    console.error('❌ Error checking file:', error);
    res.status(500).json({ error: 'Failed to check file' });
  }
});

// GET /api/data/files/:fileId/sheets - Get sheets for a specific file
router.get('/files/:fileId/sheets', async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await pool.query(
      'SELECT id, sheet_name, headers, row_count FROM excel_sheets WHERE file_id = $1',
      [fileId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching sheets:', error);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
});

// GET /api/data/sheets/:sheetId - Get paginated data from a specific sheet
router.get('/sheets/:sheetId', async (req, res) => {
  try {
    const { sheetId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const offset = (page - 1) * limit;

    // Get sheet info
    const sheetResult = await pool.query(
      'SELECT sheet_name, headers, row_count FROM excel_sheets WHERE id = $1',
      [sheetId]
    );

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const sheetInfo = sheetResult.rows[0];

    // Get paginated data
    const dataResult = await pool.query(
      'SELECT row_number, data FROM excel_data WHERE sheet_id = $1 ORDER BY row_number LIMIT $2 OFFSET $3',
      [sheetId, limit, offset]
    );

    const totalPages = Math.ceil(sheetInfo.row_count / limit);

    res.json({
      sheetName: sheetInfo.sheet_name,
      headers: sheetInfo.headers,
      totalRows: sheetInfo.row_count,
      currentPage: page,
      totalPages,
      limit,
      data: dataResult.rows.map(row => row.data)
    });

  } catch (error) {
    console.error('❌ Error fetching sheet data:', error);
    res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
});

// GET /api/data/suggestions/companies - Get company name suggestions based on partial input
router.get('/suggestions/companies', async (req, res) => {
  try {
    const query = req.query.q as string || '';
    
    if (query.length < 1) {
      return res.json([]);
    }

    const suggestionsQuery = `
      SELECT DISTINCT
        COALESCE(
          data->>'company_name',
          data->>'company',
          data->>'Company_Name',
          data->>'Name of the Applicant'
        ) as company_name
      FROM excel_data ed
      WHERE (
        data->>'company_name' ILIKE $1 OR
        data->>'company' ILIKE $1 OR
        data->>'Company_Name' ILIKE $1 OR
        data->>'Name of the Applicant' ILIKE $1
      )
      AND COALESCE(
        data->>'company_name',
        data->>'company',
        data->>'Company_Name',
        data->>'Name of the Applicant'
      ) IS NOT NULL
      ORDER BY company_name
      LIMIT 10
    `;

    const result = await pool.query(suggestionsQuery, [`${query}%`]);
    const suggestions = result.rows
      .map(row => row.company_name)
      .filter(name => name && name.toString().trim() !== '')
      .map(name => name.toString().trim());

    res.json(suggestions);
  } catch (error) {
    console.error('❌ Error fetching company suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch company suggestions' });
  }
});

// GET /api/data/suggestions/products - Get product name suggestions based on partial input
router.get('/suggestions/products', async (req, res) => {
  try {
    const query = req.query.q as string || '';
    
    if (query.length < 1) {
      return res.json([]);
    }

    const suggestionsQuery = `
      SELECT DISTINCT
        COALESCE(
          data->>'product_name',
          data->>'product',
          data->>'Product_Name',
          data->>'Name of the Product',
          data->>'Product name'
        ) as product_name
      FROM excel_data ed
      WHERE (
        data->>'product_name' ILIKE $1 OR
        data->>'product' ILIKE $1 OR
        data->>'Product_Name' ILIKE $1 OR
        data->>'Name of the Product' ILIKE $1 OR
        data->>'Product name' ILIKE $1
      )
      AND COALESCE(
        data->>'product_name',
        data->>'product',
        data->>'Product_Name',
        data->>'Name of the Product',
        data->>'Product name'
      ) IS NOT NULL
      ORDER BY product_name
      LIMIT 10
    `;

    const result = await pool.query(suggestionsQuery, [`${query}%`]);
    const suggestions = result.rows
      .map(row => row.product_name)
      .filter(name => name && name.toString().trim() !== '')
      .map(name => name.toString().trim());

    res.json(suggestions);
  } catch (error) {
    console.error('❌ Error fetching product suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch product suggestions' });
  }
});

// GET /api/data/search - Search for ALL records across ALL sheets by company, product, and date range
// Special logic: If date range is provided, first lookup RC numbers from "list of rc" sheet
router.get('/search', async (req, res) => {
  try {
    const company = req.query.company as string || '';
    const product = req.query.product as string || '';
    const dateFrom = req.query.dateFrom as string || '';
    const dateTo = req.query.dateTo as string || '';
    
    let rcNumbers: string[] = [];
    
    // Step 1: If date range is provided, get RC numbers from "list of rc" sheet
    if (dateFrom || dateTo) {
      console.log('🔍 Looking up RC numbers from "list of rc" sheet for date range...');
      
      let dateConditions = [];
      let dateParams = [];
      let paramIndex = 1;
      
      if (dateFrom && dateTo) {
        dateConditions.push(`
          (
            CASE 
              WHEN data->>'Meeting_held_on_date' ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN
                TO_DATE(data->>'Meeting_held_on_date', 'DD.MM.YYYY') BETWEEN $${paramIndex}::date AND $${paramIndex + 1}::date
              ELSE
                COALESCE(
                  (data->>'date')::date,
                  (data->>'date_created')::date,
                  (data->>'created_date')::date,
                  (data->>'transaction_date')::date
                ) BETWEEN $${paramIndex}::date AND $${paramIndex + 1}::date
            END
          )
        `);
        dateParams.push(dateFrom, dateTo);
        paramIndex += 2;
      } else if (dateFrom) {
        dateConditions.push(`
          (
            CASE 
              WHEN data->>'Meeting_held_on_date' ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN
                TO_DATE(data->>'Meeting_held_on_date', 'DD.MM.YYYY') >= $${paramIndex}::date
              ELSE
                COALESCE(
                  (data->>'date')::date,
                  (data->>'date_created')::date,
                  (data->>'created_date')::date,
                  (data->>'transaction_date')::date
                ) >= $${paramIndex}::date
            END
          )
        `);
        dateParams.push(dateFrom);
        paramIndex++;
      } else if (dateTo) {
        dateConditions.push(`
          (
            CASE 
              WHEN data->>'Meeting_held_on_date' ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN
                TO_DATE(data->>'Meeting_held_on_date', 'DD.MM.YYYY') <= $${paramIndex}::date
              ELSE
                COALESCE(
                  (data->>'date')::date,
                  (data->>'date_created')::date,
                  (data->>'created_date')::date,
                  (data->>'transaction_date')::date
                ) <= $${paramIndex}::date
            END
          )
        `);
        dateParams.push(dateTo);
        paramIndex++;
      }
      
      const rcLookupQuery = `
        SELECT DISTINCT
          COALESCE(
            data->>'rc_number', 
            data->>'rc', 
            data->>'rc_no', 
            data->>'reference_number',
            data->>'RC_Number'
          ) as rc_number,
          data->>'Meeting_held_on_date' as meeting_date
        FROM excel_data ed
        JOIN excel_sheets s ON s.id = ed.sheet_id
        WHERE (LOWER(s.sheet_name) LIKE '%list%rc%' 
          OR LOWER(s.sheet_name) LIKE '%rc%list%'
          OR LOWER(s.sheet_name) = 'list of rc'
          OR LOWER(s.sheet_name) = 'list_of_rc')
          AND (${dateConditions.join(' OR ')})
          AND (
            data->>'rc_number' IS NOT NULL OR
            data->>'rc' IS NOT NULL OR
            data->>'rc_no' IS NOT NULL OR
            data->>'reference_number' IS NOT NULL OR
            data->>'RC_Number' IS NOT NULL
          )
      `;
      
      try {
        console.log('📅 RC Lookup Query:', rcLookupQuery);
        console.log('📅 RC Lookup Params:', dateParams);
        
        const rcResult = await pool.query(rcLookupQuery, dateParams);
        console.log(`📊 RC Lookup returned ${rcResult.rows.length} rows`);
        
        // Create a map of RC numbers to their meeting dates
        const rcDateMap = new Map();
        rcNumbers = rcResult.rows
          .map(row => {
            const rcNum = row.rc_number;
            const meetingDate = row.meeting_date;
            if (rcNum && meetingDate) {
              rcDateMap.set(rcNum.toString().trim(), meetingDate);
            }
            return rcNum;
          })
          .filter(rc => rc && rc.toString().trim() !== '')
          .map(rc => rc.toString().trim());
        
        console.log(`📋 Found ${rcNumbers.length} RC numbers for date range ${dateFrom || 'start'} to ${dateTo || 'end'}:`, rcNumbers);
        console.log(`📅 RC Date mapping:`, Object.fromEntries(rcDateMap));
        
        if (rcNumbers.length === 0) {
          console.log('⚠️ No RC numbers found in date range, returning empty results');
          return res.json({
            summary: {
              total_records: 0,
              total_sheets: 0,
              search_criteria: { 
                company, 
                product, 
                dateFrom: dateFrom || null, 
                dateTo: dateTo || null,
                date_range: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 
                           dateFrom ? `from ${dateFrom}` : 
                           dateTo ? `until ${dateTo}` : null,
                rc_numbers_found: []
              }
            },
            results: []
          });
        } else {
          console.log(`🔍 Now searching ALL sheets for records containing RC numbers: ${rcNumbers.join(', ')}`);
        }
      } catch (rcError) {
        console.error('❌ Error looking up RC numbers:', rcError);
        // Continue with regular search if RC lookup fails
      }
    }
    
    // Step 2: Build main search conditions
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Add RC number condition if we found any from date range
    if (rcNumbers.length > 0) {
      const rcConditions = rcNumbers.map(rc => {
        // Extract just the number part for better matching (e.g., "463rd" -> "463")
        const rcNumber = rc.replace(/[^\d]/g, '');
        const condition = `(
          data->>'rc_number' ILIKE $${paramIndex} OR
          data->>'rc' ILIKE $${paramIndex} OR
          data->>'rc_no' ILIKE $${paramIndex} OR
          data->>'reference_number' ILIKE $${paramIndex} OR
          data->>'RC_Number' ILIKE $${paramIndex + 1} OR
          data::text ILIKE $${paramIndex} OR
          data::text ILIKE $${paramIndex + 1}
        )`;
        queryParams.push(`%${rc}%`, `%${rcNumber}%`);
        paramIndex += 2;
        return condition;
      });
      whereConditions.push(`(${rcConditions.join(' OR ')})`);
    }

    // Add company filter
    if (company) {
      whereConditions.push(`(
        data->>'company_name' ILIKE $${paramIndex} OR 
        data->>'company' ILIKE $${paramIndex} OR
        data::text ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${company}%`);
      paramIndex++;
    }
    
    // Add product filter
    if (product) {
      whereConditions.push(`(
        data->>'product' ILIKE $${paramIndex} OR 
        data->>'product_name' ILIKE $${paramIndex} OR
        data::text ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${product}%`);
      paramIndex++;
    }
    
    // If no date range was provided, still need at least company or product
    if (whereConditions.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one search parameter' });
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Step 3: Get ALL matching records from ALL sheets with DISTINCT to avoid duplicates
    const searchQuery = `
      SELECT DISTINCT
        s.sheet_name,
        f.original_name as file_name,
        ed.row_number,
        ed.data,
        data->>'annexure' as annexure,
        data->>'title' as title,
        COALESCE(
          data->>'date', 
          data->>'date_created', 
          data->>'created_date', 
          data->>'transaction_date',
          data->>'Meeting_held_on_date'
        ) as date_value,
        COALESCE(
          data->>'rc_number', 
          data->>'rc', 
          data->>'rc_no', 
          data->>'reference_number',
          data->>'RC_Number'
        ) as rc_value
      FROM excel_data ed
      JOIN excel_sheets s ON s.id = ed.sheet_id
      JOIN uploaded_files f ON f.id = s.file_id
      ${whereClause}
      ORDER BY s.sheet_name, ed.row_number
    `;

    const result = await pool.query(searchQuery, queryParams);
    
    // Step 4: Group results by sheet name and ensure no duplicates
    const groupedResults = result.rows.reduce((acc, row) => {
      const sheetName = row.sheet_name;
      const recordKey = `${row.sheet_name}-${row.row_number}`; // Unique key for each record
      
      if (!acc[sheetName]) {
        acc[sheetName] = {
          sheet_name: sheetName,
          file_name: row.file_name,
          annexure: row.annexure || '',
          title: row.title || '',
          total_matches: 0,
          records: [],
          recordKeys: new Set() // Track unique records
        };
      }
      
      // Only add if we haven't seen this record before
      if (!acc[sheetName].recordKeys.has(recordKey)) {
        acc[sheetName].records.push({
          row_number: row.row_number,
          data: row.data,
          date_value: row.date_value,
          rc_value: row.rc_value
        });
        acc[sheetName].recordKeys.add(recordKey);
        acc[sheetName].total_matches++;
      }
      
      return acc;
    }, {});

    // Convert to array and remove the recordKeys helper
    const sheetsWithMatches = Object.values(groupedResults).map((sheet: any) => {
      const { recordKeys, ...cleanSheet } = sheet;
      return cleanSheet;
    });
    
    const totalRecords = sheetsWithMatches.reduce((total, sheet) => total + sheet.total_matches, 0);
    const totalSheets = sheetsWithMatches.length;

    res.json({
      summary: {
        total_records: totalRecords,
        total_sheets: totalSheets,
        search_criteria: { 
          company, 
          product, 
          dateFrom: dateFrom || null, 
          dateTo: dateTo || null,
          date_range: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 
                     dateFrom ? `from ${dateFrom}` : 
                     dateTo ? `until ${dateTo}` : null,
          rc_numbers_found: rcNumbers
        }
      },
      results: sheetsWithMatches
    });

  } catch (error) {
    console.error('❌ Error searching records:', error);
    res.status(500).json({ error: 'Failed to search records' });
  }
});

// GET /api/data/sheet/:sheetName - Get rows from a specific sheet with filters
router.get('/sheet/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const company = req.query.company as string || '';
    const product = req.query.product as string || '';
    const date = req.query.date as string || '';
    
    let whereConditions = [`s.sheet_name = $1`];
    let queryParams = [sheetName];
    let paramIndex = 2;

    // Add filter conditions
    if (company) {
      whereConditions.push(`data->>'company_name' ILIKE $${paramIndex}`);
      queryParams.push(`%${company}%`);
      paramIndex++;
    }
    
    if (product) {
      whereConditions.push(`data->>'product' ILIKE $${paramIndex}`);
      queryParams.push(`%${product}%`);
      paramIndex++;
    }
    
    if (date) {
      whereConditions.push(`data->>'date' = $${paramIndex}`);
      queryParams.push(date);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get matching rows from the specified sheet
    const dataQuery = `
      SELECT ed.data, ed.row_number
      FROM excel_data ed
      JOIN excel_sheets s ON s.id = ed.sheet_id
      WHERE ${whereClause}
      ORDER BY ed.row_number
    `;

    const result = await pool.query(dataQuery, queryParams);
    
    res.json({
      sheetName,
      totalRows: result.rows.length,
      data: result.rows.map(row => row.data)
    });

  } catch (error) {
    console.error('❌ Error fetching sheet data:', error);
    res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
});

// POST /api/data/sheets/:sheetId/query - Query data with filters and sorting
router.post('/sheets/:sheetId/query', async (req, res) => {
  try {
    const { sheetId } = req.params;
    const { 
      filters = [], 
      sortBy, 
      sortOrder = 'ASC',
      page = 1,
      limit = 15 
    } = req.body;

    // Get sheet info
    const sheetResult = await pool.query(
      'SELECT sheet_name, headers FROM excel_sheets WHERE id = $1',
      [sheetId]
    );

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const sheetInfo = sheetResult.rows[0];
    let whereClause = '';
    let queryParams = [sheetId];
    let paramIndex = 2;

    // Build filter conditions
    if (filters.length > 0) {
      const filterConditions = filters.map((filter: any) => {
        const condition = `data->>'${filter.column}' ${getOperatorSQL(filter.operator)} $${paramIndex}`;
        queryParams.push(filter.value);
        paramIndex++;
        return condition;
      });
      whereClause = ' AND ' + filterConditions.join(' AND ');
    }

    // Build sort clause
    let orderClause = 'ORDER BY row_number';
    if (sortBy) {
      orderClause = `ORDER BY data->>'${sortBy}' ${sortOrder.toUpperCase()}`;
    }

    // Count total matching rows
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM excel_data 
      WHERE sheet_id = $1 ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRows = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (page - 1) * limit;
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;
    queryParams.push(limit.toString(), offset.toString());
    
    const dataQuery = `
      SELECT row_number, data 
      FROM excel_data 
      WHERE sheet_id = $1 ${whereClause}
      ${orderClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);
    const totalPages = Math.ceil(totalRows / limit);

    res.json({
      sheetName: sheetInfo.sheet_name,
      headers: sheetInfo.headers,
      totalRows,
      filteredRows: totalRows,
      currentPage: page,
      totalPages,
      limit,
      data: dataResult.rows.map(row => row.data),
      appliedFilters: filters,
      sortBy,
      sortOrder
    });

  } catch (error) {
    console.error('❌ Error querying sheet data:', error);
    res.status(500).json({ error: 'Failed to query sheet data' });
  }
});

// Helper function to convert filter operators to SQL
function getOperatorSQL(operator: string): string {
  switch (operator) {
    case 'equals':
      return '=';
    case 'contains':
      return 'ILIKE';
    case 'startsWith':
      return 'ILIKE';
    case 'endsWith':
      return 'ILIKE';
    case 'greaterThan':
      return '>';
    case 'lessThan':
      return '<';
    case 'greaterThanOrEqual':
      return '>=';
    case 'lessThanOrEqual':
      return '<=';
    case 'notEquals':
      return '!=';
    default:
      return '=';
  }
}

// DELETE /api/data/files/:fileId - Delete a file and all its data
router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete excel_data for all sheets of this file
      await client.query(`
        DELETE FROM excel_data 
        WHERE sheet_id IN (
          SELECT id FROM excel_sheets WHERE file_id = $1
        )
      `, [fileId]);

      // Delete excel_sheets
      await client.query('DELETE FROM excel_sheets WHERE file_id = $1', [fileId]);

      // Delete uploaded_files
      const result = await client.query('DELETE FROM uploaded_files WHERE id = $1 RETURNING original_name', [fileId]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'File not found' });
      }

      await client.query('COMMIT');
      res.json({ message: 'File deleted successfully', fileName: result.rows[0].original_name });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// GET /api/data/rc-dates - Get RC numbers with their meeting dates from List_of_RC sheet
router.get('/rc-dates', async (req, res) => {
  try {
    console.log('🔍 Fetching RC numbers with meeting dates from List_of_RC sheet...');
    
    const rcDateQuery = `
      SELECT DISTINCT
        COALESCE(
          data->>'rc_number', 
          data->>'rc', 
          data->>'rc_no', 
          data->>'reference_number',
          data->>'RC_Number'
        ) as rc_number,
        data->>'Meeting_held_on_date' as meeting_date
      FROM excel_data ed
      JOIN excel_sheets s ON s.id = ed.sheet_id
      WHERE (LOWER(s.sheet_name) LIKE '%list%rc%' 
        OR LOWER(s.sheet_name) LIKE '%rc%list%'
        OR LOWER(s.sheet_name) = 'list of rc'
        OR LOWER(s.sheet_name) = 'list_of_rc')
        AND (
          data->>'rc_number' IS NOT NULL OR
          data->>'rc' IS NOT NULL OR
          data->>'rc_no' IS NOT NULL OR
          data->>'reference_number' IS NOT NULL OR
          data->>'RC_Number' IS NOT NULL
        )
        AND data->>'Meeting_held_on_date' IS NOT NULL
      ORDER BY rc_number
    `;

    const result = await pool.query(rcDateQuery);
    
    // Create a mapping object
    const rcDateMapping: { [key: string]: string } = {};
    result.rows.forEach(row => {
      if (row.rc_number && row.meeting_date) {
        rcDateMapping[row.rc_number.toString().trim()] = row.meeting_date;
      }
    });

    console.log(`📅 Found ${Object.keys(rcDateMapping).length} RC numbers with meeting dates`);
    
    res.json(rcDateMapping);

  } catch (error) {
    console.error('❌ Error fetching RC dates:', error);
    res.status(500).json({ error: 'Failed to fetch RC dates' });
  }
});

export default router;
