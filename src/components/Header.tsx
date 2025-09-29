import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, GitCompare, BarChart3, Database, Sun, Moon, TrendingUp, ArrowUpDown, Code, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

const Header = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Dynamic icon color based on theme
  const iconColorClass = theme === 'dark' ? 'text-white' : 'text-primary';

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/compare', label: 'Comparison', icon: GitCompare },
    { path: '/code-comparison', label: 'Code Compare', icon: Code },
    { path: '/visualize', label: 'Data Visualizer', icon: BarChart3 },
    { path: '/transform', label: 'Transform', icon: ArrowUpDown },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp },
    { path: '/database', label: 'Database', icon: Database },
  ];

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-red-600" />
            <span className="font-bold text-lg">DataInsight</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className="flex items-center space-x-2"
                >
                  <Link to={item.path}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : iconColorClass}`} />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="ml-2"
            >
              {theme === 'dark' ? (
                <Sun className={`h-4 w-4 ${iconColorClass}`} />
              ) : (
                <Moon className={`h-4 w-4 ${iconColorClass}`} />
              )}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className={`h-4 w-4 ${iconColorClass}`} />
              ) : (
                <Moon className={`h-4 w-4 ${iconColorClass}`} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className={`h-5 w-5 ${iconColorClass}`} />
              ) : (
                <Menu className={`h-5 w-5 ${iconColorClass}`} />
              )}
            </Button>
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    asChild
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link to={item.path} className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : iconColorClass}`} />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;