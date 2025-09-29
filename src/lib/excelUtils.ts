import ExcelJS from 'exceljs';

// Excel utility functions to replace xlsx library
export class ExcelUtils {
  // Create a new workbook
  static createWorkbook(): ExcelJS.Workbook {
    return new ExcelJS.Workbook();
  }

  // Add a worksheet with data (optimized for large datasets)
  static addWorksheet(workbook: ExcelJS.Workbook, data: any[], sheetName: string): void {
    const worksheet = workbook.addWorksheet(sheetName);
    
    if (data.length === 0) return;

    // Get headers from first row
    const headers = Object.keys(data[0]);
    
    // Add headers
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // For very large datasets, process in chunks to prevent memory issues
    const CHUNK_SIZE = 10000;
    if (data.length > CHUNK_SIZE) {
      console.log(`Processing large dataset (${data.length} rows) in chunks of ${CHUNK_SIZE}...`);
      
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const rows = chunk.map(row => headers.map(header => row[header] || ''));
        worksheet.addRows(rows);
        
        // Log progress for very large datasets
        if (i % (CHUNK_SIZE * 5) === 0) {
          console.log(`Processed ${i + chunk.length} of ${data.length} rows...`);
        }
      }
    } else {
      // For smaller datasets, process normally
      data.forEach(row => {
        const values = headers.map(header => row[header] || '');
        worksheet.addRow(values);
      });
    }

    // Auto-fit columns (but limit width for performance)
    worksheet.columns.forEach(column => {
      column.width = Math.min(column.width || 15, 30); // Cap at 30 characters
    });
  }

  // Read Excel file and convert to JSON
  static async readExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data);
          
          const worksheet = workbook.worksheets[0];
          const jsonData: any[] = [];
          
          if (!worksheet) {
            resolve([]);
            return;
          }

          // Get headers from first row
          const headerRow = worksheet.getRow(1);
          const headers: string[] = [];
          
          headerRow.eachCell((cell, colNumber) => {
            headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
          });

          // Convert rows to objects
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row
            
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber - 1];
              if (header) {
                rowData[header] = cell.value;
              }
            });
            
            // Only add row if it has data
            if (Object.keys(rowData).length > 0) {
              jsonData.push(rowData);
            }
          });

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Download workbook as Excel file
  static async downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading workbook:', error);
      throw error;
    }
  }

  // Convert JSON to Excel and download
  static async exportToExcel(data: any[], fileName: string, sheetName: string = 'Data'): Promise<void> {
    const workbook = this.createWorkbook();
    this.addWorksheet(workbook, data, sheetName);
    await this.downloadWorkbook(workbook, fileName);
  }

  // Export multiple sheets to Excel with chunking for large datasets
  static async exportMultipleSheets(
    sheets: { name: string; data: any[] }[], 
    fileName: string
  ): Promise<void> {
    const workbook = this.createWorkbook();
    const MAX_ROWS_PER_SHEET = 100000; // Excel limit is around 1M rows, but we'll use 100K for performance
    const usedNames = new Set<string>();
    
    // Helper function to make sheet names unique
    const makeUniqueName = (baseName: string): string => {
      let uniqueName = baseName;
      let counter = 1;
      
      // Excel sheet names have a 31 character limit
      if (uniqueName.length > 31) {
        uniqueName = uniqueName.substring(0, 31);
      }
      
      while (usedNames.has(uniqueName)) {
        const suffix = `_${counter}`;
        const maxLength = 31 - suffix.length;
        uniqueName = baseName.substring(0, maxLength) + suffix;
        counter++;
      }
      
      usedNames.add(uniqueName);
      return uniqueName;
    };
    
    sheets.forEach(sheet => {
      if (sheet.data.length > MAX_ROWS_PER_SHEET) {
        // Split large datasets into multiple sheets
        const chunks = this.chunkArray(sheet.data, MAX_ROWS_PER_SHEET);
        chunks.forEach((chunk, index) => {
          const baseName = chunks.length > 1 ? `${sheet.name}_${index + 1}` : sheet.name;
          const uniqueName = makeUniqueName(baseName);
          this.addWorksheet(workbook, chunk, uniqueName);
        });
      } else {
        const uniqueName = makeUniqueName(sheet.name);
        this.addWorksheet(workbook, sheet.data, uniqueName);
      }
    });
    
    await this.downloadWorkbook(workbook, fileName);
  }

  // Helper function to chunk large arrays
  static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
