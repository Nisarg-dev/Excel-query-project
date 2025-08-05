
import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './icons';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isProcessing, error }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | null | undefined) => {
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx'))) {
      onFileUpload(file);
    } else if (file) {
      alert('Please upload a valid Excel file (.xlsx).');
    }
  }, [onFileUpload]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragging ? 'border-indigo-400 bg-gray-800/60' : 'border-gray-600 hover:border-gray-500'}`}
      >
        <UploadCloudIcon className="w-16 h-16 text-gray-500 mb-4" />
        <p className="text-gray-400 mb-2">Drag & drop your .xlsx file here</p>
        <p className="text-gray-500 text-sm mb-4">or</p>
        <input type="file" id="file-upload" className="hidden" accept=".xlsx" onChange={handleFileChange} disabled={isProcessing} />
        <label htmlFor="file-upload" className="cursor-pointer px-6 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition-colors">
          Browse File
        </label>
        {isProcessing && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center rounded-lg">
            <div className="w-16 h-16 border-4 border-t-transparent border-blue-400 rounded-full animate-spin"></div>
            <p className="mt-4 text-lg">Processing your file...</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-md text-center">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
