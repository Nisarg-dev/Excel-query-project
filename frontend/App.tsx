import React from 'react';
import SearchComponent from './components/SearchComponent';
import PDFUpload from './components/PDFUpload';
import ExcelUpload from './components/ExcelUpload';

function App() {
  return (
    <div className="min-h-screen bg-background text-textPrimary">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-textPrimary mb-2">Indian Agrochemical Registration Committee Updates</h1>
        </header>

        {/* Excel Upload Section (hidden) */}
        {/* <div className="mb-8">
          <ExcelUpload />
        </div> */}

        {/* PDF Upload Component (hidden) */}
        {/* <PDFUpload /> */}

        {/* Search Component */}
        <SearchComponent />
      </div>
    </div>
  );
}

export default App;
