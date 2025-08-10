import axios from "axios";

export async function openPDF(rc_number: string, page_number: number) {
  try {
  const response = await axios.get("/api/get-pdf", {
      params: { rc_number, page_number },
    });
    const { pdf_url, page_number: page } = response.data;
    if (pdf_url) {
      // Use backend server for PDFs in development
      const isDev = window.location.hostname === "localhost";
      const backendUrl = isDev ? "http://localhost:3001" : "";
      window.open(backendUrl + pdf_url + "#page=" + page, "_blank");
    } else {
      alert("PDF not found");
    }
  } catch (err) {
    alert("Error opening PDF");
  }
}
