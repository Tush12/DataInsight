import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code, FileText, Download, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface CodeDifference {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  lineNumber: number;
  content: string;
  originalContent?: string;
}

interface ComparisonResult {
  differences: CodeDifference[];
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  unchangedLines: number;
  similarity: number;
}

const CodeComparison = () => {
  const [code1, setCode1] = useState<string>('');
  const [code2, setCode2] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [showWhitespace, setShowWhitespace] = useState<boolean>(true);

  const compareCode = () => {
    if (!code1.trim() || !code2.trim()) {
      alert('Please enter code in both text areas');
      return;
    }

    const lines1 = code1.split('\n');
    const lines2 = code2.split('\n');
    
    const differences: CodeDifference[] = [];
    let addedLines = 0;
    let removedLines = 0;
    let modifiedLines = 0;
    let unchangedLines = 0;

    // Simple line-by-line comparison
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (i >= lines1.length) {
        // Line only exists in code2 (added)
        differences.push({
          type: 'added',
          lineNumber: i + 1,
          content: line2
        });
        addedLines++;
      } else if (i >= lines2.length) {
        // Line only exists in code1 (removed)
        differences.push({
          type: 'removed',
          lineNumber: i + 1,
          content: line1
        });
        removedLines++;
      } else if (line1 === line2) {
        // Lines are identical
        differences.push({
          type: 'unchanged',
          lineNumber: i + 1,
          content: line1
        });
        unchangedLines++;
      } else {
        // Lines are different (modified)
        differences.push({
          type: 'modified',
          lineNumber: i + 1,
          content: line2,
          originalContent: line1
        });
        modifiedLines++;
      }
    }

    const totalLines = differences.length;
    const similarity = totalLines > 0 ? (unchangedLines / totalLines) * 100 : 100;

    setComparisonResult({
      differences,
      addedLines,
      removedLines,
      modifiedLines,
      unchangedLines,
      similarity
    });
  };

  const clearComparison = () => {
    setCode1('');
    setCode2('');
    setComparisonResult(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportComparison = () => {
    if (!comparisonResult) return;

    const diffContent = comparisonResult.differences
      .map(diff => {
        const prefix = diff.type === 'added' ? '+' : 
                      diff.type === 'removed' ? '-' : 
                      diff.type === 'modified' ? '~' : ' ';
        return `${prefix} ${diff.lineNumber.toString().padStart(3, ' ')}: ${diff.content}`;
      })
      .join('\n');

    const blob = new Blob([diffContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-comparison-${new Date().toISOString().split('T')[0]}.diff`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLineColor = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500';
      case 'removed': return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500';
      case 'modified': return 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500';
      default: return 'bg-transparent';
    }
  };

  const getLineIcon = (type: string) => {
    switch (type) {
      case 'added': return '+';
      case 'removed': return '-';
      case 'modified': return '~';
      default: return ' ';
    }
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
          <h1 className="text-4xl font-bold mb-4">Code Comparison Tool</h1>
          <p className="text-xl text-muted-foreground">
            Compare two sets of code to identify differences, additions, and modifications
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Original Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your original code here..."
                value={code1}
                onChange={(e) => setCode1(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">
                  {code1.split('\n').length} lines
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(code1)}
                  disabled={!code1.trim()}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Modified Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your modified code here..."
                value={code2}
                onChange={(e) => setCode2(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">
                  {code2.split('\n').length} lines
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(code2)}
                  disabled={!code2.trim()}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mb-8">
          <Button onClick={compareCode} disabled={!code1.trim() || !code2.trim()}>
            <Code className="h-4 w-4 mr-2" />
            Compare Code
          </Button>
          <Button variant="outline" onClick={clearComparison}>
            Clear All
          </Button>
          {comparisonResult && (
            <Button variant="outline" onClick={exportComparison}>
              <Download className="h-4 w-4 mr-2" />
              Export Diff
            </Button>
          )}
        </div>

        {comparisonResult && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonResult.addedLines}
                  </div>
                  <div className="text-sm text-muted-foreground">Added</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {comparisonResult.removedLines}
                  </div>
                  <div className="text-sm text-muted-foreground">Removed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {comparisonResult.modifiedLines}
                  </div>
                  <div className="text-sm text-muted-foreground">Modified</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.unchangedLines}
                  </div>
                  <div className="text-sm text-muted-foreground">Unchanged</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {comparisonResult.similarity.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Similarity</div>
                </CardContent>
              </Card>
            </div>

            {/* Comparison Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Comparison Results</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLineNumbers(!showLineNumbers)}
                    >
                      {showLineNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showLineNumbers ? 'Hide' : 'Show'} Line Numbers
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWhitespace(!showWhitespace)}
                    >
                      {showWhitespace ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showWhitespace ? 'Hide' : 'Show'} Whitespace
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="font-mono text-sm">
                    {comparisonResult.differences.map((diff, index) => (
                      <div
                        key={index}
                        className={`flex items-start p-1 ${getLineColor(diff.type)}`}
                      >
                        <div className="flex items-center gap-2 min-w-[60px]">
                          <span className="text-xs font-bold w-4 text-center">
                            {getLineIcon(diff.type)}
                          </span>
                          {showLineNumbers && (
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {diff.lineNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="whitespace-pre-wrap">
                            {showWhitespace ? diff.content : diff.content.trim()}
                          </div>
                          {diff.type === 'modified' && diff.originalContent && (
                            <div className="text-xs text-muted-foreground mt-1 pl-4">
                              Original: {showWhitespace ? diff.originalContent : diff.originalContent.trim()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CodeComparison;
