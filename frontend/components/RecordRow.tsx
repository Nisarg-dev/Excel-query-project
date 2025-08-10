import React from "react";
import { openPDF } from "../services/openPDF";

interface RecordRowProps {
  rc_number: string;
  page_number: number;
}

const RecordRow: React.FC<RecordRowProps> = ({ rc_number, page_number }) => {
  return (
    <tr>
      {/* ...other record columns... */}
      <td>
        <button
          onClick={() => openPDF(rc_number, page_number)}
          className="bg-primary text-surface px-2 py-1 rounded border border-primary text-xs font-medium shadow-sm hover:bg-primaryDark transition-all duration-150"
        >
          PDF
        </button>
      </td>
    </tr>
  );
};

export default RecordRow;
