
import React from 'react';
import { Row, SortConfig } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

interface DataTableProps {
  data: Row[];
  columns: string[];
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
}

const DataTable: React.FC<DataTableProps> = ({ data, columns, sortConfig, onSort }) => {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700 text-center">
        <p className="text-gray-400">No data to display.</p>
        <p className="text-gray-500 text-sm">Try changing your filters or selecting a different sheet.</p>
      </div>
    );
  }

  const renderCell = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-500 italic">null</span>;
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    return String(value);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                <tr>
                    {columns.map(col => (
                    <th
                        key={col}
                        onClick={() => onSort(col)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                        {col}
                        {sortConfig?.key === col ? (
                            sortConfig.direction === 'ascending' ? (
                            <ArrowUpIcon className="w-4 h-4" />
                            ) : (
                            <ArrowDownIcon className="w-4 h-4" />
                            )
                        ) : null}
                        </div>
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody className="bg-gray-800/60 divide-y divide-gray-700">
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-700/50 transition-colors">
                    {columns.map(col => (
                        <td key={`${rowIndex}-${col}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {renderCell(row[col])}
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default DataTable;
