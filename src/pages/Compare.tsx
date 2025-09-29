import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/FileUpload';
import { DataPreview } from '@/components/DataPreview';
import { DataComparison } from '@/components/DataComparison';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Compare = () => {
  const [dataset1, setDataset1] = useState<any[]>([]);
  const [dataset2, setDataset2] = useState<any[]>([]);
  const [fileName1, setFileName1] = useState<string>('');
  const [fileName2, setFileName2] = useState<string>('');

  const handleFile1Upload = (data: any[], fileName: string) => {
    setDataset1(data);
    setFileName1(fileName);
  };

  const handleFile2Upload = (data: any[], fileName: string) => {
    setDataset2(data);
    setFileName2(fileName);
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
          <h1 className="text-4xl font-bold mb-4">Data Comparison Tool</h1>
          <p className="text-xl text-muted-foreground">
            Upload two datasets to compare and analyze differences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <FileUpload
            onFileUpload={handleFile1Upload}
            title="Upload First Dataset"
            uploadedFile={fileName1}
          />
          <FileUpload
            onFileUpload={handleFile2Upload}
            title="Upload Second Dataset"
            uploadedFile={fileName2}
          />
        </div>

        {(dataset1.length > 0 || dataset2.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {dataset1.length > 0 && (
              <DataPreview
                data={dataset1}
                fileName={fileName1}
                title="Dataset 1 Preview"
                showAllRows={true}
                maxHeight="h-96"
              />
            )}
            {dataset2.length > 0 && (
              <DataPreview
                data={dataset2}
                fileName={fileName2}
                title="Dataset 2 Preview"
                showAllRows={true}
                maxHeight="h-96"
              />
            )}
          </div>
        )}

        <DataComparison
          data1={dataset1}
          data2={dataset2}
          fileName1={fileName1}
          fileName2={fileName2}
        />
      </div>
      <Footer />
    </div>
  );
};

export default Compare;