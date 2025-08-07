const XLSX = require('xlsx');
const fs = require('fs');

// Helper function to check if a column name represents an RC number column
function isRcColumn(columnName) {
  const lowerColumnName = columnName.toLowerCase();
  return lowerColumnName.includes('rc') || 
         lowerColumnName === 'rc_number' || 
         lowerColumnName === 'rc number';
}

// Create test Excel data
const testData = {
  'List_of_RC': [
    ['RC_Number', 'Meeting_Held_On_Date'],
    ['463', '09.04.25'],
    ['464', '10.06.25'],
    ['465', '15.07.25']
  ],
  'Sheet1': [
    ['Company', 'RC_Number', 'Product'],
    ['ABC Corp', '463', 'Product A'],
    ['XYZ Ltd', '464', 'Product B'],
    ['DEF Inc', '465', 'Product C']
  ],
  'Sheet2': [
    ['Name', 'RC Number', 'Amount'],
    ['John', '463', '100'],
    ['Jane', '464', '200'],
    ['Bob', '465', '300']
  ]
};

console.log('🧪 Testing RC Date Mapping Logic');
console.log('================================\n');

// Simulate the parsing process
const sheetNames = Object.keys(testData);
const parsedData = { sheetNames, data: {} };

// First pass: Convert array data to object format (simulating XLSX parsing)
for (const sheetName of sheetNames) {
  const sheetData = testData[sheetName];
  if (sheetData.length < 2) {
    parsedData.data[sheetName] = [];
    continue;
  }

  const headers = sheetData[0];
  const rows = sheetData.slice(1).map(rowArray => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = rowArray[index];
    });
    return row;
  });

  parsedData.data[sheetName] = rows;
}

console.log('📋 Parsed Data Structure:');
console.log(JSON.stringify(parsedData.data, null, 2));
console.log('\n');

// Second pass: Build RC dates mapping from List_of_RC sheet
console.log('📅 Building RC dates mapping from List_of_RC sheet...');
const rcDatesMap = {};

const listOfRcSheetName = sheetNames.find(name => 
  name.toLowerCase().includes('list') && name.toLowerCase().includes('rc') ||
  name.toLowerCase() === 'list_of_rc' ||
  name.toLowerCase() === 'list of rc'
);

if (listOfRcSheetName && parsedData.data[listOfRcSheetName]) {
  console.log(`✅ Found List_of_RC sheet: "${listOfRcSheetName}"`);
  
  const listOfRcData = parsedData.data[listOfRcSheetName];
  listOfRcData.forEach((row, index) => {
    const rcNumber = row['RC_Number'] || row['RC Number'] || row['rc_number'] || row['rc number'] || 
                    row['RC'] || row['rc'] || row['Reference_Number'] || row['reference_number'] ||
                    row['RC_No'] || row['rc_no'];
    
    const meetingDate = row['Meeting_Held_On_Date'] || row['Meeting Held On Date'] || row['meeting_held_on_date'] ||
                       row['Meeting_Date'] || row['Meeting Date'] || row['meeting_date'] ||
                       row['Date'] || row['date'] || row['Meeting Date '] || row['meeting date'];
    
    if (rcNumber && meetingDate) {
      const rcKey = rcNumber.toString().trim();
      const dateValue = meetingDate.toString().trim();
      
      rcDatesMap[rcKey] = dateValue;
      
      const numericRc = rcKey.replace(/[^\d]/g, '');
      if (numericRc && numericRc !== rcKey) {
        rcDatesMap[numericRc] = dateValue;
      }
      
      console.log(`📋 Mapped RC "${rcKey}" -> "${dateValue}" (Row ${index + 2})`);
    }
  });
  
  console.log(`📊 Built RC dates mapping with ${Object.keys(rcDatesMap).length} entries`);
  console.log('RC Dates Map:', rcDatesMap);
} else {
  console.log('⚠️ No List_of_RC sheet found');
}

console.log('\n');

// Third pass: Apply RC date mapping to all sheets
console.log('🔄 Applying RC dates to all records...');
for (const sheetName of sheetNames) {
  if (parsedData.data[sheetName]) {
    console.log(`\n📄 Processing sheet: ${sheetName}`);
    
    parsedData.data[sheetName] = parsedData.data[sheetName].map((row, rowIndex) => {
      const updatedRow = { ...row };
      
      Object.keys(updatedRow).forEach(columnName => {
        if (isRcColumn(columnName) && updatedRow[columnName]) {
          const originalRc = updatedRow[columnName].toString().trim();
          const rcNumber = originalRc.replace(/[^\d]/g, '');
          
          const matchingDate = rcDatesMap[originalRc] || rcDatesMap[rcNumber];
          
          if (matchingDate) {
            const newValue = `${originalRc} (${matchingDate})`;
            console.log(`  🔗 Row ${rowIndex + 1}, ${columnName}: "${originalRc}" -> "${newValue}"`);
            updatedRow[columnName] = newValue;
          } else {
            console.log(`  ⚠️ Row ${rowIndex + 1}, ${columnName}: No date found for RC "${originalRc}"`);
          }
        }
      });
      
      return updatedRow;
    });
  }
}

console.log('\n📊 Final Result:');
console.log('================');
for (const sheetName of sheetNames) {
  if (parsedData.data[sheetName] && parsedData.data[sheetName].length > 0) {
    console.log(`\n📄 ${sheetName}:`);
    parsedData.data[sheetName].forEach((row, index) => {
      console.log(`  Row ${index + 1}:`, row);
    });
  }
}

console.log('\n✅ Test completed successfully!');
