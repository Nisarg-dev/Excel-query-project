
import { ExcelData, Row } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Search for ALL records across ALL sheets by company, product, and date range
// Special logic: If date range is provided, first lookup RC numbers from "list of rc" sheet
export const searchSheets = async (filters: {
  company?: string;
  product?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{
  summary: {
    total_records: number;
    total_sheets: number;
    search_criteria: { 
      company: string; 
      product: string; 
      dateFrom: string | null; 
      dateTo: string | null;
      date_range: string | null;
      rc_numbers_found?: string[];
    };
  };
  results: Array<{
    sheet_name: string;
    file_name: string;
    annexure: string;
    title: string;
    total_matches: number;
    records: Array<{ row_number: number; data: any; date_value?: string; rc_value?: string }>;
  }>;
}> => {
  try {
    const params = new URLSearchParams();
    if (filters.company) params.append('company', filters.company);
    if (filters.product) params.append('product', filters.product);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await fetch(`${API_BASE_URL}/data/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching sheets:', error);
    throw error;
  }
};

// Get company name suggestions
export const getCompanySuggestions = async (query: string): Promise<string[]> => {
  try {
    if (!query || query.length < 1) return [];
    
    const response = await fetch(`${API_BASE_URL}/data/suggestions/companies?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching company suggestions:', error);
    return [];
  }
};

// Get product name suggestions
export const getProductSuggestions = async (query: string): Promise<string[]> => {
  try {
    if (!query || query.length < 1) return [];
    
    const response = await fetch(`${API_BASE_URL}/data/suggestions/products?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching product suggestions:', error);
    return [];
  }
};

// Get rows from a specific sheet with filters
export const getSheetData = async (sheetName: string, filters: {
  company?: string;
  product?: string;
  date?: string;
}): Promise<{ sheetName: string; totalRows: number; data: Row[] }> => {
  try {
    const params = new URLSearchParams();
    if (filters.company) params.append('company', filters.company);
    if (filters.product) params.append('product', filters.product);
    if (filters.date) params.append('date', filters.date);

    const response = await fetch(`${API_BASE_URL}/data/sheet/${encodeURIComponent(sheetName)}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
};

// Check if app has existing data to load
export const checkForExistingData = async (): Promise<{
  hasData: boolean;
  file?: { id: number; name: string; uploadDate: string };
  sheets?: { id: number; name: string }[];
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/data/files/latest`);
    if (response.ok) {
      const result = await response.json();
      return {
        hasData: result.hasFiles || false,
        file: result.file,
        sheets: result.sheets
      };
    }
    return { hasData: false };
  } catch (error) {
    console.warn('Error checking for existing data:', error);
    return { hasData: false };
  }
};

// Check if a filename already exists
export const checkFileExists = async (filename: string): Promise<{
  exists: boolean;
  file?: { id: number; uploadDate: string };
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/data/files/check/${encodeURIComponent(filename)}`);
    if (response.ok) {
      return await response.json();
    }
    return { exists: false };
  } catch (error) {
    console.warn('Error checking file existence:', error);
    return { exists: false };
  }
};

// Load existing data by file ID
export const loadExistingData = async (fileId: number): Promise<ExcelData> => {
  try {
    // Get sheets for the file
    const sheetsResponse = await fetch(`${API_BASE_URL}/data/files/${fileId}/sheets`);
    if (!sheetsResponse.ok) {
      throw new Error('Failed to fetch sheets');
    }
    
    const sheets = await sheetsResponse.json();
    const excelData: ExcelData = {
      sheetNames: sheets.map((sheet: any) => sheet.sheet_name),
      data: {}
    };

    // Load data for each sheet
    for (const sheet of sheets) {
      try {
        const sheetResponse = await fetch(`${API_BASE_URL}/data/sheets/${sheet.id}?page=1&limit=1000`);
        if (sheetResponse.ok) {
          const sheetData = await sheetResponse.json();
          excelData.data[sheet.sheet_name] = sheetData.data || [];
        } else {
          console.warn(`Failed to fetch data for sheet ${sheet.sheet_name}`);
          excelData.data[sheet.sheet_name] = [];
        }
      } catch (error) {
        console.warn(`Error fetching data for sheet ${sheet.sheet_name}:`, error);
        excelData.data[sheet.sheet_name] = [];
      }
    }

    return excelData;
  } catch (error) {
    console.error('Error loading existing data:', error);
    throw error;
  }
};

export const uploadExcelFile = (file: File): Promise<ExcelData> => {
  return new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();
      formData.append('excelFile', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Transform backend response to match frontend interface
      const excelData: ExcelData = {
        sheetNames: result.sheets?.map((sheet: any) => sheet.name) || result.sheetNames || [],
        data: {}
      };

      // For now, we'll fetch the first sheet data to maintain compatibility
      if (result.sheets && result.sheets.length > 0) {
        for (const sheet of result.sheets) {
          try {
            // Fetch sheet data from backend
            const sheetResponse = await fetch(`${API_BASE_URL}/data/sheets/${sheet.id}?page=1&limit=1000`);
            if (sheetResponse.ok) {
              const sheetData = await sheetResponse.json();
              
              // The backend already returns data in the correct format
              // Each row in sheetData.data is already an object with headers as keys
              excelData.data[sheet.name] = sheetData.data || [];
            } else {
              console.warn(`Failed to fetch data for sheet ${sheet.name}:`, sheetResponse.statusText);
              excelData.data[sheet.name] = [];
            }
          } catch (error) {
            console.warn(`Error fetching data for sheet ${sheet.name}:`, error);
            excelData.data[sheet.name] = [];
          }
        }
      } else if (result.sheetNames && result.sheetNames.length > 0) {
        // Fallback: If no sheets with IDs, just create empty data arrays
        console.warn('No sheet IDs returned from upload, data won\'t be loaded');
        result.sheetNames.forEach((sheetName: string) => {
          excelData.data[sheetName] = [];
        });
      }

      resolve(excelData);
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  });
};
