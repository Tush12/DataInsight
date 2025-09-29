import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VirtualizedTable } from './VirtualizedTable';

interface DataPreviewProps {
  data: Record<string, unknown>[];
  fileName: string;
  title: string;
  showAllRows?: boolean;
  maxHeight?: string;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ data, fileName, title, showAllRows = true, maxHeight = "h-96" }) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Use VirtualizedTable for large datasets (more than 5000 rows)
  if (data.length > 5000) {
    return (
      <VirtualizedTable
        data={data}
        fileName={fileName}
        title={title}
        showAllRows={showAllRows}
        maxHeight={maxHeight}
        pageSize={1000}
      />
    );
  }

  const columns = Object.keys(data[0]);
  const displayData = showAllRows ? data : data.slice(0, 10); // Show all rows or first 10 rows

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{fileName}</Badge>
            <Badge variant="outline">{data.length} rows</Badge>
            <Badge variant="outline">{columns.length} columns</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className={`${maxHeight} overflow-auto`}>
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
                  {displayData.map((row, rowIndex) => (
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
        </div>
        {!showAllRows && data.length > 10 && (
          <p className="text-sm text-muted-foreground mt-4">
            Showing first 10 rows of {data.length} total rows
          </p>
        )}
        {showAllRows && data.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            Showing all {data.length} rows
          </p>
        )}
      </CardContent>
    </Card>
  );
};