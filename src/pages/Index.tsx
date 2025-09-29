import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { BarChart3, Upload, GitCompare, Download, Database, Code } from 'lucide-react';
import heroImage from '@/assets/data-hero.jpg';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Data Compare & Visualize
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-6 md:mb-8 px-2">
              Professional data comparison and analysis platform. Compare, visualize, and transform your data with powerful insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-8 md:mb-12 px-2">
              <Link to="/compare" className="w-full sm:w-auto">
                <Button variant="hero" size="lg" className="w-full">
                  <GitCompare className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Start Comparing Data</span>
                </Button>
              </Link>
              <Link to="/visualize" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Visualize Data</span>
                </Button>
              </Link>
              <Link to="/database" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Query Database</span>
                </Button>
              </Link>
            </div>
            <div className="relative max-w-4xl mx-auto">
              <img 
                src={heroImage} 
                alt="Data visualization dashboard" 
                className="rounded-lg shadow-large w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">DataInsight Features</h2>
            <p className="text-lg md:text-xl text-muted-foreground px-2">Everything you need to compare and analyze your datasets</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            <Card className="hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <Upload className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Easy File Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Drag and drop CSV or Excel files. Supports large datasets with fast processing and intuitive interface.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <GitCompare className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Smart Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Compare datasets by any column. Identify matches, mismatches, and unique records with advanced algorithms.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <Code className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Code Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Compare two sets of code to identify differences, additions, and modifications with line-by-line analysis.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Visual Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Interactive data previews and comparison results with color-coded highlighting for easy analysis.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <Download className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Export Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Export comparison results in multiple formats. Save matches, mismatches, and analysis reports.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-medium transition-all duration-300">
              <CardHeader>
                <Database className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Database Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Connect directly to SQL Server databases. Query tables, run custom SQL, and compare with file data.
                </p>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 px-4 bg-card">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">Ready to Get DataInsight?</h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 px-2">
            Start analyzing your datasets today with our powerful data comparison platform
          </p>
          <Link to="/compare">
            <Button variant="hero" size="lg" className="w-full sm:w-auto">
              <GitCompare className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="text-sm sm:text-base">Get Started Now</span>
            </Button>
          </Link>
        </div>
      </section>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
