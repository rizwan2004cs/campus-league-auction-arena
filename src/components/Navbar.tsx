
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
    <div className="pt-3 px-4 sticky top-0 z-50">
      <header className="glass-nav rounded-2xl md:rounded-full mx-auto max-w-5xl">
        <div className="px-5 md:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                <img src="/icons/logo.png" alt="Campus League" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-display font-extrabold tracking-tight text-[#1e293b]">
                Campus League
              </span>
            </Link>
            
            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive(path) 
                      ? 'bg-white/60 text-[#1e293b] shadow-sm font-bold' 
                      : 'text-[#334155] hover:text-[#1e293b] hover:bg-white/30'
                  }`}
                >
                  {label}
                </Link>
              ))}
              
              <div className="w-px h-6 bg-[#c8b0ff]/30 mx-2" />
              
              <Button 
                variant="ghost" 
                size="sm"
                className="text-[#334155] hover:bg-white/30 hover:text-[#1e293b] rounded-full font-medium text-sm" 
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </Button>
            </nav>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-[#1e293b] hover:bg-white/30 rounded-full" 
                onClick={toggleMenu}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[#c8b0ff]/15 px-5 pb-4 pt-2">
            <nav className="flex flex-col gap-1">
              {navLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(path) 
                      ? 'bg-white/50 text-[#1e293b] font-bold' 
                      : 'text-[#334155] hover:bg-white/25'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <Button 
                variant="ghost" 
                className="text-[#334155] justify-start hover:bg-white/25 rounded-xl mt-1 font-medium text-sm" 
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
};

export default Navbar;
