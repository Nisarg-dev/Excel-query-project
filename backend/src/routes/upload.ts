
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { pool } from '../index';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// PDF storage config
const pdfStoragePath = path.join(__dirname, '../../pdf_storage');
if (!fs.existsSync(pdfStoragePath)) {
  fs.mkdirSync(pdfStoragePath, { recursive: true });
}

const pdfMulter = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, pdfStoragePath);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (/^RC\d+\.pdf$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Filename must be <RCNUMBER>.pdf'));
    }
  }
});

// POST /api/upload-pdf
router.post('/upload-pdf', pdfMulter.single('pdf'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const match = file.originalname.match(/^(RC\d+)\.pdf$/i);
    if (!match) {
      return res.status(400).json({ error: 'Invalid filename format. Use <RCNUMBER>.pdf' });
    }
    const rc_number = match[1];
    const pdf_path = `/pdfs/${file.filename}`;
    const id = uuidv4();
    const uploaded_at = new Date();
    await pool.query(
      'INSERT INTO pdf_storage (id, rc_number, pdf_path, uploaded_at) VALUES ($1, $2, $3, $4)',
      [id, rc_number, pdf_path, uploaded_at]
    );
    res.json({ success: true, rc_number, pdf_path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/get-pdf?rc_number=RC12345&page_number=2
router.get('/get-pdf', async (req, res) => {
  try {
    let { rc_number, page_number } = req.query;
    if (!rc_number || !page_number) {
      return res.status(400).json({ error: 'rc_number and page_number required' });
    }
    rc_number = String(rc_number).trim().toUpperCase();
    console.log('DEBUG: Querying for RC number:', rc_number);
    const result = await pool.query(
      'SELECT pdf_path FROM pdf_storage WHERE UPPER(TRIM(rc_number)) = $1 LIMIT 1',
      [rc_number]
    );
    console.log('DEBUG: Query result:', result.rows);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PDF not found', rc_number });
    }
    res.json({ pdf_url: result.rows[0].pdf_path, page_number: Number(page_number) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/list-pdfs - List all uploaded PDFs
router.get('/list-pdfs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, rc_number, pdf_path, uploaded_at FROM pdf_storage ORDER BY uploaded_at DESC'
    );
    res.json({ pdfs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/delete-pdf/:id - Delete a PDF
router.delete('/delete-pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the PDF info to delete the file
    const pdfResult = await pool.query(
      'SELECT pdf_path, rc_number FROM pdf_storage WHERE id = $1',
      [id]
    );
    
    if (pdfResult.rows.length === 0) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    
    const { pdf_path, rc_number } = pdfResult.rows[0];
    
    // Delete from database
    await pool.query('DELETE FROM pdf_storage WHERE id = $1', [id]);
    
    // Delete physical file
    const fileName = pdf_path.replace('/pdfs/', '');
    const filePath = path.join(pdfStoragePath, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ success: true, rc_number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Interface for parsed Excel data
interface ExcelRow {
  [key: string]: any;
}

interface ParsedExcelData {
  sheetNames: string[];
  data: Record<string, ExcelRow[]>;
}

// POST /api/upload - Upload and parse Excel file
router.post('/', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📁 Processing file:', req.file.originalname);

    // Read and parse the Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;
    const parsedData: ParsedExcelData = {
      sheetNames,
      data: {}
    };

    // Process each sheet and store header order
    const sheetHeaders: Record<string, string[]> = {};
    
    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
      
      if (jsonData.length < 1) {
        parsedData.data[sheetName] = [];
        sheetHeaders[sheetName] = [];
        continue;
      }

      const headers = jsonData[0] as string[];
      sheetHeaders[sheetName] = headers; // Store original header order
      
      const rows = (jsonData.slice(1) as any[][]).map(rowArray => {
        const row: ExcelRow = {};
        headers.forEach((header, index) => {
          row[header] = rowArray[index];
        });
        return row;
      });

      parsedData.data[sheetName] = rows;
    }

    // Store in database
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert file record
      const fileResult = await client.query(
        'INSERT INTO uploaded_files (original_name, file_path, upload_date) VALUES ($1, $2, NOW()) RETURNING id',
        [req.file.originalname, req.file.path]
      );
      const fileId = fileResult.rows[0].id;

      // Insert sheets data
      for (const sheetName of sheetNames) {
        const sheetResult = await client.query(
          'INSERT INTO excel_sheets (file_id, sheet_name, headers, row_count) VALUES ($1, $2, $3, $4) RETURNING id',
          [fileId, sheetName, JSON.stringify(sheetHeaders[sheetName]), parsedData.data[sheetName].length]
        );
        const sheetId = sheetResult.rows[0].id;

        // Insert row data in batches
        const sheetData = parsedData.data[sheetName];
        if (sheetData.length > 0) {
          for (let i = 0; i < sheetData.length; i += 1000) { // Process in batches of 1000
            const batch = sheetData.slice(i, i + 1000);
            const values: any[] = [];
            const placeholders: string[] = [];
            let paramIndex = 1;

            batch.forEach((row, index) => {
              const rowNumber = i + index + 1;
              values.push(sheetId, rowNumber, JSON.stringify(row));
              placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
              paramIndex += 3;
            });

            const insertQuery = `
              INSERT INTO excel_data (sheet_id, row_number, data) 
              VALUES ${placeholders.join(', ')}
            `;

            await client.query(insertQuery, values);
          }
        }
      }

      await client.query('COMMIT');

      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);

      // Get the inserted sheet information to return to frontend
      const sheetsResult = await client.query(
        'SELECT id, sheet_name FROM excel_sheets WHERE file_id = $1',
        [fileId]
      );

      const sheets = sheetsResult.rows.map(row => ({
        id: row.id,
        name: row.sheet_name
      }));

      res.json({
        message: 'File uploaded and processed successfully',
        fileId,
        fileName: req.file.originalname,
        sheetNames,
        sheets, // Add this for frontend compatibility
        totalRows: Object.values(parsedData.data).reduce((total, rows) => total + rows.length, 0)
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error processing file:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process Excel file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
