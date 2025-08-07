
export type Row = Record<string, any>;

export interface ExcelData {
  sheetNames: string[];
  data: Record<string, Row[]>;
}
