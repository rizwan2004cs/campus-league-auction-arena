import { Link, NavLink } from 'react-router-dom';
import { ExternalLink, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const navLinks = [
  { path: '/dashboard', label: 'Players' },
  { path: '/teams', label: 'Teams' },
  { path: '/auction', label: 'Auction' },
  { path: '/summary', label: 'Summary' },
  { path: '/settings', label: 'Settings' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-2 text-[15px] transition-colors',
    isActive ? 'bg-raised font-semibold text-ink' : 'text-soft hover:bg-raised hover:text-ink',
  );

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="relative z-50 px-3 pt-3 md:px-6">
      <div className="floating-bar mx-auto flex h-14 max-w-[1560px] items-center justify-between gap-4 px-3 md:px-4">
        <Link to="/" className="flex items-center gap-3 rounded-lg">
          <img src="/icons/logo.png" alt="" className="h-8 w-auto" />
          <span className="hidden text-[15px] font-semibold text-ink sm:inline">Campus Premier League</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Organiser">
          {navLinks.map(({ path, label }) => (
            <NavLink key={path} to={path} className={linkClass}>{label}</NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <Link to="/public" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] text-soft transition-colors hover:bg-raised hover:text-ink">
            Public view <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] text-soft transition-colors hover:bg-raised hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-raised md:hidden"
          onClick={() => setIsMenuOpen(open => !open)}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="floating-bar mx-auto mt-2 flex max-w-[1560px] flex-col gap-1 p-3 md:hidden" aria-label="Organiser">
          {navLinks.map(({ path, label }) => (
            <NavLink key={path} to={path} className={linkClass} onClick={() => setIsMenuOpen(false)}>{label}</NavLink>
          ))}
          <Link to="/public" className="rounded-lg px-3 py-2 text-[15px] text-soft hover:bg-raised" onClick={() => setIsMenuOpen(false)}>Public view</Link>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-left text-[15px] text-soft hover:bg-raised"
            onClick={() => { logout(); setIsMenuOpen(false); }}
          >
            Log out
          </button>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
