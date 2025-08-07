/**
 * Utility function to format RC numbers with their meeting dates
 */

export interface RcDatesMap {
  [key: string]: string;
}

/**
 * Formats an RC number with its corresponding meeting date if available
 * @param value - The original cell value (RC number)
 * @param columnName - The column name to determine if it's an RC column
 * @param rcDatesMap - Mapping of RC numbers to their meeting dates
 * @param record - The full record data for fallback date lookups
 * @returns Formatted string with RC number and date
 */
export const formatRcWithDate = (
  value: any,
  columnName: string,
  rcDatesMap: RcDatesMap = {},
  record?: any
): string => {
  if (!value) return '';

  const cellValue = String(value);
  
  // Check if this is an RC column
  const isRcColumn = columnName.toLowerCase().includes('rc') || 
                    columnName.toLowerCase() === 'rc_number' || 
                    columnName.toLowerCase() === 'rc number';

  if (!isRcColumn) return cellValue;

  // Check if the value already has a date embedded (format: "463 (09.04.25)")
  if (cellValue.includes('(') && cellValue.includes(')')) {
    return cellValue; // Already formatted, return as-is
  }

  // Extract the RC number (remove any ordinal suffixes like "rd", "th", etc.)
  const rcNumber = cellValue.toString().replace(/[^\d]/g, '');
  
  // Look for the date in the RC dates mapping first, then fallback to record data
  let rcDate = rcDatesMap[cellValue.toString().trim()] || 
              rcDatesMap[rcNumber] ||
              '';
              
  // If no date found in mapping and record is provided, check record for dates
  if (!rcDate && record) {
    rcDate = record.date_value || 
            record.data?.['Meeting_held_on_date'] ||
            record.data?.['Meeting held on date'] || 
            record.data?.['meeting held on date'] || 
            record.data?.['Date'] || 
            record.data?.['date'] || 
            '';
  }
  
  // Return formatted value
  if (rcDate) {
    return `${cellValue} (${rcDate})`;
  }
  
  return cellValue;
};

/**
 * Checks if a column name represents an RC number column
 * @param columnName - The column name to check
 * @returns true if it's an RC column
 */
export const isRcColumn = (columnName: string): boolean => {
  const lowerColumnName = columnName.toLowerCase();
  return lowerColumnName.includes('rc') || 
         lowerColumnName === 'rc_number' || 
         lowerColumnName === 'rc number';
};
