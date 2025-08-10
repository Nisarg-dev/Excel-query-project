import React, { useState } from "react";
import axios from "axios";

const PDFUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a PDF file.");
      return;
    }
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("pdf", file);
    try {
      const res = await axios.post("/api/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(res.data.success ? "Upload successful!" : res.data.error || "Upload failed.");
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Error uploading PDF.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-surface p-4 rounded-lg mb-6 flex flex-col items-center border border-surface shadow">
      <h2 className="text-lg text-textPrimary mb-2 font-semibold">Upload PDF (Format: &lt;RCNUMBER&gt;.pdf)</h2>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="mb-2 text-textPrimary"
      />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-primary text-surface px-4 py-1 rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload PDF"}
      </button>
      {message && <div className="mt-2 text-secondary">{message}</div>}
    </div>
  );
};

export default PDFUpload;
