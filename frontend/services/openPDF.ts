import axios from "axios";

export async function openPDF(rc_number: string, page_number: number) {
  try {
    const response = await axios.get("/api/get-pdf", {
      params: { rc_number, page_number },
    });
    const { pdf_url, page_number: page } = response.data;
    if (pdf_url) {
      // Determine the correct backend URL
      const isDev = window.location.hostname === "localhost";
      let backendUrl = "";
      
      if (isDev) {
        // In development, use localhost
        backendUrl = "http://localhost:3001";
      } else {
        // In production, use the actual backend domain
        backendUrl = "https://excelbackend-j12b.onrender.com";
      }
      
      const pdfUrl = backendUrl + pdf_url + "#page=" + page;
      console.log("Opening PDF from:", pdfUrl);
      window.open(pdfUrl, "_blank");
    } else {
      alert("PDF not found");
    }
  } catch (err) {
    console.error("Error opening PDF:", err);
    alert("Error opening PDF: " + (err as any).message);
  }
}
