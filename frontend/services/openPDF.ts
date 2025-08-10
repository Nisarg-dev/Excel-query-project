import axios from "axios";

export async function openPDF(rc_number: string, page_number: number) {
  try {
    console.log(`Requesting PDF for RC: ${rc_number}, Page: ${page_number}`);
    
    const response = await axios.get("/api/get-pdf", {
      params: { rc_number, page_number },
    });
    
    console.log("API response:", response.data);
    
    const { pdf_url, page_number: page } = response.data;
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
    console.error("Error response:", err.response?.data);
    
    let errorMessage = "Error opening PDF";
    if (err.response?.status === 404) {
      errorMessage = `PDF not found: ${err.response?.data?.error || err.message}`;
    } else if (err.response?.data?.error) {
      errorMessage = `Error: ${err.response.data.error}`;
    } else {
      errorMessage = `Error: ${err.message}`;
    }
    
    alert(errorMessage);
  }
}
