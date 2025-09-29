import React, { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onFileUpload: (data: any[], fileName: string) => void;
  title: string;
  uploadedFile?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, title, uploadedFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback((file: File) => {
    setIsProcessing(true);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          onFileUpload(results.data, file.name);
          setIsProcessing(false);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          setIsProcessing(false);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          onFileUpload(jsonData, file.name);
          setIsProcessing(false);
        } catch (error) {
          console.error('Excel parsing error:', error);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a CSV or Excel file');
      setIsProcessing(false);
    }
  }, [onFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  return (
    <Card className="border-2 border-dashed transition-all duration-300 hover:shadow-medium">
      <CardContent className="p-8">
        <div
          className={`text-center transition-all duration-300 ${
            isDragOver ? 'scale-105' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {uploadedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-primary">
                <FileText className="h-8 w-8" />
                <span className="font-medium">{uploadedFile}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFileUpload([], '')}
              >
                <X className="h-4 w-4 mr-2" />
                Remove File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className={`h-12 w-12 transition-colors duration-300 ${
                  isDragOver ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your CSV or Excel file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                  id={`file-${title}`}
                />
                <label htmlFor={`file-${title}`}>
                  <Button variant="data" asChild disabled={isProcessing}>
                    <span>
                      {isProcessing ? 'Processing...' : 'Choose File'}
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports CSV, XLSX, and XLS files up to 100MB
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};