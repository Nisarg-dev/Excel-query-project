import React from 'react';
import SearchComponent from './components/SearchComponent';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Excel Data Query Tool</h1>
          <p className="text-gray-300">Search and analyze your Excel data</p>
        </header>

        {/* Search Component */}
        <SearchComponent />
      </div>
    </div>
  );
}

export default App;
