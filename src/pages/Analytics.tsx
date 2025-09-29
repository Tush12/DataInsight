import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Clock, FileText, TrendingUp, Download, Trash2, Eye, EyeOff, Filter, ArrowUpDown, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ExcelUtils } from '@/lib/excelUtils';

interface ComparisonHistory {
  id: string;
  timestamp: Date;
  fileName1: string;
  fileName2: string;
  rows1: number;
  rows2: number;
  columns: string[];
  matches: number;
  mismatches: number;
  uniqueToFirst: number;
  uniqueToSecond: number;
  processingTime: number;
  fileSize1: number;
  fileSize2: number;
  hidden?: boolean;
  detailedResults?: {
    matches: any[];
    mismatches: any[];
    uniqueToFirst: any[];
    uniqueToSecond: any[];
  };
}

interface TransformHistory {
  id: string;
  timestamp: Date;
  fileName: string;
  originalRows: number;
  transformedRows: number;
  operations: string[];
  processingTime: number;
  hidden?: boolean;
  transformedData?: any[];
}

const Analytics = () => {
  const [comparisonHistory, setComparisonHistory] = useState<ComparisonHistory[]>([]);
  const [transformHistory, setTransformHistory] = useState<TransformHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<'comparison' | 'transform'>('comparison');

  // Load comparison and transform history from localStorage
  useEffect(() => {
    const savedComparisonHistory = localStorage.getItem('comparisonHistory');
    if (savedComparisonHistory) {
      const parsed = JSON.parse(savedComparisonHistory).map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      setComparisonHistory(parsed);
    }

    const savedTransformHistory = localStorage.getItem('transformHistory');
    if (savedTransformHistory) {
      const parsed = JSON.parse(savedTransformHistory).map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      setTransformHistory(parsed);
    }
    setLoading(false);
  }, []);

  // Clear all history
  const clearHistory = () => {
    localStorage.removeItem('comparisonHistory');
    setComparisonHistory([]);
  };

  // Hide/unhide a comparison record
  const toggleVisibility = (id: string) => {
    const updatedHistory = comparisonHistory.map(comp => 
      comp.id === id ? { ...comp, hidden: !comp.hidden } : comp
    );
    setComparisonHistory(updatedHistory);
    localStorage.setItem('comparisonHistory', JSON.stringify(updatedHistory));
  };

  // Delete a specific comparison record
  const deleteComparison = (id: string) => {
    const updatedHistory = comparisonHistory.filter(comp => comp.id !== id);
    setComparisonHistory(updatedHistory);
    localStorage.setItem('comparisonHistory', JSON.stringify(updatedHistory));
  };

  // Get visible comparisons (filter out hidden ones unless showHidden is true)
  const getVisibleComparisons = () => {
    return showHidden ? comparisonHistory : comparisonHistory.filter(comp => !comp.hidden);
  };

  // Get visible transform history
  const getVisibleTransforms = () => {
    return showHidden ? transformHistory : transformHistory.filter(transform => !transform.hidden);
  };

  // Hide/unhide a transform record
  const toggleTransformVisibility = (id: string) => {
    const updatedHistory = transformHistory.map(transform => 
      transform.id === id ? { ...transform, hidden: !transform.hidden } : transform
    );
    setTransformHistory(updatedHistory);
    localStorage.setItem('transformHistory', JSON.stringify(updatedHistory));
  };

  // Delete a specific transform record
  const deleteTransform = (id: string) => {
    const updatedHistory = transformHistory.filter(transform => transform.id !== id);
    setTransformHistory(updatedHistory);
    localStorage.setItem('transformHistory', JSON.stringify(updatedHistory));
  };

  // Download individual transform results
  const downloadTransformResults = async (transform: TransformHistory) => {
    if (!transform.transformedData) {
      alert('No transformed data available for this operation');
      return;
    }

    const fileName = `transform-${transform.fileName.replace(/[^a-zA-Z0-9]/g, '_')}-${transform.timestamp.toISOString().split('T')[0]}.xlsx`;
    await ExcelUtils.exportToExcel(transform.transformedData, fileName, 'Transformed Data');
  };

  // Calculate statistics
  const totalComparisons = comparisonHistory.length;
  const totalRowsProcessed = comparisonHistory.reduce((sum, comp) => sum + comp.rows1 + comp.rows2, 0);
  const averageProcessingTime = totalComparisons > 0 
    ? comparisonHistory.reduce((sum, comp) => sum + comp.processingTime, 0) / totalComparisons 
    : 0;
  const totalFileSize = comparisonHistory.reduce((sum, comp) => sum + comp.fileSize1 + comp.fileSize2, 0);

  // Get most common file types
  const getFileTypes = () => {
    const types: { [key: string]: number } = {};
    comparisonHistory.forEach(comp => {
      const ext1 = comp.fileName1.split('.').pop()?.toLowerCase() || 'unknown';
      const ext2 = comp.fileName2.split('.').pop()?.toLowerCase() || 'unknown';
      types[ext1] = (types[ext1] || 0) + 1;
      types[ext2] = (types[ext2] || 0) + 1;
    });
    return Object.entries(types).sort(([,a], [,b]) => b - a).slice(0, 5);
  };

  // Get most compared columns
  const getMostComparedColumns = () => {
    const columns: { [key: string]: number } = {};
    comparisonHistory.forEach(comp => {
      comp.columns.forEach(col => {
        columns[col] = (columns[col] || 0) + 1;
      });
    });
    return Object.entries(columns).sort(([,a], [,b]) => b - a).slice(0, 10);
  };

  // Export analytics report as JSON
  const exportAnalytics = () => {
    const visibleComparisons = getVisibleComparisons();
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalComparisons: visibleComparisons.length,
        totalRowsProcessed: visibleComparisons.reduce((sum, comp) => sum + comp.rows1 + comp.rows2, 0),
        averageProcessingTime: visibleComparisons.length > 0 
          ? Math.round(visibleComparisons.reduce((sum, comp) => sum + comp.processingTime, 0) / visibleComparisons.length)
          : 0,
        totalFileSize: Math.round(visibleComparisons.reduce((sum, comp) => sum + comp.fileSize1 + comp.fileSize2, 0) / 1024 / 1024 * 100) / 100 // MB
      },
      fileTypes: getFileTypes(),
      mostComparedColumns: getMostComparedColumns(),
      recentComparisons: visibleComparisons.slice(0, 10)
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export comparison history as CSV
  const exportHistoryCSV = () => {
    const visibleComparisons = getVisibleComparisons();
    const headers = ['Date', 'Time', 'File 1', 'File 2', 'Rows 1', 'Rows 2', 'Matches', 'Mismatches', 'Unique to First', 'Unique to Second', 'Processing Time (ms)', 'Columns'];
    
    const csvContent = [
      headers.join(','),
      ...visibleComparisons.map(comp => [
        comp.timestamp.toLocaleDateString(),
        comp.timestamp.toLocaleTimeString(),
        `"${comp.fileName1}"`,
        `"${comp.fileName2}"`,
        comp.rows1,
        comp.rows2,
        comp.matches,
        comp.mismatches,
        comp.uniqueToFirst,
        comp.uniqueToSecond,
        comp.processingTime,
        `"${comp.columns.join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download individual comparison results
  const downloadComparisonResults = async (comp: ComparisonHistory) => {
    if (!comp.detailedResults) {
      alert('No detailed results available for this comparison');
      return;
    }

    const sheets = [];
    
    // Add matches sheet
    if (comp.detailedResults.matches.length > 0) {
      sheets.push({ name: 'Matches', data: comp.detailedResults.matches });
    }
    
    // Add mismatches sheet
    if (comp.detailedResults.mismatches.length > 0) {
      sheets.push({ name: 'Mismatches', data: comp.detailedResults.mismatches });
    }
    
    // Add unique to first sheet
    if (comp.detailedResults.uniqueToFirst.length > 0) {
      sheets.push({ name: 'Unique to First', data: comp.detailedResults.uniqueToFirst });
    }
    
    // Add unique to second sheet
    if (comp.detailedResults.uniqueToSecond.length > 0) {
      sheets.push({ name: 'Unique to Second', data: comp.detailedResults.uniqueToSecond });
    }

    if (sheets.length === 0) {
      alert('No data available to download');
      return;
    }

    const fileName = `comparison-${comp.fileName1.replace(/[^a-zA-Z0-9]/g, '_')}-vs-${comp.fileName2.replace(/[^a-zA-Z0-9]/g, '_')}-${comp.timestamp.toISOString().split('T')[0]}.xlsx`;
    await ExcelUtils.exportMultipleSheets(sheets, fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading analytics...</div>
        </div>
        <Footer />
      </div>
    );
  }

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
          <h1 className="text-4xl font-bold mb-4">Analytics Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            Track your data comparison performance and usage patterns
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comparisons</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalComparisons}</div>
              <p className="text-xs text-muted-foreground">
                All time comparisons
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rows Processed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRowsProcessed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total data rows analyzed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(averageProcessingTime)}ms</div>
              <p className="text-xs text-muted-foreground">
                Average comparison speed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(totalFileSize / 1024 / 1024 * 100) / 100} MB</div>
              <p className="text-xs text-muted-foreground">
                Total file size processed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* File Types and Column Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Most Used File Types</CardTitle>
              <CardDescription>File formats you compare most frequently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getFileTypes().map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{type.toUpperCase()}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={(count / totalComparisons) * 100} className="w-20" />
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Compared Columns</CardTitle>
              <CardDescription>Columns you compare most often</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getMostComparedColumns().map(([column, count]) => (
                  <div key={column} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{column}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={(count / totalComparisons) * 100} className="w-20" />
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'comparison' | 'transform')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comparison">
              <BarChart3 className="h-4 w-4 mr-2" />
              Comparison History
            </TabsTrigger>
            <TabsTrigger value="transform">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Transform History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comparison History</CardTitle>
                    <CardDescription>
                      Your recent data comparison activities
                      {comparisonHistory.filter(comp => comp.hidden).length > 0 && (
                        <span className="text-muted-foreground ml-2">
                          ({comparisonHistory.filter(comp => comp.hidden).length} hidden)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={exportAnalytics} disabled={totalComparisons === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button variant="outline" onClick={exportHistoryCSV} disabled={totalComparisons === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowHidden(!showHidden)}
                      disabled={totalComparisons === 0}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {showHidden ? 'Hide Hidden' : 'Show Hidden'}
                    </Button>
                    <Button variant="outline" onClick={clearHistory} disabled={totalComparisons === 0}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
          <CardContent>
            {totalComparisons === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No comparison history yet</p>
                <p className="text-sm text-muted-foreground">Start comparing data to see analytics here</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead>Mismatches</TableHead>
                      <TableHead>Processing Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getVisibleComparisons().slice(0, 20).map((comp) => (
                      <TableRow key={comp.id} className={comp.hidden ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="text-sm">
                            {comp.timestamp.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {comp.timestamp.toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{comp.fileName1}</div>
                          <div className="text-sm text-muted-foreground">vs {comp.fileName2}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{comp.rows1.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">vs {comp.rows2.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600">
                            {comp.matches}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-yellow-600">
                            {comp.mismatches}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{comp.processingTime}ms</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadComparisonResults(comp)}
                              title="Download Results"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleVisibility(comp.id)}
                              title={comp.hidden ? 'Show' : 'Hide'}
                            >
                              {comp.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteComparison(comp.id)}
                              title="Delete"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="transform">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Transform History</CardTitle>
                    <CardDescription>
                      Your recent data transformation activities
                      {transformHistory.filter(transform => transform.hidden).length > 0 && (
                        <span className="text-muted-foreground ml-2">
                          ({transformHistory.filter(transform => transform.hidden).length} hidden)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowHidden(!showHidden)}
                      disabled={transformHistory.length === 0}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {showHidden ? 'Hide Hidden' : 'Show Hidden'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        localStorage.removeItem('transformHistory');
                        setTransformHistory([]);
                      }} 
                      disabled={transformHistory.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {transformHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <ArrowUpDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No transform history yet</p>
                    <p className="text-sm text-muted-foreground">Start transforming data to see history here</p>
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead>Operations</TableHead>
                          <TableHead>Rows</TableHead>
                          <TableHead>Processing Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getVisibleTransforms().slice(0, 20).map((transform) => (
                          <TableRow key={transform.id} className={transform.hidden ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="text-sm">
                                {transform.timestamp.toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {transform.timestamp.toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{transform.fileName}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {transform.operations.map((op, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {op}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{transform.originalRows.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">
                                → {transform.transformedRows.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{transform.processingTime}ms</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => downloadTransformResults(transform)}
                                  title="Download Results"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => toggleTransformVisibility(transform.id)}
                                  title={transform.hidden ? 'Show' : 'Hide'}
                                >
                                  {transform.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteTransform(transform.id)}
                                  title="Delete"
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Analytics;
