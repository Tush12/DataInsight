import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUpload } from '@/components/FileUpload';
import { BarChart3, PieChart, TrendingUp, Donut, Download, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer, Pie } from 'recharts';
import { ExcelUtils } from '@/lib/excelUtils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ChartData {
  name: string;
  value: number;
}

interface AggregatedData {
  [key: string]: ChartData[];
}

const Visualize = () => {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [groupByColumn, setGroupByColumn] = useState<string>('');
  const [aggregateColumn, setAggregateColumn] = useState<string>('');
  const [aggregationMethod, setAggregationMethod] = useState<string>('');
  const [chartType, setChartType] = useState<string>('bar');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [showChart, setShowChart] = useState<boolean>(false);

  const COLORS = ['#DC2626', '#7F1D1D', '#EF4444', '#991B1B', '#B91C1C', '#FCA5A5'];

  const handleFileUpload = useCallback((data: any[], fileName: string) => {
    setUploadedData(data);
    setUploadedFileName(fileName);
    if (data.length > 0) {
      const cols = Object.keys(data[0]);
      setColumns(cols);
    }
    setShowChart(false);
  }, []);

  const generateChart = () => {
    if (!groupByColumn || !aggregateColumn || !aggregationMethod) return;

    const grouped: { [key: string]: any[] } = {};
    
    uploadedData.forEach(row => {
      const groupValue = String(row[groupByColumn] || 'Unknown');
      if (!grouped[groupValue]) {
        grouped[groupValue] = [];
      }
      grouped[groupValue].push(row);
    });

    const aggregated: ChartData[] = Object.keys(grouped).map(group => {
      const groupData = grouped[group];
      let value = 0;

      switch (aggregationMethod) {
        case 'count':
          value = groupData.length;
          break;
        case 'sum':
          value = groupData.reduce((sum, item) => {
            const val = parseFloat(item[aggregateColumn]) || 0;
            return sum + val;
          }, 0);
          break;
        case 'avg':
          const sum = groupData.reduce((sum, item) => {
            const val = parseFloat(item[aggregateColumn]) || 0;
            return sum + val;
          }, 0);
          value = sum / groupData.length;
          break;
        case 'max':
          value = Math.max(...groupData.map(item => parseFloat(item[aggregateColumn]) || 0));
          break;
        case 'min':
          value = Math.min(...groupData.map(item => parseFloat(item[aggregateColumn]) || 0));
          break;
        default:
          value = groupData.length;
      }

      return {
        name: group,
        value: Math.round(value * 100) / 100
      };
    });

    setChartData(aggregated);
    setShowChart(true);
  };

  const exportChart = async () => {
    const fileName = `chart_data_${Date.now()}.xlsx`;
    await ExcelUtils.exportToExcel(chartData, fileName, 'Chart Data');
  };

  const renderChart = () => {
    if (!showChart || chartData.length === 0) return null;

    const chartProps = {
      width: 800,
      height: 400,
      data: chartData,
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))'
                }} 
              />
              <Bar dataKey="value" fill="hsl(var(--data-primary))" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))'
                }} 
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--data-primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsPieChart>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))'
                }} 
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 60 : 0}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
        <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2 text-primary" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Data Visualizer</h1>
          <p className="text-muted-foreground">Upload your data and create interactive charts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Upload Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Upload Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileUpload={handleFileUpload}
                  title="Drop your file here"
                  uploadedFile={uploadedFileName}
                />
                {uploadedFileName && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Uploaded: {uploadedFileName} ({uploadedData.length} rows)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Data Processing Options */}
            {columns.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Data Processing Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="groupBy">Group By Column</Label>
                    <Select value={groupByColumn} onValueChange={setGroupByColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column to group by" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="aggregate">Aggregate Column</Label>
                    <Select value={aggregateColumn} onValueChange={setAggregateColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column to aggregate" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="method">Aggregation Method</Label>
                    <Select value={aggregationMethod} onValueChange={setAggregationMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select aggregation method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="chartType">Chart Type</Label>
                    <Select value={chartType} onValueChange={setChartType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chart type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                        <SelectItem value="donut">Donut Chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={generateChart} 
                    className="w-full"
                    disabled={!groupByColumn || !aggregateColumn || !aggregationMethod}
                  >
                    Generate Chart
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chart Display Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Chart Visualization
                  </CardTitle>
                  {showChart && (
                    <Button onClick={exportChart} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showChart ? (
                  <div className="w-full">
                    {renderChart()}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                    <TrendingUp className="h-16 w-16 mb-4 text-primary" />
                    <p className="text-lg">Upload data and configure options to generate charts</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart Data Table */}
            {showChart && chartData.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Chart Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium">Group</th>
                            <th className="text-left p-2 font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((item, index) => (
                            <tr key={index} className="border-b border-border hover:bg-muted/50">
                              <td className="p-2">{item.name}</td>
                              <td className="p-2">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
    </div>
  );
};

export default Visualize;