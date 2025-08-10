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

  // Helper function to check if a column is a page number column
  const isPageNumberColumn = (columnName: string) => {
    const pageColumnNames = ['page_number', 'Page No', 'Page_No', 'PageNo', 'page', 'Page', 'Page Number', 'page_no'];
    return pageColumnNames.includes(columnName);
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
  return <span className="break-words text-textPrimary">{textValue}</span>;
    }
    
    return (
  <div className="flex flex-col gap-1 text-textPrimary">
  <span className="break-words text-textPrimary">{truncateText(textValue, maxLength)}</span>
        <button
          onClick={() => openModal(header, textValue)}
          className="text-primary hover:text-primaryDark text-xs font-medium self-start hover:underline transition-colors"
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
  <div className="max-w-6xl mx-auto text-textPrimary">
      {/* Search Form */}
  <div className="bg-surface p-6 rounded-lg mb-8 border-2 border-primary/20 shadow-lg">
  <h2 className="text-xl font-semibold text-textPrimary mb-4">Search All Records Across All Sheets</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <label htmlFor="company" className="block text-sm font-medium text-textPrimary mb-2">
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
                className="w-full px-3 py-2 bg-background border-2 border-primary/30 rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-textPrimary placeholder-textSecondary transition-colors hover:border-primary/50"
                autoComplete="off"
              />
              {showCompanySuggestions && companySuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-surface border-2 border-primary/30 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {companySuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-primary/10 text-textPrimary text-sm"
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
            <label htmlFor="product" className="block text-sm font-medium text-textPrimary mb-2">
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
                className="w-full px-3 py-2 bg-background border-2 border-primary/30 rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-textPrimary placeholder-textSecondary transition-colors hover:border-primary/50"
                autoComplete="off"
              />
              {showProductSuggestions && productSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-surface border-2 border-primary/30 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {productSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-primary/10 text-textPrimary text-sm"
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
            <label htmlFor="dateFrom" className="block text-sm font-medium text-textPrimary mb-2">
              Date From
            </label>
            <input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 bg-background border-2 border-primary/30 rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-textPrimary transition-colors hover:border-primary/50"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-textPrimary mb-2">
              Date To
            </label>
            <input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 bg-background border-2 border-primary/30 rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-textPrimary transition-colors hover:border-primary/50"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className={`font-medium py-2.5 px-5 rounded-md transition-all duration-200 flex items-center gap-2 text-sm ${
                isSearching 
                  ? 'bg-primary/80 text-surface cursor-not-allowed border border-primary/60' 
                  : 'bg-primary/90 hover:bg-primary text-surface border border-primary/50 hover:border-primary shadow-sm hover:shadow'
              }`}
            >
              {isSearching && (
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleReset}
              disabled={isSearching}
              className={`font-medium py-2.5 px-5 rounded-md transition-all duration-200 text-sm border ${
                isSearching 
                  ? 'bg-background/50 text-textSecondary/60 border-textSecondary/20 cursor-not-allowed' 
                  : 'bg-background text-textSecondary border-textSecondary/30 hover:bg-textSecondary/5 hover:border-textSecondary/50 hover:text-textPrimary shadow-sm hover:shadow'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
          <div className="text-sm text-textSecondary bg-background px-3 py-2 rounded-md border border-primary/20">
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
        <div className="bg-surface border-2 border-primary/20 rounded-lg p-6 mb-6 shadow-lg">
          <h3 className="text-xl font-semibold text-textPrimary mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Search Results Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-background p-4 rounded-lg border border-surface">
              <span className="text-textSecondary font-medium">Total Records Found: </span>
              <span className="text-primary text-2xl font-bold block mt-1">{searchResults.summary.total_records}</span>
            </div>
            <div className="bg-background p-4 rounded-lg border border-surface">
              <span className="text-textSecondary font-medium">Search Criteria: </span>
              <div className="text-textPrimary mt-2 space-y-1">
                {[
                  searchResults.summary.search_criteria.company && `Company: "${searchResults.summary.search_criteria.company}"`,
                  searchResults.summary.search_criteria.product && `Product: "${searchResults.summary.search_criteria.product}"`,
                  searchResults.summary.search_criteria.date_range && `Date Range: ${searchResults.summary.search_criteria.date_range}`
                ].filter(Boolean).map((criteria, idx) => (
                  <div key={idx} className="text-sm">{criteria}</div>
                ))}
              </div>
            </div>
          </div>
          {searchResults.summary.search_criteria.rc_numbers_found && searchResults.summary.search_criteria.rc_numbers_found.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface">
              <span className="text-textSecondary font-medium">RC Numbers Found from Date Range: </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {searchResults.summary.search_criteria.rc_numbers_found.map((rc, index) => (
                  <span key={index} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20">
                    {rc}
                  </span>
                ))}
              </div>
              <p className="text-textSecondary text-xs mt-2">
                Showing all records matching these RC numbers across all sheets
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      {searchResults && searchResults.results.length > 0 && (
        <div className="space-y-6">
          
          {searchResults.results.map((result, index) => (
            <div key={`${result.sheet_name}-${index}`} className="border-2 border-primary/20 rounded-xl overflow-hidden bg-surface shadow-lg hover:shadow-xl transition-shadow duration-200">
              {/* Sheet Card Header */}
              <div className=" from-primary/5 to-primary/10 p-6 border-b-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-textPrimary mb-2 flex items-center">
                      {/* <span className="bg-primary text-surface w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </span> */}
                      {result.annexure && result.title ? 
                        `${result.annexure} | ${result.title}` : 
                        result.sheet_name
                      }
                    </h3>
                    <p className="text-textSecondary text-sm flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {result.total_matches} matching record{result.total_matches !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSheetExpansion(result.sheet_name)}
                    className="bg-background hover:bg-primary/5 text-textPrimary border border-primary/30 hover:border-primary/50 font-medium py-2.5 px-4 rounded-md transition-all duration-200 flex items-center text-sm shadow-sm hover:shadow"
                  >
                    <span className="text-base mr-2 text-primary">{expandedSheets.has(result.sheet_name) ? '−' : '+'}</span>
                    {expandedSheets.has(result.sheet_name) ? 'Hide Records' : 'Show Records'}
                  </button>
                </div>
              </div>

              {/* Expanded Data - ALL MATCHING RECORDS */}
              {expandedSheets.has(result.sheet_name) && (
                <div className="bg-background p-6">
                  
                  {result.records.length > 0 ? (
                    <div className="overflow-x-auto border-2 border-primary/10 rounded-lg">
                      <table className="min-w-full bg-surface table-fixed">
                        <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                          <tr className="border-b-2 border-primary/20">
                            {result.records.length > 0 && (() => {
                              // Use the original column order from the Excel file
                              const orderedColumns = result.headers || Object.keys(result.records[0].data || {});
                              
                              return orderedColumns.map((columnName, index) => (
                                <th key={index} className="px-6 py-4 text-left text-sm font-semibold text-textPrimary border-r border-primary/10 min-w-[150px] max-w-[300px] last:border-r-0 bg-gradient-to-b from-primary/5 to-primary/10">
                                  <div className="flex items-center">
                                    <span className="truncate">
                                      {isRCNumberColumn(columnName) ? 'RC Number (Date)' : columnName}
                                    </span>
                                  </div>
                                </th>
                              ));
                            })()}
                          </tr>
                        </thead>
                        <tbody>
                          {result.records.map((record, recordIndex) => {
                            const orderedColumns = result.headers || Object.keys(record.data || {});
                            // Extract RC number from 'RC Number (Date)' value like '395 (20.11.2018)'
                            let raw_rc = '';
                            if (record.data['RC Number']) raw_rc = record.data['RC Number'];
                            else if (record.data['rc_number']) raw_rc = record.data['rc_number'];
                            else if (record.data['RC_Number']) raw_rc = record.data['RC_Number'];
                            else if (record.data['rc']) raw_rc = record.data['rc'];
                            else if (record.data['rc_no']) raw_rc = record.data['rc_no'];
                            else if (record.data['reference_number']) raw_rc = record.data['reference_number'];
                            let rc_number = '';
                            const match = String(raw_rc).match(/(\d+)/);
                            if (match) rc_number = `RC${match[1]}`;
                            const page_number = (record as any).page_number
                              || record.data['page_number']
                              || record.data['Page No']
                              || record.data['Page_No']
                              || record.data['PageNo']
                              || 1;
                            return (
                              <tr key={recordIndex} className={`${recordIndex % 2 === 0 ? 'bg-background' : 'bg-surface'} hover:bg-primary/5 transition-colors duration-150 border-b border-primary/10`}>
                                {orderedColumns.map((columnName, cellIndex) => {
                                  let cellValue;
                                  if (isRCNumberColumn(columnName)) {
                                    cellValue = formatRCNumberWithDate(record, columnName);
                                  } else {
                                    cellValue = record.data[columnName] || '';
                                  }
                                  
                                  // Check if this is a page number column
                                  const isPageCol = isPageNumberColumn(columnName);
                                  const canOpenPDF = rc_number && isPageCol && cellValue;
                                  
                                  return (
                                    <td key={cellIndex} className="px-4 py-3 text-sm text-textPrimary border-r border-primary/5 min-w-[150px] max-w-[300px] last:border-r-0">
                                      <div className="truncate">
                                        {canOpenPDF ? (
                                          <button
                                            onClick={() => {
                                              // @ts-ignore
                                              import('../services/openPDF').then(({ openPDF }) => openPDF(rc_number, page_number));
                                            }}
                                            className="text-primary hover:text-primaryDark hover:bg-primary/10 px-2 py-1 rounded-md transition-all duration-150 cursor-pointer underline decoration-primary/50 hover:decoration-primary font-medium flex items-center gap-1"
                                            title="Click to open PDF at this page"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            {renderCellContent(cellValue, columnName)}
                                          </button>
                                        ) : (
                                          renderCellContent(cellValue, columnName)
                                        )}
                                      </div>
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
                    <p className="text-textSecondary">No records found.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isSearching && searchResults && searchResults.results.length === 0 && (
        <div className="text-center py-8 text-textSecondary">
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
          <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface">
              <h3 className="text-lg font-semibold text-textPrimary">
                {modalContent.title}
              </h3>
              <button
                onClick={closeModal}
                className="text-textSecondary hover:text-textPrimary transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="text-textPrimary whitespace-pre-wrap break-words leading-relaxed">
                {modalContent.content}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-between p-6 border-t border-surface">
              <button
                onClick={() => modalContent && copyToClipboard(modalContent.content)}
                className="bg-primary hover:bg-primaryDark text-surface font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to Clipboard
              </button>
              <button
                onClick={closeModal}
                className="bg-secondary hover:bg-secondaryDark text-textPrimary font-medium py-2 px-4 rounded-md transition-colors"
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
