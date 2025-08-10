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
      // Always use the production backend URL since API is working
      const backendUrl = "https://excelbackend-j12b.onrender.com";
      const pdfUrl = backendUrl + pdf_url + "#page=" + page;
      
      console.log("Opening PDF from:", pdfUrl);
      
      // Try to open the PDF
      const newWindow = window.open(pdfUrl, "_blank");
      
      if (!newWindow) {
        // If popup was blocked, show the URL to user
        alert(`Please open this URL manually: ${pdfUrl}`);
      }
    } else {
      alert("PDF URL not found in response");
    }
  } catch (err: any) {
    console.error("Error opening PDF:", err);
    
    let errorMessage = "Error opening PDF";
    if (err.message.includes('404')) {
      errorMessage = `PDF API not found (404). URL tried: ${API_BASE_URL}/get-pdf`;
    } else {
      errorMessage = `Error: ${err.message}`;
    }
    
    alert(errorMessage);
  }
}
