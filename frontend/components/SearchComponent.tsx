import React, { useState, useEffect, useRef } from 'react';
import { searchSheets, getCompanySuggestions, getProductSuggestions } from '../services/mockApi';
import { Row } from '../types';

interface SearchFilters {
  company: string;
  product: string;
  dateFrom: string;
  dateTo: string;
}

interface SheetResult {
  sheet_name: string;
  file_name: string;
  annexure: string;
  title: string;
  headers: string[]; // Add headers to preserve column order
  total_matches: number;
  records: Array<{ row_number: number; data: any; date_value?: string; rc_value?: string; rc_date?: string }>;
  expanded?: boolean;
}

interface SearchResponse {
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
  results: SheetResult[];
}

const SearchComponent: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    company: '',
    product: '',
    dateFrom: '',
    dateTo: ''
  });
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Autocomplete states
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  
  // Modal states for long text
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Debounced suggestion fetching
  useEffect(() => {
    const fetchCompanySuggestions = async () => {
      if (filters.company.length >= 1) {
        const suggestions = await getCompanySuggestions(filters.company);
        setCompanySuggestions(suggestions);
        setShowCompanySuggestions(suggestions.length > 0);
      } else {
        setCompanySuggestions([]);
        setShowCompanySuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchCompanySuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [filters.company]);

  useEffect(() => {
    const fetchProductSuggestions = async () => {
      if (filters.product.length >= 1) {
        const suggestions = await getProductSuggestions(filters.product);
        setProductSuggestions(suggestions);
        setShowProductSuggestions(suggestions.length > 0);
      } else {
        setProductSuggestions([]);
        setShowProductSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchProductSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [filters.product]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyInputRef.current && !companyInputRef.current.contains(event.target as Node)) {
        setShowCompanySuggestions(false);
      }
      if (productInputRef.current && !productInputRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showModal) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleSearch = async () => {
    if (!filters.company && !filters.product && !filters.dateFrom && !filters.dateTo) {
      setError('Please enter at least one search criteria');
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const results = await searchSheets(filters);
      setSearchResults(results);
      setExpandedSheets(new Set()); // Reset expanded state
    } catch (err) {
      setError('Failed to search records. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setFilters({
      company: '',
      product: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchResults(null);
    setExpandedSheets(new Set());
    setError(null);
  };

  const toggleSheetExpansion = (sheetName: string) => {
    setExpandedSheets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sheetName)) {
        newSet.delete(sheetName);
      } else {
        newSet.add(sheetName);
      }
      return newSet;
    });
  };

  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleCompanySuggestionClick = (suggestion: string) => {
    setFilters(prev => ({ ...prev, company: suggestion }));
    setShowCompanySuggestions(false);
  };

  const handleProductSuggestionClick = (suggestion: string) => {
    setFilters(prev => ({ ...prev, product: suggestion }));
    setShowProductSuggestions(false);
  };

  // Helper function to truncate text and show read more
  // Helper function to check if a column is an RC number column
  const isRCNumberColumn = (columnName: string) => {
    const rcColumnNames = ['RC_Number', 'RC Number', 'rc_number', 'rc', 'rc_no', 'reference_number'];
    return rcColumnNames.includes(columnName);
  };

  // Helper function to get RC number value from record
  const getRCNumberValue = (record: any) => {
    const rcFields = ['RC_Number', 'RC Number', 'rc_number', 'rc', 'rc_no', 'reference_number'];
    for (const field of rcFields) {
      if (record.data[field]) {
        return record.data[field];
      }
    }
    return null;
  };

  // Helper function to format RC Number with date
  const formatRCNumberWithDate = (record: any, columnName: string) => {
    const rcNumber = record.data[columnName];
    const rcDate = record.rc_date;
    
    if (rcNumber && rcDate) {
      return `${rcNumber} (${rcDate})`;
    } else if (rcNumber) {
      return rcNumber;
    }
    return '';
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text || text.toString().length <= maxLength) {
      return text?.toString() || '';
    }
    
    const truncated = text.toString().substring(0, maxLength);
    // Try to find the last space to avoid cutting words in half
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) { // Only use word boundary if it's not too far back
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  };

  const openModal = (title: string, content: string) => {
    setModalContent({ title, content });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const renderCellContent = (value: any, header: string) => {
    const textValue = value?.toString() || '';
    const maxLength = 80; // Reduced for better UX
    
    if (textValue.length <= maxLength) {
      return <span className="break-words">{textValue}</span>;
    }
    
    return (
      <div className="flex flex-col gap-1">
        <span className="break-words">{truncateText(textValue, maxLength)}</span>
        <button
          onClick={() => openModal(header, textValue)}
          className="text-indigo-400 hover:text-indigo-300 text-xs font-medium self-start hover:underline transition-colors"
        >
          Read More
        </button>
      </div>
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-6xl mx-auto text-gray-200">
      {/* Search Form */}
      <div className="bg-gray-800/50 p-6 rounded-lg mb-8 border border-gray-700">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">Search All Records Across All Sheets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
              Company Name
            </label>
            <div ref={companyInputRef}>
              <input
                id="company"
                type="text"
                value={filters.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => filters.company.length >= 1 && companySuggestions.length > 0 && setShowCompanySuggestions(true)}
                placeholder="Enter company name..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-400"
                autoComplete="off"
              />
              {showCompanySuggestions && companySuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {companySuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-gray-200 text-sm"
                      onClick={() => handleCompanySuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <label htmlFor="product" className="block text-sm font-medium text-gray-300 mb-2">
              Product Name
            </label>
            <div ref={productInputRef}>
              <input
                id="product"
                type="text"
                value={filters.product}
                onChange={(e) => handleInputChange('product', e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => filters.product.length >= 1 && productSuggestions.length > 0 && setShowProductSuggestions(true)}
                placeholder="Enter product keyword..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-400"
                autoComplete="off"
              />
              {showProductSuggestions && productSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {productSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-600 text-gray-200 text-sm"
                      onClick={() => handleProductSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-300 mb-2">
              Date From
            </label>
            <input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-300 mb-2">
              Date To
            </label>
            <input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              {isSearching ? 'Searching All Sheets...' : 'Click to Search'}
            </button>
            <button
              onClick={handleReset}
              disabled={isSearching}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              Reset Filters
            </button>
          </div>
          <div className="text-sm text-gray-400">
            💡 Use date range to filter records between specific dates
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Search Summary */}
      {searchResults && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-green-300 mb-2">Search Results Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-400 font-medium">Total Records Found: </span>
              <span className="text-green-200 text-lg font-bold">{searchResults.summary.total_records}</span>
            </div>
            <div>
              <span className="text-green-400 font-medium">Search Criteria: </span>
              <span className="text-green-200">
                {[
                  searchResults.summary.search_criteria.company && `Company: "${searchResults.summary.search_criteria.company}"`,
                  searchResults.summary.search_criteria.product && `Product: "${searchResults.summary.search_criteria.product}"`,
                  searchResults.summary.search_criteria.date_range && `Date Range: ${searchResults.summary.search_criteria.date_range}`
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
          {searchResults.summary.search_criteria.rc_numbers_found && searchResults.summary.search_criteria.rc_numbers_found.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-500/30">
              <span className="text-green-400 font-medium">RC Numbers Found from Date Range: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {searchResults.summary.search_criteria.rc_numbers_found.map((rc, index) => (
                  <span key={index} className="bg-green-800/40 text-green-200 px-2 py-1 rounded text-xs">
                    {rc}
                  </span>
                ))}
              </div>
              <p className="text-green-300/80 text-xs mt-1">
                Showing all records matching these RC numbers across all sheets
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      {searchResults && searchResults.results.length > 0 && (
        <div className="space-y-4">
          
          {searchResults.results.map((result, index) => (
            <div key={`${result.sheet_name}-${index}`} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30">
              {/* Sheet Card Header */}
              <div className="bg-gray-800/50 p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-200">
                      {result.annexure && result.title ? 
                        `${result.annexure} | ${result.title}` : 
                        result.sheet_name
                      }
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {result.total_matches} matching record{result.total_matches !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSheetExpansion(result.sheet_name)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 px-4 rounded-md transition-colors flex items-center"
                  >
                    <span className="text-xl mr-2">{expandedSheets.has(result.sheet_name) ? '−' : '+'}</span>
                    {expandedSheets.has(result.sheet_name) ? 'Hide Records' : 'Show Records'}
                  </button>
                </div>
              </div>

              {/* Expanded Data - ALL MATCHING RECORDS */}
              {expandedSheets.has(result.sheet_name) && (
                <div className="bg-gray-800/20 p-4">
                  <h4 className="text-md font-medium text-gray-300 mb-3">
                    All Matching Records ({result.total_matches})
                  </h4>
                  {result.records.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-gray-800/30 border border-gray-700 rounded-md table-fixed">
                        <thead className="bg-gray-700/50">
                          <tr>
                            {result.records.length > 0 && (() => {
                              // Use the original column order from the Excel file
                              const orderedColumns = result.headers || Object.keys(result.records[0].data || {});
                              
                              return orderedColumns.map((columnName, index) => (
                                <th key={index} className="px-4 py-2 text-left text-sm font-medium text-gray-300 border-b border-gray-600 min-w-[150px] max-w-[300px]">
                                  {isRCNumberColumn(columnName) ? 'RC Number (Date)' : columnName}
                                </th>
                              ));
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          {result.records.map((record, recordIndex) => {
                            // Use the original column order from the Excel file
                            const orderedColumns = result.headers || Object.keys(record.data || {});
                            
                            // Debug: Log record structure to see what's available
                            if (recordIndex === 0) {
                              console.log('Record structure:', record);
                              console.log('Available data fields:', Object.keys(record.data || {}));
                              console.log('Original column order:', result.headers);
                              console.log('date_value:', record.date_value);
                              console.log('RC Number value:', record.data['RC Number']);
                              console.log('rc_date:', record.rc_date);
                            }
                            
                            return (
                              <tr key={recordIndex} className={recordIndex % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/40'}>
                                {orderedColumns.map((columnName, cellIndex) => {
                                  let cellValue;
                                  
                                  // If this is an RC number column, combine it with the date
                                  if (isRCNumberColumn(columnName)) {
                                    cellValue = formatRCNumberWithDate(record, columnName);
                                  } else {
                                    cellValue = record.data[columnName] || '';
                                  }
                                  
                                  return (
                                    <td key={cellIndex} className="px-4 py-2 text-sm text-gray-200 border-b border-gray-700 min-w-[150px] max-w-[300px]">
                                      {renderCellContent(cellValue, columnName)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400">No records found.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isSearching && searchResults && searchResults.results.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No records found matching your search criteria across all sheets.
        </div>
      )}

      {/* Modal for full content */}
      {showModal && modalContent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-gray-200">
                {modalContent.title}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                {modalContent.content}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-between p-6 border-t border-gray-700">
              <button
                onClick={() => modalContent && copyToClipboard(modalContent.content)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </button>
              <button
                onClick={closeModal}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
