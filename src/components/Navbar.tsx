
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navLinks = [
    { path: '/dashboard', label: 'Players' },
    { path: '/teams', label: 'Teams' },
    { path: '/auction', label: 'Auction' },
    { path: '/settings', label: 'Settings' },
  ];
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  if (!user) return null;
  
  return (
    <header className="gradient-header sticky top-0 left-0 right-0 z-50 shadow-md">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold">Campus League</span>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`text-white hover:text-opacity-80 transition-colors ${
                  isActive(path) ? 'font-medium border-b-2 border-white' : ''
                }`}
              >
                {label}
              </Link>
            ))}
            
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20" 
              onClick={() => logout()}
            >
              <LogOut className="h-5 w-5 mr-1" />
              Logout
            </Button>
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              className="text-white" 
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="md:hidden gradient-header pb-4 px-4">
          <nav className="flex flex-col space-y-3">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`text-white py-2 hover:text-opacity-80 ${
                  isActive(path) ? 'font-medium' : ''
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Button 
              variant="ghost" 
              className="text-white justify-start hover:bg-white/20" 
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
