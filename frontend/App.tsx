
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ExcelData, Row, SortConfig, Filter } from './types';
import { uploadAndParseExcel, checkForExistingData, checkFileExists, loadExistingData } from './services/mockApi';
import FileUpload from './components/FileUpload';
import QueryControls from './components/QueryControls';
import DataTable from './components/DataTable';
import Pagination from './components/Pagination';
import SearchComponent from './components/SearchComponent';
import { DownloadIcon, FileIcon } from './components/icons';

const ROWS_PER_PAGE = 15;

export default function App(): React.ReactNode {
    const [activeTab, setActiveTab] = useState<'search' | 'upload'>('search');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fileName, setFileName] = useState<string>('');
  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(true);
  const [autoLoadedFile, setAutoLoadedFile] = useState<boolean>(false);

  // Check for existing data on app load
  useEffect(() => {
    const checkExistingData = async () => {
      setIsLoadingExisting(true);
      try {
        const result = await checkForExistingData();
        console.log('Auto-load check result:', result);
        
        if (result.hasData && result.file && result.sheets) {
          console.log('Loading existing file:', result.file.name);
          // Load existing data
          const data = await loadExistingData(result.file.id);
          setExcelData(data);
          setSelectedSheet(data.sheetNames[0] || '');
          setFileName(result.file.name);
          setAutoLoadedFile(true);
          
          console.log('Successfully auto-loaded file with', data.sheetNames.length, 'sheets');
          
          // Save to localStorage for persistence
          localStorage.setItem('lastLoadedFile', JSON.stringify({
            fileId: result.file.id,
            fileName: result.file.name,
            sheetNames: data.sheetNames,
            selectedSheet: data.sheetNames[0] || ''
          }));
        } else {
          console.log('No existing files found to auto-load');
        }
      } catch (error) {
        console.warn('Failed to load existing data:', error);
      } finally {
        setIsLoadingExisting(false);
      }
    };

    checkExistingData();
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Check if file already exists
      const fileCheck = await checkFileExists(file.name);
      
      if (fileCheck.exists) {
        const confirmed = window.confirm(
          `File "${file.name}" already exists in the database. Do you want to upload it again? This will create a duplicate.`
        );
        
        if (!confirmed) {
          setIsProcessing(false);
          return;
        }
      }

      setFileName(file.name);
      const data = await uploadAndParseExcel(file);
      setExcelData(data);
      setSelectedSheet(data.sheetNames[0] || '');
      setFilters([]);
      setSortConfig(null);
      setCurrentPage(1);

      // Save to localStorage
      localStorage.setItem('lastLoadedFile', JSON.stringify({
        fileName: file.name,
        sheetNames: data.sheetNames,
        selectedSheet: data.sheetNames[0] || ''
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during file processing.');
      setExcelData(null);
      setFileName('');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleReset = () => {
    setExcelData(null);
    setSelectedSheet('');
    setFilters([]);
    setSortConfig(null);
    setCurrentPage(1);
    setError(null);
    setFileName('');
    setAutoLoadedFile(false);
    localStorage.removeItem('lastLoadedFile');
  };

  const currentSheetData = useMemo(() => {
    if (!excelData || !selectedSheet) return [];
    return excelData.data[selectedSheet] || [];
  }, [excelData, selectedSheet]);

  const columns = useMemo(() => {
    if (currentSheetData.length === 0) return [];
    return Object.keys(currentSheetData[0]);
  }, [currentSheetData]);

  const filteredData = useMemo(() => {
    let data = [...currentSheetData];
    if (filters.length > 0) {
      data = data.filter(row => {
        return filters.every(filter => {
          const rowValue = row[filter.column];
          if (rowValue === undefined || rowValue === null) return false;
          return String(rowValue).toLowerCase().includes(filter.value.toLowerCase());
        });
      });
    }
    return data;
  }, [currentSheetData, filters]);
  
  const sortedData = useMemo(() => {
    let data = [...filteredData];
    if (sortConfig !== null) {
      data.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        if (valA === null || valA === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (valB === null || valB === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;

        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [sortedData, currentPage]);
  
  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleExportToCSV = useCallback(() => {
      if (sortedData.length === 0) return;
      
      const headers = Object.keys(sortedData[0]);
      const csvRows = [
        headers.join(','), 
        ...sortedData.map(row => 
          headers.map(fieldName => 
            JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value)
          ).join(',')
        )
      ];
      
      const csvString = csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const exportFileName = `${fileName.split('.')[0]}_${selectedSheet}.csv`;
      link.setAttribute('download', exportFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }, [sortedData, fileName, selectedSheet]);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
            Excel Data Query Tool
          </h1>
          <p className="mt-2 text-lg text-gray-400">Upload, analyze, and export your spreadsheet data with ease.</p>
        </header>

        {/* Tab Navigation - Upload Tab Enabled */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('search')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'search'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                Search Data
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                Upload & Manage Files
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content - Show Both Tabs */}
        {activeTab === 'search' ? (
          <SearchComponent />
        ) : (
          <div>
            {isLoadingExisting ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Checking for existing data...</p>
                <p className="text-sm text-gray-500 mt-2">Loading your last uploaded file if available</p>
              </div>
            ) : !excelData ? (
              <div>
                <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} error={error} />
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    💡 Tip: If you've uploaded files before, they'll automatically load on page refresh
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {autoLoadedFile && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-green-400 font-medium">Welcome back!</p>
                        <p className="text-green-300/80 text-sm">Automatically loaded your last uploaded file: {fileName}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                     <div className="flex items-center gap-3">
                        <FileIcon className="w-6 h-6 text-indigo-400" />
                        <div>
                          <span className="font-medium text-lg">{fileName}</span>
                          <p className="text-sm text-gray-400">
                            {excelData.sheetNames.length} sheets • {Object.values(excelData.data).reduce((total: number, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0)} total rows
                          </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                       <button
                         onClick={handleExportToCSV}
                         disabled={sortedData.length === 0}
                         className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-semibold"
                       >
                         <DownloadIcon className="w-4 h-4" />
                         Export CSV
                       </button>
                       <button 
                         onClick={handleReset} 
                         className="px-4 py-2 bg-red-600/80 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-semibold"
                       >
                         Upload New File
                       </button>
                     </div>
                  </div>
                </div>

                <QueryControls
                  sheets={excelData.sheetNames}
                  selectedSheet={selectedSheet}
                  onSheetChange={setSelectedSheet}
                  columns={columns}
                  filters={filters}
                  onFiltersChange={setFilters}
                />

                <DataTable
                  data={paginatedData}
                  columns={columns}
                  onSort={handleSort}
                  sortConfig={sortConfig}
                />
                
                {totalPages > 1 && (
                    <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    />
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Built with React & TypeScript. Data stored in PostgreSQL. Auto-loads your last uploaded file.</p>
      </footer>
    </div>
  );
}
