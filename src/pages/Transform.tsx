import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Download, 
  ArrowUpDown, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Group, 
  Merge,
  Eye,
  ArrowLeft,
  Trash2,
  Edit3,
  ArrowRight
} from 'lucide-react';
import Papa from 'papaparse';
import { ExcelUtils } from '@/lib/excelUtils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface DataRow {
  [key: string]: any;
}

interface TransformOperation {
  id: string;
  type: 'rename' | 'delete' | 'reorder' | 'filter' | 'sort' | 'group';
  config: any;
}

const Transform = () => {
  const [data, setData] = useState<DataRow[]>([]);
  const [originalData, setOriginalData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [transformOperations, setTransformOperations] = useState<TransformOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filter state
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  
  // Sort state
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // File upload handler
  const handleFileUpload = useCallback((file: File) => {
    setIsProcessing(true);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setData(results.data as DataRow[]);
          setOriginalData(results.data as DataRow[]);
          setColumns(Object.keys(results.data[0] || {}));
          setFileName(file.name);
          setTransformOperations([]);
          setIsProcessing(false);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          setIsProcessing(false);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const jsonData = await ExcelUtils.readExcelFile(file);
          setData(jsonData as DataRow[]);
          setOriginalData(jsonData as DataRow[]);
          setColumns(Object.keys(jsonData[0] || {}));
          setFileName(file.name);
          setTransformOperations([]);
          setIsProcessing(false);
        } catch (error) {
          console.error('Excel parsing error:', error);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  // Column operations
  const renameColumn = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    
    const newData = data.map(row => {
      const newRow = { ...row };
      newRow[newName] = newRow[oldName];
      delete newRow[oldName];
      return newRow;
    });
    
    setData(newData);
    setColumns(columns.map(col => col === oldName ? newName : col));
    
    // Add to operations history
    setTransformOperations(prev => [...prev, {
      id: Date.now().toString(),
      type: 'rename',
      config: { oldName, newName }
    }]);
  };

  const deleteColumn = (columnName: string) => {
    const newData = data.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
    
    setData(newData);
    setColumns(columns.filter(col => col !== columnName));
    
    setTransformOperations(prev => [...prev, {
      id: Date.now().toString(),
      type: 'delete',
      config: { columnName }
    }]);
  };

  const reorderColumns = (newOrder: string[]) => {
    const newData = data.map(row => {
      const newRow: DataRow = {};
      newOrder.forEach(col => {
        if (row[col] !== undefined) {
          newRow[col] = row[col];
        }
      });
      return newRow;
    });
    
    setData(newData);
    setColumns(newOrder);
    
    setTransformOperations(prev => [...prev, {
      id: Date.now().toString(),
      type: 'reorder',
      config: { newOrder }
    }]);
  };

  // Filter operations
  const applyFilter = () => {
    if (!filterColumn || !filterOperator || !filterValue) {
      alert('Please select a column, operator, and enter a value');
      return;
    }
    
    const filteredData = data.filter(row => {
      const cellValue = row[filterColumn];
      const filterValueStr = filterValue;
      
      switch (filterOperator) {
        case 'equals':
          return String(cellValue).toLowerCase() === filterValueStr.toLowerCase();
        case 'contains':
          return String(cellValue).toLowerCase().includes(filterValueStr.toLowerCase());
        case 'starts_with':
          return String(cellValue).toLowerCase().startsWith(filterValueStr.toLowerCase());
        case 'greater_than':
          return Number(cellValue) > Number(filterValueStr);
        case 'less_than':
          return Number(cellValue) < Number(filterValueStr);
        case 'not_equals':
          return String(cellValue).toLowerCase() !== filterValueStr.toLowerCase();
        case 'ends_with':
          return String(cellValue).toLowerCase().endsWith(filterValueStr.toLowerCase());
        default:
          return true;
      }
    });
    
    setData(filteredData);
    
    setTransformOperations(prev => [...prev, {
      id: Date.now().toString(),
      type: 'filter',
      config: { column: filterColumn, operator: filterOperator, value: filterValue }
    }]);
    
    // Clear filter inputs
    setFilterColumn('');
    setFilterOperator('');
    setFilterValue('');
  };

  // Sort operations
  const applySort = () => {
    if (!sortColumn) {
      alert('Please select a column to sort by');
      return;
    }
    
    const sortedData = [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    setData(sortedData);
    
    setTransformOperations(prev => [...prev, {
      id: Date.now().toString(),
      type: 'sort',
      config: { column: sortColumn, direction: sortDirection }
    }]);
    
    // Clear sort inputs
    setSortColumn('');
    setSortDirection('asc');
  };

  // Export transformed data
  const exportData = async () => {
    const fileName = `transformed-${new Date().toISOString().split('T')[0]}.xlsx`;
    await ExcelUtils.exportToExcel(data, fileName, 'Transformed Data');

    // Save to transform history
    const transformRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      fileName: fileName,
      originalRows: originalData.length,
      transformedRows: data.length,
      operations: transformOperations.map(op => `${op.type}: ${JSON.stringify(op.config)}`),
      processingTime: Date.now() - performance.now(),
      transformedData: data.slice(0, 1000) // Limit to prevent localStorage issues
    };
    
    const existingHistory = JSON.parse(localStorage.getItem('transformHistory') || '[]');
    existingHistory.unshift(transformRecord);
    localStorage.setItem('transformHistory', JSON.stringify(existingHistory.slice(0, 100))); // Keep last 100
  };

  // Reset to original data
  const resetData = () => {
    setData(originalData);
    setTransformOperations([]);
    setFilterColumn('');
    setFilterOperator('');
    setFilterValue('');
    setSortColumn('');
    setSortDirection('asc');
  };
  
  // Clear current filters
  const clearFilters = () => {
    setData(originalData);
    setFilterColumn('');
    setFilterOperator('');
    setFilterValue('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2 text-primary" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Data Transformation</h1>
          <p className="text-xl text-muted-foreground">
            Transform, filter, and manipulate your data with powerful tools
          </p>
        </div>

        {/* File Upload */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Data File</CardTitle>
            <CardDescription>Upload a CSV or Excel file to start transforming</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild disabled={isProcessing}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Processing...' : 'Choose File'}
                  </span>
                </Button>
              </label>
              {fileName && (
                <div className="mt-4">
                  <Badge variant="secondary">{fileName}</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {data.length} rows, {columns.length} columns
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {data.length > 0 && (
          <Tabs defaultValue="columns" className="space-y-6">
            <TabsList>
              <TabsTrigger value="columns">Column Operations</TabsTrigger>
              <TabsTrigger value="filter">Filter Data</TabsTrigger>
              <TabsTrigger value="sort">Sort Data</TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Column Operations</CardTitle>
                      <CardDescription>Rename, delete, or reorder columns</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetData}>
                      Reset All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {columns.map((column, index) => (
                      <div key={column} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div className="flex-1">
                          <Label htmlFor={`rename-${column}`}>Column Name</Label>
                          <Input
                            id={`rename-${column}`}
                            defaultValue={column}
                            onBlur={(e) => {
                              if (e.target.value !== column) {
                                renameColumn(column, e.target.value);
                              }
                            }}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteColumn(column)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filter" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Filter Data</CardTitle>
                      <CardDescription>Filter rows based on column values</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Column</Label>
                      <Select value={filterColumn} onValueChange={setFilterColumn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(column => (
                            <SelectItem key={column} value={column}>{column}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Operator</Label>
                      <Select value={filterOperator} onValueChange={setFilterOperator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="starts_with">Starts With</SelectItem>
                          <SelectItem value="ends_with">Ends With</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Value</Label>
                      <Input 
                        placeholder="Filter value" 
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={applyFilter}>
                        <Filter className="h-4 w-4 mr-2" />
                        Apply Filter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sort" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Sort Data</CardTitle>
                      <CardDescription>Sort rows by column values</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSortColumn('');
                      setSortDirection('asc');
                    }}>
                      Clear Sort
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Column</Label>
                      <Select value={sortColumn} onValueChange={setSortColumn}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(column => (
                            <SelectItem key={column} value={column}>{column}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Direction</Label>
                      <Select value={sortDirection} onValueChange={(value: 'asc' | 'desc') => setSortDirection(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={applySort}>
                        {sortDirection === 'asc' ? (
                          <SortAsc className="h-4 w-4 mr-2" />
                        ) : (
                          <SortDesc className="h-4 w-4 mr-2" />
                        )}
                        Apply Sort
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        )}

        {/* Data Preview - Always visible at bottom */}
        {data.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Data Preview</CardTitle>
                  <CardDescription>Preview your transformed data ({data.length} rows, {columns.length} columns)</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={resetData}>
                    Reset
                  </Button>
                  <Button onClick={exportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="h-96 overflow-auto">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          {columns.map((column, index) => (
                            <TableHead key={index} className="font-semibold min-w-32 whitespace-nowrap border-r border-border/50 last:border-r-0 px-3 py-2">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.slice(0, 100).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {columns.map((column, colIndex) => (
                              <TableCell key={colIndex} className="min-w-32 whitespace-nowrap border-r border-border/50 last:border-r-0 px-3 py-2">
                                {row[column]?.toString() || ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {data.length > 100 && (
                  <p className="text-sm text-muted-foreground mt-4 px-4">
                    Showing first 100 rows of {data.length} total rows
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Transform;
