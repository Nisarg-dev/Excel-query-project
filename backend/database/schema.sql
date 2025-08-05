-- Excel Data Query Tool Database Schema
-- Run these commands in your PostgreSQL database

-- Create the database (run this first)
-- CREATE DATABASE excel_query_db;

-- Connect to the database and run the following:

-- Table to store uploaded file metadata
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store Excel sheet metadata
CREATE TABLE excel_sheets (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES uploaded_files(id) ON DELETE CASCADE,
    sheet_name VARCHAR(255) NOT NULL,
    headers JSONB,
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store the actual Excel data
CREATE TABLE excel_data (
    id SERIAL PRIMARY KEY,
    sheet_id INTEGER REFERENCES excel_sheets(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_excel_sheets_file_id ON excel_sheets(file_id);
CREATE INDEX idx_excel_data_sheet_id ON excel_data(sheet_id);
CREATE INDEX idx_excel_data_row_number ON excel_data(sheet_id, row_number);
CREATE INDEX idx_excel_data_jsonb ON excel_data USING GIN (data);

-- Create a function to get sheet statistics
CREATE OR REPLACE FUNCTION get_sheet_stats(sheet_id_param INTEGER)
RETURNS TABLE(
    total_rows BIGINT,
    column_count INTEGER,
    columns TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_rows,
        jsonb_array_length(s.headers) as column_count,
        ARRAY(SELECT jsonb_array_elements_text(s.headers)) as columns
    FROM excel_data ed
    JOIN excel_sheets s ON s.id = ed.sheet_id
    WHERE ed.sheet_id = sheet_id_param
    GROUP BY s.headers;
END;
$$ LANGUAGE plpgsql;
