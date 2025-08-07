# RC Date Enhancement - Implementation Notes

## Overview
This enhancement automatically appends meeting dates from the "List_of_RC" sheet to RC numbers across all sheets during Excel file upload.

## How It Works

### 1. During Excel Upload (Backend)
When an Excel file is uploaded, the system now performs a 3-pass process:

#### Pass 1: Parse Excel Data
- Reads all sheets and converts them to JSON format
- Stores raw data in memory

#### Pass 2: Build RC Date Mapping
- Looks for a sheet named "List_of_RC" (case-insensitive variations supported)
- Extracts RC numbers and their corresponding meeting dates
- Creates a mapping: `{ "463": "09.04.25", "464": "10.06.25", ... }`

#### Pass 3: Apply RC Date Mapping
- For every record in every sheet:
  - Identifies RC columns (columns containing "rc", "RC_Number", "RC Number", etc.)
  - Looks up the RC number in the date mapping
  - Updates the value from "463" to "463 (09.04.25)"

### 2. Supported Column Names

#### List_of_RC Sheet
The system looks for these column combinations:
- RC number: `RC_Number`, `RC Number`, `rc_number`, `rc number`, `RC`, `rc`, `Reference_Number`, `reference_number`, `RC_No`, `rc_no`
- Meeting date: `Meeting_Held_On_Date`, `Meeting Held On Date`, `meeting_held_on_date`, `Meeting_Date`, `Meeting Date`, `meeting_date`, `Date`, `date`

#### Other Sheets
Any column containing "rc" or matching patterns like:
- `RC_Number`, `RC Number`, `rc_number`, `rc number`

### 3. Data Transformation Examples

#### Before:
```json
{
  "Company": "ABC Corp",
  "RC_Number": "463",
  "Product": "Product A"
}
```

#### After:
```json
{
  "Company": "ABC Corp", 
  "RC_Number": "463 (09.04.25)",
  "Product": "Product A"
}
```

## Frontend Changes

### Updated RC Formatter Utility
The `formatRcWithDate` function now includes logic to:
- Detect if RC numbers already have dates embedded (format: "463 (09.04.25)")
- Avoid double-formatting already processed values
- Maintain backward compatibility with existing data

## Error Handling

### Missing List_of_RC Sheet
- If no "List_of_RC" sheet is found, the system logs a warning
- RC numbers remain unchanged (original format)
- Upload process continues normally

### Missing RC or Date Data
- If RC number or meeting date is missing in List_of_RC, the entry is skipped
- Logs detailed information for debugging
- Other valid entries are still processed

### RC Numbers Not Found
- If an RC number in other sheets doesn't exist in List_of_RC mapping
- The original RC number is preserved
- Warning is logged for debugging

## Benefits

1. **Automatic Processing**: No manual intervention required
2. **Cross-Sheet Consistency**: All RC numbers get dates if available
3. **Data Integrity**: Original data structure preserved
4. **Backward Compatibility**: Works with existing data and UI
5. **Flexible Matching**: Handles various column name formats
6. **Error Resilient**: Graceful handling of missing data

## Database Impact

- No schema changes required
- RC numbers with dates are stored as formatted strings
- Search functionality remains intact
- Existing queries continue to work

## Testing

The implementation has been tested with sample data showing:
- ✅ Correct identification of List_of_RC sheet
- ✅ Successful RC-to-date mapping
- ✅ Proper application across multiple sheets
- ✅ Handling of different column name variations
- ✅ Graceful error handling for missing data

## Usage Instructions

1. Ensure your Excel file has a sheet named "List_of_RC" (or similar)
2. This sheet should contain RC numbers and their meeting dates
3. Upload the Excel file as normal
4. RC numbers in all sheets will automatically include dates where matches are found

The format will be: `{RC_Number} ({Meeting_Date})` (e.g., "463 (09.04.25)")
- Refactored existing RC formatting logic to use the new utility function
- Maintained all existing functionality while improving code consistency
- Removed duplicate code and centralized RC formatting logic

### 4. Updated App Component (`frontend/App.tsx`)
- Added `getRcDates` import for RC dates fetching
- Added `rcDatesMap` state to store RC number to date mappings
- Added useEffect to load RC dates on component mount
- Ready to pass `rcDatesMap` to DataTable when needed

## How It Works

1. **Data Loading**: RC numbers and their corresponding meeting dates are fetched from the "List_of_RC" sheet via the `/api/data/rc-dates` endpoint
2. **Format Logic**: When displaying any RC column, the system:
   - Identifies RC columns by name patterns (rc, rc_number, RC Number, etc.)
   - Looks up the meeting date for the RC number
   - Displays the data in format: "RC_NUMBER (MEETING_DATE)"
3. **Fallback**: If no meeting date is found in the main mapping, it checks the record data for date fields

## Display Format

RC numbers are now consistently shown as:
```
RC_NUMBER (MEETING_DATE)
```

Example:
```
123 (15.03.2024)
456rd (22.05.2024)
789th (10.12.2024)
```

## Benefits

1. **Consistency**: All RC numbers across the application show with their meeting dates
2. **Maintainability**: Centralized formatting logic in utility function
3. **Flexibility**: Supports multiple RC column naming conventions
4. **Fallback Support**: Multiple sources for finding meeting dates
5. **Performance**: Efficient lookup using mapping object

## Technical Notes

- The RC dates mapping is loaded once on application startup
- The formatting is applied client-side for optimal performance
- The utility function is reusable across all components
- Backwards compatible with existing data structures
