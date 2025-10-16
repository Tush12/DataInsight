import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database as DatabaseIcon, Server, Table, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataPreview } from '@/components/DataPreview';
import { DataComparison } from '@/components/DataComparison';
import { FileUpload } from '@/components/FileUpload';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ExcelUtils } from '@/lib/excelUtils';

interface DatabaseConnection {
  server: string;
  database: string;
  username?: string;
  password?: string;
  authType: 'windows' | 'sql';
  port?: number;
}

interface QueryResult {
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTime: number;
}

const BASE = import.meta.env.VITE_API_BASE || '';

const Database = () => {
  const [connection, setConnection] = useState<DatabaseConnection>({
    server: '',
    database: '',
    authType: 'sql',
    port: 1433
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<{name: string, schema: string}[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedTableInfo, setSelectedTableInfo] = useState<{name: string, schema: string} | null>(null);
  const [tableSearchTerm, setTableSearchTerm] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryError, setQueryError] = useState<string>('');
  
  // Second query states
  const [selectedTable2, setSelectedTable2] = useState<string>('');
  const [selectedTableInfo2, setSelectedTableInfo2] = useState<{name: string, schema: string} | null>(null);
  const [tableSearchTerm2, setTableSearchTerm2] = useState<string>('');
  const [customQuery2, setCustomQuery2] = useState<string>('');
  const [queryResult2, setQueryResult2] = useState<QueryResult | null>(null);
  const [isExecuting2, setIsExecuting2] = useState(false);
  const [queryError2, setQueryError2] = useState<string>('');
  
  // File upload for Query 2
  const [query2Mode, setQuery2Mode] = useState<'database' | 'file'>('database');
  const [uploadedFile2, setUploadedFile2] = useState<Record<string, unknown>[]>([]);
  const [uploadedFileName2, setUploadedFileName2] = useState<string>('');
  const [dataset1, setDataset1] = useState<Record<string, unknown>[]>([]);
  const [dataset2, setDataset2] = useState<Record<string, unknown>[]>([]);
  const [fileName1, setFileName1] = useState<string>('');
  const [fileName2, setFileName2] = useState<string>('');

  const handleConnectionChange = (field: keyof DatabaseConnection, value: string | number) => {
    console.log('Connection field changed:', field, 'to:', value);
    setConnection(prev => {
      const newConnection = { ...prev, [field]: value };
      console.log('New connection state:', newConnection);
      return newConnection;
    });
    setConnectionError('');
    
    // If database is changed and we're connected, refresh tables
    if (field === 'database' && isConnected) {
      refreshTablesForDatabase(value as string);
    }
  };

  const refreshTablesForDatabase = async (databaseName: string) => {
    if (!isConnected) return;
    
    try {
      const response = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...connection, database: databaseName })
      });
      
      if (response.ok) {
        const result = await response.json();
        setAvailableTables(result.tables || []);
        setSelectedTable(''); // Clear selected table when switching databases
        setSelectedTableInfo(null); // Clear selected table info when switching databases
        setTableSearchTerm(''); // Clear search when switching databases
        // Clear second query states as well
        setSelectedTable2('');
        setSelectedTableInfo2(null);
        setTableSearchTerm2('');
      }
    } catch (error) {
      console.error('Failed to refresh tables:', error);
    }
  };

  // Filter tables based on search term (case-insensitive and exact match priority)
  const filteredTables = availableTables.filter(table => {
    const tableName = table.name;
    const searchTerm = tableSearchTerm.toLowerCase().trim();
    
    if (!searchTerm) return true;
    
    // Exact match first, then contains match
    const exactMatch = tableName.toLowerCase() === searchTerm;
    const containsMatch = tableName.toLowerCase().includes(searchTerm);
    
    return exactMatch || containsMatch;
  }).sort((a, b) => {
    const nameA = a.name;
    const nameB = b.name;
    const searchTerm = tableSearchTerm.toLowerCase().trim();
    
    // Sort exact matches first, then alphabetically
    const exactMatchA = nameA.toLowerCase() === searchTerm;
    const exactMatchB = nameB.toLowerCase() === searchTerm;
    
    if (exactMatchA && !exactMatchB) return -1;
    if (!exactMatchA && exactMatchB) return 1;
    
    return nameA.localeCompare(nameB);
  });

  const testConnection = async () => {
    setIsConnecting(true);
    setConnectionError('');
    
    try {
      console.log('Sending connection data:', connection);

      const payload = {
        server: connection.server?.trim(),
        database: connection.database?.trim() || 'master',
        username: connection.username ?? (connection as any).user,
        password: connection.password,
        authType: (connection.authType || 'sql').toLowerCase(),
        port: Number(connection.port) || 1433
      };

      const response = await fetch(`${BASE}/api/database/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        setIsConnected(true);
        setAvailableDatabases(result.databases || []);
        setAvailableTables(result.tables || []);
      } else {
        const error = await response.json();
        setConnectionError(error.message || 'Connection failed');
      }
    } catch (error) {
      setConnectionError('Failed to connect to database. Please check your connection details.');
    } finally {
      setIsConnecting(false);
    }
  };

  const executeQuery = async () => {
    if (!isConnected) return;
    
    setIsExecuting(true);
    setQueryError('');
    
    try {
      let query;
      if (customQuery.trim()) {
        // Custom query takes priority over table selection
        query = customQuery;
      } else if (selectedTableInfo) {
        // Use the selected table info if no custom query
        const schema = selectedTableInfo.schema || 'dbo';
        const tableName = selectedTableInfo.name;
        query = `SELECT TOP 1000 * FROM [${schema}].[${tableName}]`;
      } else {
        throw new Error('Please select a table or enter a custom query');
      }
      
      const response = await fetch('/api/database/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection,
          query
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setQueryResult(result);
        
        // Set as dataset1 for comparison
        setDataset1(result.data);
        // Use custom query name if custom query was executed, otherwise use table name
        const fileName = customQuery.trim() ? 'Custom Query' : (selectedTableInfo ? `${selectedTableInfo.schema}.${selectedTableInfo.name}` : 'Custom Query');
        setFileName1(fileName);
      } else {
        const error = await response.json();
        setQueryError(error.message || 'Query execution failed');
      }
    } catch (error) {
      setQueryError('Failed to execute query. Please check your query syntax.');
    } finally {
      setIsExecuting(false);
    }
  };

  const executeQuery2 = async () => {
    if (!isConnected) return;
    
    setIsExecuting2(true);
    setQueryError2('');
    
    try {
      let query;
      if (customQuery2.trim()) {
        // Custom query takes priority over table selection
        query = customQuery2;
      } else if (selectedTableInfo2) {
        // Use the selected table info if no custom query
        const schema = selectedTableInfo2.schema || 'dbo';
        const tableName = selectedTableInfo2.name;
        query = `SELECT TOP 1000 * FROM [${schema}].[${tableName}]`;
      } else {
        throw new Error('Please select a table or enter a custom query');
      }
      
      const response = await fetch('/api/database/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection,
          query
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setQueryResult2(result);
        
        // Set as dataset2 for comparison
        setDataset2(result.data);
        // Use custom query name if custom query was executed, otherwise use table name
        const fileName = customQuery2.trim() ? 'Custom Query 2' : (selectedTableInfo2 ? `${selectedTableInfo2.schema}.${selectedTableInfo2.name}` : 'Custom Query 2');
        setFileName2(fileName);
      } else {
        const error = await response.json();
        setQueryError2(error.message || 'Query execution failed');
      }
    } catch (error) {
      setQueryError2('Failed to execute query. Please check your query syntax.');
    } finally {
      setIsExecuting2(false);
    }
  };

  const exportQueryResult = async () => {
    if (!queryResult) return;
    
    const fileName = `query-results-${new Date().toISOString().split('T')[0]}.xlsx`;
    await ExcelUtils.exportToExcel(queryResult.data, fileName, 'Query Results');
  };

  const handleFile2Upload = (data: Record<string, unknown>[], fileName: string) => {
    setUploadedFile2(data);
    setUploadedFileName2(fileName);
    setDataset2(data);
    setFileName2(fileName);
    setQueryResult2({
      data: data,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      rowCount: data.length,
      executionTime: 0
    });
  };

  // Debug logging for comparison data
  React.useEffect(() => {
    console.log('Database Comparison Debug:', {
      dataset1Length: dataset1.length,
      dataset2Length: dataset2.length,
      uploadedFile2Length: uploadedFile2.length,
      fileName1,
      fileName2
    });
  }, [dataset1, dataset2, uploadedFile2, fileName1, fileName2]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <DatabaseIcon className="h-10 w-10 text-primary" />
            Database Query & Comparison
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect to SQL Server databases, run queries, and compare data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Database Connection Panel */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Database Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="server">Server Name/IP</Label>
                  <Input
                    id="server"
                    value={connection.server}
                    onChange={(e) => handleConnectionChange('server', e.target.value)}
                    placeholder="localhost or 192.168.1.100"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={connection.port}
                    onChange={(e) => handleConnectionChange('port', parseInt(e.target.value) || 1433)}
                    placeholder="1433"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="database">Database Name</Label>
                <div className="space-y-2">
                  <Input
                    id="database"
                    value={connection.database}
                    onChange={(e) => handleConnectionChange('database', e.target.value)}
                    placeholder="Enter database name (e.g., TLT_OR_UAT)"
                  />
                  {isConnected && availableDatabases.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Or select from available databases:</p>
                      <Select
                        value={connection.database}
                        onValueChange={(value) => handleConnectionChange('database', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a database..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDatabases.map((db) => (
                            <SelectItem key={db} value={db}>
                              {db}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Authentication Type</Label>
                <Select
                  value={connection.authType}
                  onValueChange={(value: 'windows' | 'sql') => handleConnectionChange('authType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="windows">Windows Authentication</SelectItem>
                    <SelectItem value="sql">SQL Server Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {connection.authType === 'sql' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={connection.username || ''}
                      onChange={(e) => handleConnectionChange('username', e.target.value)}
                      placeholder="sa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={connection.password || ''}
                      onChange={(e) => handleConnectionChange('password', e.target.value)}
                      placeholder="Your password"
                    />
                  </div>
                </div>
              )}

              {connectionError && (
                <Alert variant="destructive">
                  <AlertDescription>{connectionError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={testConnection}
                disabled={isConnecting || !connection.server || !connection.database}
                className="w-full"
              >
                {isConnecting ? 'Connecting...' : 'Test Connection'}
              </Button>

              {isConnected && (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Connected to {connection.database}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query Interface */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5 text-primary" />
                Query 1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Select Table</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        placeholder="Search tables... (e.g., BOOK, DOC850)"
                        value={tableSearchTerm}
                        onChange={(e) => setTableSearchTerm(e.target.value)}
                        disabled={!isConnected || availableTables.length === 0}
                        className="pr-8"
                      />
                      {tableSearchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() => setTableSearchTerm('')}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                    {isConnected && availableTables.length > 0 && (
                      <div className="max-h-60 overflow-y-auto border rounded-md">
                        <div className="p-2 text-xs text-muted-foreground border-b flex justify-between items-center">
                          <span>
                            {filteredTables.length} of {availableTables.length} tables
                            {tableSearchTerm && ` matching "${tableSearchTerm}"`}
                          </span>
                          {tableSearchTerm && filteredTables.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setTableSearchTerm('')}
                            >
                              Show All
                            </Button>
                          )}
                        </div>
                        {filteredTables.length > 0 ? (
                          filteredTables.map((table) => {
                            const tableName = table.name;
                            const tableSchema = typeof table === 'string' ? 'dbo' : table.schema;
                            const isSelected = selectedTableInfo && 
                              selectedTableInfo.name === tableName && 
                              selectedTableInfo.schema === tableSchema;
                            
                            return (
                              <div
                                key={`${tableSchema}.${tableName}`}
                                className={`p-2 cursor-pointer hover:bg-muted/50 text-sm ${
                                  isSelected ? 'bg-primary/10 text-primary font-medium' : ''
                                }`}
                                onClick={() => {
                                  setSelectedTable(tableName);
                                  setSelectedTableInfo({ name: tableName, schema: tableSchema });
                                }}
                                title={`Schema: ${tableSchema}`}
                              >
                                <div className="flex justify-between items-center">
                                  <span>{tableName}</span>
                                  {tableSchema !== 'dbo' && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {tableSchema}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            {tableSearchTerm ? `No tables found matching "${tableSearchTerm}"` : 'No tables available'}
                          </div>
                        )}
                      </div>
                    )}
                    {!isConnected && (
                      <p className="text-xs text-muted-foreground">
                        Connect to database to see available tables
                      </p>
                    )}
                  </div>
                </div>
                
                {selectedTableInfo && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Will execute: <code className="bg-muted px-2 py-1 rounded text-xs">
                          SELECT TOP 1000 * FROM [{selectedTableInfo.schema}].[{selectedTableInfo.name}]
                        </code>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTable('');
                          setSelectedTableInfo(null);
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        title="Unselect table to use custom query"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="customQuery">Custom SQL Query</Label>
                    {selectedTableInfo && customQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomQuery('')}
                        className="h-6 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="customQuery"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder={selectedTableInfo ? "Custom query will override table selection" : "SELECT * FROM your_table WHERE condition = 'value'"}
                    className="min-h-[120px] font-mono text-sm"
                    disabled={!isConnected}
                  />
                  {selectedTableInfo && customQuery && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        ⚠️ Custom query will override table selection
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {queryError && (
                <Alert variant="destructive">
                  <AlertDescription>{queryError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={executeQuery}
                disabled={!isConnected || isExecuting || (!selectedTableInfo && !customQuery.trim())}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {isExecuting ? 'Executing...' : (customQuery.trim() ? 'Execute Custom Query' : 'Execute Query')}
              </Button>

              {queryResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {queryResult.rowCount} rows
                      </Badge>
                      <Badge variant="outline">
                        {queryResult.executionTime}ms
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportQueryResult}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query 2 Interface */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5 text-primary" />
                Query 2
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Selector */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={query2Mode === 'database' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuery2Mode('database')}
                >
                  Database Query
                </Button>
                <Button
                  variant={query2Mode === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuery2Mode('file')}
                >
                  Upload File
                </Button>
              </div>

              {query2Mode === 'file' ? (
                <FileUpload
                  onFileUpload={handleFile2Upload}
                  title="Upload CSV/Excel File for Comparison"
                  uploadedFile={uploadedFileName2}
                />
              ) : (
                <div className="space-y-4">
                <div>
                  <Label>Select Table</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        placeholder="Search tables... (e.g., BOOK, DOC850)"
                        value={tableSearchTerm2}
                        onChange={(e) => setTableSearchTerm2(e.target.value)}
                        disabled={!isConnected || availableTables.length === 0}
                        className="pr-8"
                      />
                      {tableSearchTerm2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() => setTableSearchTerm2('')}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                    {isConnected && availableTables.length > 0 && (
                      <div className="max-h-60 overflow-y-auto border rounded-md">
                        <div className="p-2 text-xs text-muted-foreground border-b flex justify-between items-center">
                          <span>
                            {availableTables.filter(table => {
                              const tableName = table.name;
                              const searchTerm = tableSearchTerm2.toLowerCase().trim();
                              if (!searchTerm) return true;
                              const exactMatch = tableName.toLowerCase() === searchTerm;
                              const containsMatch = tableName.toLowerCase().includes(searchTerm);
                              return exactMatch || containsMatch;
                            }).length} of {availableTables.length} tables
                            {tableSearchTerm2 && ` matching "${tableSearchTerm2}"`}
                          </span>
                          {tableSearchTerm2 && availableTables.filter(table => {
                            const tableName = table.name;
                            const searchTerm = tableSearchTerm2.toLowerCase().trim();
                            if (!searchTerm) return true;
                            const exactMatch = tableName.toLowerCase() === searchTerm;
                            const containsMatch = tableName.toLowerCase().includes(searchTerm);
                            return exactMatch || containsMatch;
                          }).length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => setTableSearchTerm2('')}
                            >
                              Show All
                            </Button>
                          )}
                        </div>
                        {availableTables.filter(table => {
                          const tableName = table.name;
                          const searchTerm = tableSearchTerm2.toLowerCase().trim();
                          if (!searchTerm) return true;
                          const exactMatch = tableName.toLowerCase() === searchTerm;
                          const containsMatch = tableName.toLowerCase().includes(searchTerm);
                          return exactMatch || containsMatch;
                        }).length > 0 ? (
                          availableTables.filter(table => {
                            const tableName = table.name;
                            const searchTerm = tableSearchTerm2.toLowerCase().trim();
                            if (!searchTerm) return true;
                            const exactMatch = tableName.toLowerCase() === searchTerm;
                            const containsMatch = tableName.toLowerCase().includes(searchTerm);
                            return exactMatch || containsMatch;
                          }).map((table) => {
                            const tableName = table.name;
                            const tableSchema = typeof table === 'string' ? 'dbo' : table.schema;
                            const isSelected = selectedTableInfo2 && 
                              selectedTableInfo2.name === tableName && 
                              selectedTableInfo2.schema === tableSchema;
                            
                            return (
                              <div
                                key={`${tableSchema}.${tableName}`}
                                className={`p-2 cursor-pointer hover:bg-muted/50 text-sm ${
                                  isSelected ? 'bg-primary/10 text-primary font-medium' : ''
                                }`}
                                onClick={() => {
                                  setSelectedTable2(tableName);
                                  setSelectedTableInfo2({ name: tableName, schema: tableSchema });
                                }}
                                title={`Schema: ${tableSchema}`}
                              >
                                <div className="flex justify-between items-center">
                                  <span>{tableName}</span>
                                  {tableSchema !== 'dbo' && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {tableSchema}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            {tableSearchTerm2 ? `No tables found matching "${tableSearchTerm2}"` : 'No tables available'}
                          </div>
                        )}
                      </div>
                    )}
                    {!isConnected && (
                      <p className="text-xs text-muted-foreground">
                        Connect to database to see available tables
                      </p>
                    )}
                  </div>
                </div>
                
                {selectedTableInfo2 && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Will execute: <code className="bg-muted px-2 py-1 rounded text-xs">
                          SELECT TOP 1000 * FROM [{selectedTableInfo2.schema}].[{selectedTableInfo2.name}]
                        </code>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTable2('');
                          setSelectedTableInfo2(null);
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        title="Unselect table to use custom query"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="customQuery2">Custom SQL Query</Label>
                    {selectedTableInfo2 && customQuery2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCustomQuery2('')}
                        className="h-6 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="customQuery2"
                    value={customQuery2}
                    onChange={(e) => setCustomQuery2(e.target.value)}
                    placeholder={selectedTableInfo2 ? "Custom query will override table selection" : "SELECT * FROM your_table WHERE condition = 'value'"}
                    className="min-h-[120px] font-mono text-sm"
                    disabled={!isConnected}
                  />
                  {selectedTableInfo2 && customQuery2 && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        ⚠️ Custom query will override table selection
                      </p>
                    </div>
                  )}
                </div>

                {queryError2 && (
                  <Alert variant="destructive">
                    <AlertDescription>{queryError2}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={executeQuery2}
                  disabled={!isConnected || isExecuting2 || (!selectedTableInfo2 && !customQuery2.trim())}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isExecuting2 ? 'Executing...' : (customQuery2.trim() ? 'Execute Custom Query' : 'Execute Query')}
                </Button>
                {queryResult2 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {queryResult2.rowCount} rows
                        </Badge>
                        <Badge variant="outline">
                          {queryResult2.executionTime}ms
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!queryResult2) return;
                          const fileName = `query-results-2-${new Date().toISOString().split('T')[0]}.xlsx`;
                          await ExcelUtils.exportToExcel(queryResult2.data, fileName, 'Query Results 2');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Query Results */}
        {(queryResult || queryResult2) && (
          <div className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {queryResult && (
                <DataPreview
                  data={queryResult.data}
                  fileName={customQuery.trim() ? 'Custom Query' : (selectedTableInfo ? `${selectedTableInfo.schema}.${selectedTableInfo.name}` : 'Custom Query')}
                  title="Query 1 Results"
                  showAllRows={true}
                  maxHeight="h-96"
                />
              )}
              {(queryResult2 || uploadedFile2.length > 0) && (
                <DataPreview
                  data={queryResult2 ? queryResult2.data : uploadedFile2}
                  fileName={query2Mode === 'file' ? uploadedFileName2 : (customQuery2.trim() ? 'Custom Query 2' : (selectedTableInfo2 ? `${selectedTableInfo2.schema}.${selectedTableInfo2.name}` : 'Custom Query 2'))}
                  title={query2Mode === 'file' ? 'Uploaded File' : 'Query 2 Results'}
                  showAllRows={true}
                  maxHeight="h-96"
                />
              )}
            </div>
          </div>
        )}

        {/* Data Comparison */}
        {(dataset1.length > 0 || dataset2.length > 0 || uploadedFile2.length > 0) && (
          <div className="mt-8">
            <DataComparison
              data1={dataset1}
              data2={dataset2}
              fileName1={fileName1}
              fileName2={fileName2}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Database;
