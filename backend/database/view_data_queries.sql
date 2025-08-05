-- View Your Excel Data in PostgreSQL
-- Copy and paste these queries in pgAdmin or any PostgreSQL client

-- 1. See all uploaded files
SELECT 
    id,
    original_name,
    upload_date,
    created_at
FROM uploaded_files 
ORDER BY upload_date DESC;

-- 2. See all sheets with their file information
SELECT 
    f.original_name as file_name,
    s.id as sheet_id,
    s.sheet_name,
    s.row_count,
    s.headers,
    s.created_at
FROM excel_sheets s
JOIN uploaded_files f ON s.file_id = f.id
ORDER BY f.upload_date DESC, s.sheet_name;

-- 3. See sample data from the first sheet (change sheet_id as needed)
SELECT 
    s.sheet_name,
    ed.row_number,
    ed.data
FROM excel_data ed
JOIN excel_sheets s ON ed.sheet_id = s.id
WHERE s.id = 1  -- Change this to your sheet ID
ORDER BY ed.row_number
LIMIT 10;

-- 4. Count total rows per sheet
SELECT 
    f.original_name as file_name,
    s.sheet_name,
    COUNT(ed.id) as actual_row_count,
    s.row_count as recorded_row_count
FROM excel_sheets s
JOIN uploaded_files f ON s.file_id = f.id
LEFT JOIN excel_data ed ON s.id = ed.sheet_id
GROUP BY f.original_name, s.sheet_name, s.row_count
ORDER BY f.original_name, s.sheet_name;

-- 5. See specific columns from your data (example for your file)
-- Replace 'Dual_Use' with your actual sheet name
SELECT 
    (data->>'Annexure') as Annexure,
    (data->>'Case_Type') as Case_Type,
    (data->>'Sr. No.') as Sr_No,
    (data->>'Application No. and Applicant''s Details') as Application_Details
FROM excel_data ed
JOIN excel_sheets s ON ed.sheet_id = s.id
WHERE s.sheet_name = 'Dual_Use'
ORDER BY ed.row_number
LIMIT 10;

-- 6. Search for specific data (example)
-- Find rows containing 'chemical' in any field
SELECT 
    s.sheet_name,
    ed.row_number,
    ed.data
FROM excel_data ed
JOIN excel_sheets s ON ed.sheet_id = s.id
WHERE ed.data::text ILIKE '%chemical%'
ORDER BY s.sheet_name, ed.row_number
LIMIT 5;
