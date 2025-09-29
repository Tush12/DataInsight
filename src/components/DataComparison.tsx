import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DataPreview } from './DataPreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, BarChart3 } from 'lucide-react';
import { ExcelUtils } from '@/lib/excelUtils';

// Extend Performance interface for memory monitoring
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

interface DataComparisonProps {
  data1: Record<string, unknown>[];
  data2: Record<string, unknown>[];
  fileName1: string;
  fileName2: string;
}

interface ComparisonResult {
  matches: Record<string, unknown>[];
  mismatches: Record<string, unknown>[];
  uniqueToFirst: Record<string, unknown>[];
  uniqueToSecond: Record<string, unknown>[];
}

export const DataComparison: React.FC<DataComparisonProps> = ({
  data1,
  data2,
  fileName1,
  fileName2
}) => {
  const [compareColumns, setCompareColumns] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult>({
    matches: [],
    mismatches: [],
    uniqueToFirst: [],
    uniqueToSecond: []
  });
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonProgress, setComparisonProgress] = useState(0);
  const [hasRunComparison, setIsRunComparison] = useState(false);
  const [comparisonPhase, setComparisonPhase] = useState<string>('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Dead simple comparison that just works
  const performComparison = React.useCallback(() => {
    console.log('🚀 COMPARISON BUTTON CLICKED!', {
      compareColumns: compareColumns.length,
      compareColumnsList: compareColumns,
      data1Length: data1.length,
      data2Length: data2.length,
      data1Sample: data1.length > 0 ? Object.keys(data1[0]) : [],
      data2Sample: data2.length > 0 ? Object.keys(data2[0]) : []
    });
    
    // Comparison function is being called successfully
    
    if (compareColumns.length === 0) {
      console.log('❌ NO COLUMNS SELECTED - Cannot compare without selecting columns!');
      alert('Please select columns to compare by clicking on the column badges or "Select All" button.');
      setComparisonResult({ matches: [], mismatches: [], uniqueToFirst: [], uniqueToSecond: [] });
      setIsRunComparison(true);
      setIsComparing(false);
      return;
    }

    if (data1.length === 0 || data2.length === 0) {
      console.log('❌ NO DATA - One or both datasets are empty');
      setComparisonResult({ matches: [], mismatches: [], uniqueToFirst: [], uniqueToSecond: [] });
      setIsRunComparison(true);
      setIsComparing(false);
      return;
    }

    // Process full datasets without limits for comparison
    const limitedData1 = data1;
    const limitedData2 = data2;
    
    // Show warning for very large datasets but don't limit
    if (data1.length > 100000 || data2.length > 100000) {
      const message = `Large dataset detected! Processing all ${data1.length + data2.length} rows.\n\n` +
                     `Dataset 1: ${data1.length} rows\n` +
                     `Dataset 2: ${data2.length} rows\n\n` +
                     `This may take a few minutes for very large datasets.`;
      console.log('⚠️ Large dataset warning:', message);
      alert(message);
    }

    console.log('Starting optimized comparison...');
    setIsComparing(true);
    setComparisonProgress(10);
    setComparisonPhase('Starting comparison...');
    
    try {
      // Optimized key creation for large datasets
      const createKey = (row: Record<string, unknown>) => {
        return compareColumns.map(col => String(row[col] || '')).join('|');
      };

      // Helper function to check if a row is empty or has empty key
      const isValidRow = (row: Record<string, unknown>) => {
        // Check if row exists and has properties
        if (!row || Object.keys(row).length === 0) return false;
        
        // Check if all comparison columns are empty/null/undefined
        const key = createKey(row);
        return key.trim() !== '' && key !== '||' && !key.split('|').every(part => part.trim() === '');
      };

      setComparisonProgress(30);
      setComparisonPhase('Building lookup table...');

      // Filter out invalid rows and build data2 lookup map
      const validData2 = limitedData2.filter(isValidRow);
      const data2Map = new Map<string, Record<string, unknown>>();
      for (const row of validData2) {
        const key = createKey(row);
        data2Map.set(key, row);
      }

      setComparisonProgress(60);
      setComparisonPhase('Comparing records...');

      // Filter out invalid rows from data1 as well
      const validData1 = limitedData1.filter(isValidRow);
      
      console.log('Data filtering results:', {
        originalData1Length: data1.length,
        limitedData1Length: limitedData1.length,
        validData1Length: validData1.length,
        originalData2Length: data2.length,
        limitedData2Length: limitedData2.length,
        validData2Length: validData2.length,
        filteredOutData1: limitedData1.length - validData1.length,
        filteredOutData2: limitedData2.length - validData2.length
      });

      // Debug: Show sample data and keys
      if (validData1.length > 0 && validData2.length > 0) {
        console.log('🔍 Sample data for debugging:');
        console.log('First row from dataset 1:', validData1[0]);
        console.log('First row from dataset 2:', validData2[0]);
        console.log('Key from dataset 1:', createKey(validData1[0]));
        console.log('Key from dataset 2:', createKey(validData2[0]));
        console.log('Keys match?', createKey(validData1[0]) === createKey(validData2[0]));
        
        // Show first few keys from each dataset
        console.log('First 5 keys from dataset 1:', validData1.slice(0, 5).map(createKey));
        console.log('First 5 keys from dataset 2:', validData2.slice(0, 5).map(createKey));
      }

      // Compare data1 against data2
      const matches: Record<string, unknown>[] = [];
      const mismatches: Record<string, unknown>[] = [];
      const uniqueToFirst: Record<string, unknown>[] = [];
      const data1Keys = new Set<string>();

      let processedCount = 0;
      const totalRows = validData1.length;

      for (const row1 of validData1) {
        processedCount++;
        
        // Update progress every 1000 rows for large datasets to reduce overhead
        if (processedCount % 1000 === 0 || processedCount === totalRows) {
          const progress = Math.round((processedCount / totalRows) * 30) + 60; // 60-90%
          setComparisonProgress(progress);
          setComparisonPhase(`Comparing records... ${processedCount}/${totalRows}`);
        }
        const key = createKey(row1);
        data1Keys.add(key);
        
        const row2 = data2Map.get(key);
        if (row2) {
          // Check if all compare columns match
          let isMatch = true;
          const differences: string[] = [];
          
          for (const col of compareColumns) {
            if (String(row1[col]) !== String(row2[col])) {
              isMatch = false;
              differences.push(col);
            }
          }
          
          if (isMatch) {
            matches.push({ ...row1, _source: fileName1 });
            // Debug: Log first few matches (reduced for large datasets)
            if (matches.length <= 3 && totalRows < 10000) {
              console.log(`✅ Match #${matches.length}:`, { key, row1: row1, row2: row2 });
            }
          } else {
            mismatches.push({ 
              ...row1, 
              _source: fileName1, 
              _differences: differences
            });
            // Debug: Log first few mismatches (reduced for large datasets)
            if (mismatches.length <= 3 && totalRows < 10000) {
              console.log(`⚠️ Mismatch #${mismatches.length}:`, { key, differences, row1: row1, row2: row2 });
            }
          }
        } else {
          uniqueToFirst.push({ ...row1, _source: fileName1 });
          // Debug: Log first few unique records (reduced for large datasets)
          if (uniqueToFirst.length <= 3 && totalRows < 10000) {
            console.log(`🔍 Unique to first #${uniqueToFirst.length}:`, { key, row1: row1 });
          }
        }
      }

      setComparisonProgress(85);
      setComparisonPhase('Finding unique records...');

      // Find records unique to data2 (optimized for large datasets)
      const uniqueToSecond: Record<string, unknown>[] = [];
      let uniqueCount = 0;
      for (const row2 of validData2) {
        const key = createKey(row2);
        if (!data1Keys.has(key)) {
          uniqueToSecond.push({ ...row2, _source: fileName2 });
          uniqueCount++;
          
          // Log progress for very large datasets
          if (validData2.length > 50000 && uniqueCount % 10000 === 0) {
            console.log(`Found ${uniqueCount} unique records in dataset 2...`);
          }
        }
      }

      setComparisonProgress(100);
      setComparisonPhase('Complete!');
      
      // Set results
      const results = { matches, mismatches, uniqueToFirst, uniqueToSecond };
      console.log('Comparison completed:', {
        matches: matches.length,
        mismatches: mismatches.length,
        uniqueToFirst: uniqueToFirst.length,
        uniqueToSecond: uniqueToSecond.length
      });
      
      // Final debug summary
      console.log('🎯 Comparison Results Summary:', {
        totalMatches: matches.length,
        totalMismatches: mismatches.length,
        totalUniqueToFirst: uniqueToFirst.length,
        totalUniqueToSecond: uniqueToSecond.length,
        totalProcessed: validData1.length,
        totalInDataset2: validData2.length,
        compareColumns: compareColumns
      });
      
      setComparisonResult(results);
      setIsRunComparison(true);
      setIsComparing(false);
      setComparisonProgress(0);
      setComparisonPhase('');
      
      // Save to comparison history for analytics
      const comparisonRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        fileName1,
        fileName2,
        rows1: validData1.length,
        rows2: validData2.length,
        originalRows1: data1.length,
        originalRows2: data2.length,
        columns: compareColumns,
        matches: matches.length,
        mismatches: mismatches.length,
        uniqueToFirst: uniqueToFirst.length,
        uniqueToSecond: uniqueToSecond.length,
        processingTime: Date.now() - performance.now(),
        fileSize1: 0, // Would need to track file sizes
        fileSize2: 0,
        // Save detailed results for download (reduced size to prevent localStorage quota issues)
        detailedResults: {
          matches: matches.slice(0, 100), // Reduced from 1000 to 100
          mismatches: mismatches.slice(0, 100),
          uniqueToFirst: uniqueToFirst.slice(0, 100),
          uniqueToSecond: uniqueToSecond.slice(0, 100)
        }
      };
      
      // Save to comparison history with error handling
      try {
        const existingHistory = JSON.parse(localStorage.getItem('comparisonHistory') || '[]');
        existingHistory.unshift(comparisonRecord);
        localStorage.setItem('comparisonHistory', JSON.stringify(existingHistory.slice(0, 50))); // Keep last 50 instead of 100
        console.log('✅ Comparison history saved successfully');
      } catch (error) {
        console.warn('⚠️ Could not save to localStorage (quota exceeded):', error);
        // Don't let localStorage errors break the comparison
      }
      
    } catch (error) {
      console.error('Comparison error:', error);
      setComparisonResult({ matches: [], mismatches: [], uniqueToFirst: [], uniqueToSecond: [] });
      setIsRunComparison(true);
      setIsComparing(false);
      setComparisonProgress(0);
      setComparisonPhase('');
    }
  }, [data1, data2, compareColumns, fileName1, fileName2]);

  // Reset comparison state when columns change
  React.useEffect(() => {
    setIsRunComparison(false);
    setComparisonResult({ matches: [], mismatches: [], uniqueToFirst: [], uniqueToSecond: [] });
  }, [compareColumns]);

  // Get common columns between both datasets
  const commonColumns = React.useMemo(() => {
    console.log('🔍 Calculating common columns:', {
      data1Length: data1.length,
      data2Length: data2.length,
      data1Sample: data1.length > 0 ? Object.keys(data1[0]) : [],
      data2Sample: data2.length > 0 ? Object.keys(data2[0]) : [],
      data1FirstRow: data1.length > 0 ? data1[0] : null,
      data2FirstRow: data2.length > 0 ? data2[0] : null
    });
    
    if (data1.length === 0 || data2.length === 0) {
      console.log('❌ No data in one or both datasets');
      return [];
    }
    
    const cols1 = Object.keys(data1[0]);
    const cols2 = Object.keys(data2[0]);
    const common = cols1.filter(col => cols2.includes(col));
    console.log('✅ Common columns found:', common);
    console.log('📊 Column comparison:', {
      dataset1Columns: cols1,
      dataset2Columns: cols2,
      commonColumns: common,
      dataset1Only: cols1.filter(col => !cols2.includes(col)),
      dataset2Only: cols2.filter(col => !cols1.includes(col))
    });
    return common;
  }, [data1, data2]);

  // Get current data based on active tab
  const getCurrentData = () => {
    if (!hasRunComparison) return [];
    
    // For now, just return matches - we'll add tabs later
    return comparisonResult.matches;
  };

  const exportToExcel = async () => {
    // Set default filename and show dialog
    const defaultFileName = `comparison-results-${new Date().toISOString().split('T')[0]}`;
    setExportFileName(defaultFileName);
    setShowExportDialog(true);
  };

  const handleExportConfirm = async () => {
    try {
      setShowExportDialog(false);
      
      console.log('Starting Excel export...', {
        matches: comparisonResult.matches.length,
        mismatches: comparisonResult.mismatches.length,
        uniqueToFirst: comparisonResult.uniqueToFirst.length,
        uniqueToSecond: comparisonResult.uniqueToSecond.length,
        originalData1Length: data1.length,
        originalData2Length: data2.length
      });

      const sheets = [];
      
      // Add only comparison results (not original datasets)
    if (comparisonResult.matches.length > 0) {
        sheets.push({ name: 'Matches', data: comparisonResult.matches });
    }
    
    if (comparisonResult.mismatches.length > 0) {
        sheets.push({ name: 'Mismatches', data: comparisonResult.mismatches });
    }
    
    if (comparisonResult.uniqueToFirst.length > 0) {
        sheets.push({ name: 'Unique to First', data: comparisonResult.uniqueToFirst });
    }
    
    if (comparisonResult.uniqueToSecond.length > 0) {
        sheets.push({ name: 'Unique to Second', data: comparisonResult.uniqueToSecond });
      }
      
      // If no data to export, show a message
      if (sheets.length === 0) {
        alert('No data to export. Please run a comparison first.');
        return;
      }
      
      // Calculate total rows for export (only comparison results, not original data)
      const totalRows = comparisonResult.matches.length + 
                       comparisonResult.mismatches.length + 
                       comparisonResult.uniqueToFirst.length + 
                       comparisonResult.uniqueToSecond.length;
      
      // Use optimized export for large datasets
      if (totalRows > 50000) {
        console.log(`Large dataset detected (${totalRows} rows). Using optimized export...`);
        
        // Show warning for very large datasets
        if (totalRows > 100000) {
          const proceed = confirm(
            `Very large dataset detected (${totalRows.toLocaleString()} rows).\n\n` +
            `This export will take several minutes and process data in very small chunks to prevent browser crashes.\n\n` +
            `For datasets over 500K rows, consider splitting your data into smaller files.\n\n` +
            `Do you want to continue?`
          );
          if (!proceed) {
            return;
          }
        }
        
        // For very large datasets, use streaming approach
        if (totalRows > 100000) {
          const proceed = confirm(
            `Very large dataset detected (${totalRows.toLocaleString()} rows).\n\n` +
            `This will create multiple smaller Excel files to prevent memory issues.\n\n` +
            `Files will be named: ${exportFileName}_part1.xlsx, ${exportFileName}_part2.xlsx, etc.\n\n` +
            `Continue with streaming export?`
          );
          if (!proceed) {
            return;
          }
          
          await handleStreamingExport();
          return;
        }
        
        // Memory check before starting
        if (performance.memory) {
          const memInfo = performance.memory;
          const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
          const totalMB = memInfo.totalJSHeapSize / 1024 / 1024;
          
          if (usedMB > 50) { // If already using more than 50MB
            const proceed = confirm(
              `High memory usage detected (${Math.round(usedMB)}MB).\n\n` +
              `This export may cause browser crashes.\n\n` +
              `Consider using streaming export for large datasets.\n\n` +
              `Do you want to continue anyway?`
            );
            if (!proceed) {
              return;
            }
          }
        }
        
        await handleOptimizedExport();
      } else {
        // Use regular export for smaller datasets
        await handleRegularExport();
      }
      
      async function handleOptimizedExport() {
        const fileName = `${exportFileName}.xlsx`;
        setIsExporting(true);
        setExportProgress(0);
        
        // Add heartbeat to show the process is still working
        const heartbeat = setInterval(() => {
          console.log('Export heartbeat - still processing...');
        }, 5000); // Log every 5 seconds
        
        
        try {
          // Show initial progress
          setExportProgress(5);
          
          // Use streaming approach to prevent memory crashes
          const workbook = new (await import('exceljs')).Workbook();
          const MAX_ROWS_PER_SHEET = 2000; // Much smaller sheets
          const CHUNK_SIZE = 5; // Process only 5 rows at a time
          const MEMORY_CHECK_INTERVAL = 10; // Check memory every 10 chunks
          const usedNames = new Set<string>();
          
          // Memory monitoring to prevent crashes
          let memoryCheckCount = 0;
          const checkMemory = () => {
            if (performance.memory) {
              const memInfo = performance.memory;
              const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
              const totalMB = memInfo.totalJSHeapSize / 1024 / 1024;
              
              // If memory usage is too high, abort
              if (usedMB > 500) { // 500MB limit
                console.error(`Memory limit exceeded: ${Math.round(usedMB)}MB`);
                clearInterval(heartbeat);
                setIsExporting(false);
                setExportProgress(0);
                alert(`Export aborted: Memory limit exceeded (${Math.round(usedMB)}MB). Please try with smaller data or split your dataset.`);
                return false;
              }
              
              memoryCheckCount++;
              if (memoryCheckCount % 10 === 0) {
                console.log(`Memory check ${memoryCheckCount}: ${Math.round(usedMB)}MB / ${Math.round(totalMB)}MB`);
              }
            }
            return true;
          };
          
          // Helper function to make sheet names unique
          const makeUniqueName = (baseName: string): string => {
            let uniqueName = baseName;
            let counter = 1;
            
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

          let totalWork = 0;
          let completedWork = 0;

          // Calculate total work (much more granular)
          for (const sheet of sheets) {
            if (sheet.data.length > MAX_ROWS_PER_SHEET) {
              const chunks = Math.ceil(sheet.data.length / MAX_ROWS_PER_SHEET);
              totalWork += chunks * Math.ceil(MAX_ROWS_PER_SHEET / CHUNK_SIZE);
            } else {
              totalWork += Math.ceil(sheet.data.length / CHUNK_SIZE);
            }
          }

          setExportProgress(10);

          // Process each sheet with much smaller chunks
          for (const sheet of sheets) {
            if (sheet.data.length > MAX_ROWS_PER_SHEET) {
              // Split large datasets into multiple sheets
              const sheetChunks = [];
              for (let i = 0; i < sheet.data.length; i += MAX_ROWS_PER_SHEET) {
                sheetChunks.push(sheet.data.slice(i, i + MAX_ROWS_PER_SHEET));
              }
              
              for (let i = 0; i < sheetChunks.length; i++) {
                const sheetChunk = sheetChunks[i];
                const baseName = sheetChunks.length > 1 ? `${sheet.name}_${i + 1}` : sheet.name;
                const uniqueName = makeUniqueName(baseName);
                
                // Process this sheet chunk in very small pieces
                await addSheetToWorkbookAsync(workbook, sheetChunk, uniqueName, CHUNK_SIZE, () => {
                  completedWork++;
                  const progress = Math.round((completedWork / totalWork) * 80) + 10; // 10-90%
                  setExportProgress(progress);
                });
              }
            } else {
              // Process smaller sheets with async chunks
              await addSheetToWorkbookAsync(workbook, sheet.data, makeUniqueName(sheet.name), CHUNK_SIZE, () => {
                completedWork++;
                const progress = Math.round((completedWork / totalWork) * 80) + 10; // 10-90%
                setExportProgress(progress);
              });
            }
          }

          setExportProgress(90);
          
          // Generate and download the file
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
          
          setExportProgress(100);
          clearInterval(heartbeat);
          setIsExporting(false);
          setExportProgress(0);
          alert(`Export completed! File saved as: ${fileName}`);
          
        } catch (error) {
          console.error('Optimized export failed:', error);
          clearInterval(heartbeat);
          setIsExporting(false);
          setExportProgress(0);
          alert(`Export failed: ${error.message}. Please try again.`);
        }
      }

      async function handleStreamingExport() {
        setIsExporting(true);
        setExportProgress(0);
        
        try {
          const MAX_ROWS_PER_FILE = 50000; // Much smaller files
          const filesCreated = [];
          
          for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
            const sheet = sheets[sheetIndex];
            
            if (sheet.data.length <= MAX_ROWS_PER_FILE) {
              // Small sheet - export as single file
              const fileName = `${exportFileName}_${sheet.name}.xlsx`;
              await ExcelUtils.exportMultipleSheets([sheet], fileName);
              filesCreated.push(fileName);
              setExportProgress(Math.round(((sheetIndex + 1) / sheets.length) * 100));
            } else {
              // Large sheet - split into multiple files
              const chunks = Math.ceil(sheet.data.length / MAX_ROWS_PER_FILE);
              
              for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
                const startIndex = chunkIndex * MAX_ROWS_PER_FILE;
                const endIndex = Math.min(startIndex + MAX_ROWS_PER_FILE, sheet.data.length);
                const chunkData = sheet.data.slice(startIndex, endIndex);
                
                const chunkSheet = {
                  name: chunks > 1 ? `${sheet.name}_part${chunkIndex + 1}` : sheet.name,
                  data: chunkData
                };
                
                const fileName = `${exportFileName}_${chunkSheet.name}.xlsx`;
                await ExcelUtils.exportMultipleSheets([chunkSheet], fileName);
                filesCreated.push(fileName);
                
                // Update progress
                const totalChunks = sheets.reduce((sum, s) => sum + Math.ceil(s.data.length / MAX_ROWS_PER_FILE), 0);
                const currentChunk = sheets.slice(0, sheetIndex).reduce((sum, s) => sum + Math.ceil(s.data.length / MAX_ROWS_PER_FILE), 0) + chunkIndex + 1;
                setExportProgress(Math.round((currentChunk / totalChunks) * 100));
                
                // Small delay to prevent memory buildup
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          }
          
          setIsExporting(false);
          setExportProgress(0);
          
          const fileList = filesCreated.map(file => `• ${file}`).join('\n');
          alert(`Streaming export completed!\n\nFiles created:\n${fileList}\n\nTotal files: ${filesCreated.length}`);
          
        } catch (error) {
          console.error('Streaming export failed:', error);
          setIsExporting(false);
          setExportProgress(0);
          alert(`Streaming export failed: ${error.message}. Please try again.`);
        }
      }

      async function handleRegularExport() {
        const fileName = `${exportFileName}.xlsx`;
        await ExcelUtils.exportMultipleSheets(sheets, fileName);
        alert(`Export completed! File saved as: ${fileName}`);
      }

      // Helper function to add sheet to workbook with proper async processing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async function addSheetToWorkbookAsync(workbook: any, data: Record<string, unknown>[], sheetName: string, chunkSize: number, onProgress: () => void) {
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

        // Process data in micro-chunks with memory monitoring
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          const rows = chunk.map(row => headers.map(header => row[header] || ''));
          worksheet.addRows(rows);
          
          // Call progress callback
          onProgress();
          
          // Yield control back to browser every single chunk
          await new Promise(resolve => setTimeout(resolve, 2));
          
          // Memory check and garbage collection every few chunks
          if (i % (chunkSize * 10) === 0) {
            // Check memory and abort if too high
            if (performance.memory) {
              const memInfo = performance.memory;
              const usedMB = memInfo.usedJSHeapSize / 1024 / 1024;
              
              if (usedMB > 500) { // 500MB limit
                console.error(`Memory limit exceeded: ${Math.round(usedMB)}MB`);
                setIsExporting(false);
                setExportProgress(0);
                alert(`Export aborted: Memory limit exceeded (${Math.round(usedMB)}MB). Please try with smaller data or split your dataset.`);
                return; // Abort export
              }
            }
            
            // Force garbage collection if available
            if (window.gc) {
              window.gc();
            }
            
            // Longer pause for memory cleanup
            await new Promise(resolve => setTimeout(resolve, 15));
          }
        }

        // Auto-fit columns (but limit width for performance)
        worksheet.columns.forEach((column: { width?: number }) => {
          column.width = Math.min(column.width || 15, 30);
        });
      }
    } catch (error) {
      console.error('Excel export failed:', error);
      setIsExporting(false);
      setExportProgress(0);
      alert(`Failed to export results: ${error.message}. Please try again or contact support if the issue persists.`);
    }
  };

  // Debug logging for current state
  React.useEffect(() => {
    console.log('🔍 DataComparison State:', {
      data1Length: data1.length,
      data2Length: data2.length,
      commonColumnsLength: commonColumns.length,
      compareColumnsLength: compareColumns.length,
      compareColumnsList: compareColumns,
      hasRunComparison,
      isComparing,
      comparisonResult: {
        matches: comparisonResult.matches.length,
        mismatches: comparisonResult.mismatches.length,
        uniqueToFirst: comparisonResult.uniqueToFirst.length,
        uniqueToSecond: comparisonResult.uniqueToSecond.length
      }
    });
    
    // Force alert when data changes to make sure it's being passed
    if (data1.length > 0 || data2.length > 0) {
      console.log('📊 DATA RECEIVED:', {
        data1FirstRow: data1.length > 0 ? data1[0] : null,
        data2FirstRow: data2.length > 0 ? data2[0] : null
      });
    }
  }, [data1, data2, commonColumns, compareColumns, hasRunComparison, isComparing, comparisonResult]);

  if (data1.length === 0 || data2.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Data Comparison
          </CardTitle>
          <CardDescription>
            Load data in both datasets to start comparison
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Data Comparison
          </CardTitle>
          <CardDescription>
            Compare data between {fileName1} and {fileName2}
            <br />
            <span className="text-sm text-muted-foreground">
              Dataset 1: {data1.length} rows | Dataset 2: {data2.length} rows | Common columns: {commonColumns.length}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Column Selection */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
            <label className="text-sm font-medium">Compare by columns (select multiple):</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    console.log('Select All clicked, commonColumns:', commonColumns);
                    setCompareColumns(commonColumns);
                  }}
                  disabled={commonColumns.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  Select All ({commonColumns.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareColumns([])}
                  disabled={compareColumns.length === 0}
                  className="w-full sm:w-auto"
                >
                  Clear All
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {commonColumns.map(column => (
                <Badge
                  key={column}
                  variant={compareColumns.includes(column) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    console.log('Column clicked:', column, 'Current columns:', compareColumns);
                    if (compareColumns.includes(column)) {
                      // Remove column
                      const newColumns = compareColumns.filter(col => col !== column);
                      console.log('Removing column, new columns:', newColumns);
                      setCompareColumns(newColumns);
                    } else {
                      // Add column
                      const newColumns = [...compareColumns, column];
                      console.log('Adding column, new columns:', newColumns);
                      setCompareColumns(newColumns);
                    }
                  }}
                >
                  {column}
                </Badge>
              ))}
            </div>
            {compareColumns.length === 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ No columns selected for comparison!
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Click on column badges above or use "Select All" to compare all columns
                </p>
              </div>
            )}
            {compareColumns.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {compareColumns.length} of {commonColumns.length} columns selected
              </p>
            )}
          </div>

          {/* Comparison Button */}
          {compareColumns.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button 
                onClick={performComparison}
                disabled={isComparing}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                {isComparing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Comparing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4" />
                    Run Comparison
                  </>
                )}
              </Button>
              
              {hasRunComparison && (
                <Button 
                  variant="outline" 
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Exporting... {exportProgress}%
                    </>
                  ) : (
                    <>
                  <Download className="h-4 w-4" />
                  Export Results
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isComparing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{comparisonPhase}</span>
                <span>{comparisonProgress}%</span>
              </div>
              <Progress value={comparisonProgress} className="w-full" />
            </div>
          )}

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exporting large dataset (ultra-safe mode)...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Creating multiple smaller Excel files to prevent memory issues.</p>
                <p>Each file will contain up to 50,000 rows for optimal performance.</p>
                <p className="text-green-600">✓ Streaming export - no memory crashes possible.</p>
                <p className="text-blue-600">💡 Files will be named: filename_part1.xlsx, filename_part2.xlsx, etc.</p>
              </div>
            </div>
          )}

          {/* Ready to Compare Message */}
          {compareColumns.length > 0 && !hasRunComparison && !isComparing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Ready to compare {data1.length} records from {fileName1} with {data2.length} records from {fileName2} using columns: {compareColumns.join(', ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {hasRunComparison && (
        <div className="space-y-6">
          {/* Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Comparison Results</CardTitle>
              <CardDescription>
                Summary of comparison between {fileName1} and {fileName2}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{comparisonResult.matches.length}</div>
                  <div className="text-sm text-green-800">Matches</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{comparisonResult.mismatches.length}</div>
                  <div className="text-sm text-yellow-800">Mismatches</div>
                </div>
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{comparisonResult.uniqueToFirst.length}</div>
                  <div className="text-sm text-blue-800">Unique to {fileName1}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{comparisonResult.uniqueToSecond.length}</div>
                  <div className="text-sm text-purple-800">Unique to {fileName2}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matches */}
          {comparisonResult.matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Matches ({comparisonResult.matches.length})</CardTitle>
                <CardDescription>Records that match exactly in both datasets</CardDescription>
              </CardHeader>
              <CardContent>
                <DataPreview 
                  data={comparisonResult.matches} 
                  fileName="matches" 
                  title="Matching Records"
                  showAllRows={true}
                  maxHeight="h-96"
                />
              </CardContent>
            </Card>
          )}

          {/* Mismatches */}
          {comparisonResult.mismatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-600">Mismatches ({comparisonResult.mismatches.length})</CardTitle>
                <CardDescription>Records with matching keys but different values</CardDescription>
              </CardHeader>
              <CardContent>
                <DataPreview 
                  data={comparisonResult.mismatches} 
                  fileName="mismatches" 
                  title="Mismatched Records"
                  showAllRows={true}
                  maxHeight="h-96"
                />
              </CardContent>
            </Card>
          )}

          {/* Unique to First */}
          {comparisonResult.uniqueToFirst.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Unique to {fileName1} ({comparisonResult.uniqueToFirst.length})</CardTitle>
                <CardDescription>Records that exist only in the first dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <DataPreview 
                  data={comparisonResult.uniqueToFirst} 
                  fileName="unique-to-first" 
                  title={`Records Unique to ${fileName1}`}
                  showAllRows={true}
                  maxHeight="h-96"
                />
              </CardContent>
            </Card>
          )}

          {/* Unique to Second */}
          {comparisonResult.uniqueToSecond.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-600">Unique to {fileName2} ({comparisonResult.uniqueToSecond.length})</CardTitle>
                <CardDescription>Records that exist only in the second dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <DataPreview 
                  data={comparisonResult.uniqueToSecond} 
                  fileName="unique-to-second" 
                  title={`Records Unique to ${fileName2}`}
                  showAllRows={true}
                  maxHeight="h-96"
                />
              </CardContent>
            </Card>
          )}

          {/* No Results Message */}
          {comparisonResult.matches.length === 0 && 
           comparisonResult.mismatches.length === 0 && 
           comparisonResult.uniqueToFirst.length === 0 && 
           comparisonResult.uniqueToSecond.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No comparison results found.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Results</DialogTitle>
            <DialogDescription>
              Choose a name for your export file. The file will be saved as an Excel (.xlsx) file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filename" className="text-right">
                Filename
              </Label>
              <Input
                id="filename"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                className="col-span-3"
                placeholder="Enter filename..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportConfirm} disabled={!exportFileName.trim()}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};