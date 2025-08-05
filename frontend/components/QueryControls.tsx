
import React from 'react';
import { Filter } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface QueryControlsProps {
  sheets: string[];
  selectedSheet: string;
  onSheetChange: (sheetName: string) => void;
  columns: string[];
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
}

const QueryControls: React.FC<QueryControlsProps> = ({ sheets, selectedSheet, onSheetChange, columns, filters, onFiltersChange }) => {
    
  const addFilter = () => {
    if (columns.length > 0) {
      onFiltersChange([...filters, { id: Date.now().toString(), column: columns[0], value: '' }]);
    }
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };
  
  const updateFilter = (id: string, newFilter: Partial<Filter>) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...newFilter } : f));
  };

  return (
    <div className="space-y-4 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sheet Selector */}
        <div>
          <label htmlFor="sheet-select" className="block text-sm font-medium text-gray-400 mb-1">
            Select Sheet / Table
          </label>
          <div className="relative">
            <select
              id="sheet-select"
              value={selectedSheet}
              onChange={(e) => onSheetChange(e.target.value)}
              className="w-full appearance-none bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sheets.map(sheet => (
                <option key={sheet} value={sheet}>{sheet}</option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 w-8 h-full" />
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="space-y-3 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-300">Filters</h3>
            <button onClick={addFilter} disabled={columns.length === 0} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
            + Add Filter
            </button>
        </div>
        {filters.length === 0 && <p className="text-gray-500 text-sm">No filters applied. Click "Add Filter" to begin.</p>}
        <div className="space-y-3">
          {filters.map((filter) => (
            <div key={filter.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="relative md:col-span-5">
                <select 
                  value={filter.column}
                  onChange={(e) => updateFilter(filter.id, { column: e.target.value })}
                  className="w-full appearance-none bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 w-8 h-full" />
              </div>
              <div className="text-center text-gray-400 md:col-span-1">=</div>
              <div className="md:col-span-5">
                <input
                  type="text"
                  placeholder="Enter value..."
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-1">
                 <button onClick={() => removeFilter(filter.id)} className="w-full px-2 py-2 text-sm text-red-400 hover:bg-red-900/50 rounded-md">
                    &times;
                 </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryControls;
