
export type Row = Record<string, any>;

export interface ExcelData {
  sheetNames: string[];
  data: Record<string, Row[]>;
}

export interface SortConfig {
  key: string;
  direction: 'ascending' | 'descending';
}

export interface Filter {
  id: string;
  column: string;
  value: string;
}
