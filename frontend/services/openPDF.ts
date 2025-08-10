// Use the same API base URL pattern as mockApi.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function openPDF(rc_number: string, page_number: number) {
  try {
    console.log(`Requesting PDF for RC: ${rc_number}, Page: ${page_number}`);
    console.log('Using API_BASE_URL:', API_BASE_URL);
    
    // Use fetch instead of axios to match the working API calls
    const url = `${API_BASE_URL}/get-pdf?rc_number=${encodeURIComponent(rc_number)}&page_number=${page_number}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API response:", data);
    
    const { pdf_url, page_number: page } = data;
    if (pdf_url) {
      // Use the same API base URL to construct PDF URL
      const apiBaseUrl = API_BASE_URL.replace('/api', ''); // Remove /api suffix
      const pdfUrl = apiBaseUrl + pdf_url + "#page=" + page;
      
      console.log("Opening PDF from:", pdfUrl);
      
      // First, check if the PDF file exists by making a HEAD request
      try {
        const checkResponse = await fetch(pdfUrl, { method: 'HEAD' });
        if (!checkResponse.ok) {
          throw new Error(`PDF file not accessible (${checkResponse.status})`);
        }
        
        // Try to open the PDF
        const newWindow = window.open(pdfUrl, "_blank");
        
        if (!newWindow) {
          // If popup was blocked, show the URL to user
          alert(`Please open this URL manually: ${pdfUrl}`);
        }
      } catch (pdfError) {
        console.error("PDF accessibility check failed:", pdfError);
        alert(`PDF file not found or not accessible at: ${pdfUrl}\n\nThis usually means the PDF hasn't been uploaded to the deployed backend yet.`);
      }
    } else {
      alert("PDF URL not found in response");
    }
  } catch (err: any) {
    console.error("Error opening PDF:", err);
    
    let errorMessage = "Error opening PDF";
    if (err.message.includes('404')) {
      errorMessage = `PDF not found in database. RC Number: ${rc_number}\n\nThis usually means:\n1. The PDF hasn't been uploaded yet\n2. The RC number doesn't match exactly\n\nAPI URL tried: ${API_BASE_URL}/get-pdf`;
    } else if (err.message.includes('PDF file not accessible')) {
      errorMessage = `PDF exists in database but file is not accessible on server.\n\nThis usually means the PDF file wasn't uploaded to the deployed backend.\n\nError: ${err.message}`;
    } else {
      errorMessage = `Error: ${err.message}`;
    }
    
    alert(errorMessage);
  }
}
