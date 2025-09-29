import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualizedTableProps {
  data: any[];
  fileName: string;
  title: string;
  showAllRows?: boolean;
  maxHeight?: string;
  pageSize?: number;
}

export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({ 
  data, 
  fileName, 
  title, 
  showAllRows = true, 
  maxHeight = "h-96",
  pageSize = 1000
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  
  if (!data || data.length === 0) {
    return null;
  }

  const columns = Object.keys(data[0]);
  const totalPages = Math.ceil(data.length / pageSize);
  
  // For large datasets, use pagination; for smaller ones, show all
  const shouldPaginate = data.length > pageSize;
  const displayData = shouldPaginate 
    ? data.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : data;

  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, data.length);

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
        
        {shouldPaginate && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages} ({startRow}-{endRow} of {data.length} rows)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {displayData.length} rows per page
            </div>
          </div>
        )}
        
        {!shouldPaginate && data.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            Showing all {data.length} rows
          </p>
        )}
      </CardContent>
    </Card>
  );
};
