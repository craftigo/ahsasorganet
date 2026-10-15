import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Coins, Shield, LayoutDashboard, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const showFund = Boolean(settings.show_fund_collection);
  const showPrograms = Boolean(settings.show_programs_page);
  const showMembership = Boolean(settings.show_membership_page);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const dashboardPath = isAdmin ? '/admin' : '/dashboard';

  return (
    <header className="w-full sticky top-0 z-[100] glass-dark shadow-md bg-gray-900 text-white border-b border-maroon">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Brand */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
            <img
              src="/assets/ahsas logo png logo.png"
              alt="AHSAS Logo"
              className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-white">AHSAS</span>
              <span className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold -mt-1">Activity Portal</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-2 items-center text-sm font-semibold">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg transition-colors ${
                isActive('/') ? 'text-white bg-maroon' : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              HOME
            </Link>
            <Link
              to="/leaderboard"
              className={`px-3 py-2 rounded-lg transition-colors ${
                isActive('/leaderboard') ? 'text-white bg-maroon' : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              RANKING
            </Link>
            {showMembership && (
              <Link
                to="/membership"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isActive('/membership') ? 'text-white bg-maroon' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                MEMBERSHIP
              </Link>
            )}
            <Link
              to="/committees"
              className={`px-3 py-2 rounded-lg transition-colors ${
                isActive('/committees') ? 'text-white bg-maroon' : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              COMMITTEE
            </Link>
            {showPrograms && (
              <Link
                to="/programs"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isActive('/programs') ? 'text-white bg-maroon' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                PROGRAMS
              </Link>
            )}
            <Link
              to="/notifications"
              className={`px-3 py-2 rounded-lg transition-colors ${
                isActive('/notifications') ? 'text-white bg-maroon' : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              NOTIFICATIONS
            </Link>
            <Link
              to="/help"
              className={`px-3 py-2 rounded-lg transition-colors ${
                isActive('/help') ? 'text-white bg-maroon' : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              HELP
            </Link>
            {showFund && (
              <Link
                to="/fund-collection"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black text-white bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 shadow-md shadow-yellow-500/20 animate-pulse-subtle ml-1"
              >
                <Coins className="w-3.5 h-3.5 text-yellow-200" />
                <span>FUND</span>
              </Link>
            )}

            {/* Auth Actions */}
            <div className="ml-4 border-l border-gray-700 pl-4 flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={dashboardPath}
                    className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition shadow-sm"
                  >
                    {isAdmin ? <Shield className="w-3.5 h-3.5 text-maroon" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
                    <span>{isAdmin ? 'ADMIN' : 'DASHBOARD'}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="flex items-center gap-1 text-xs font-bold bg-red-600/80 hover:bg-red-600 text-white px-2.5 py-2 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 bg-maroon text-white px-5 py-2 rounded-full text-xs font-black hover:bg-maroon-dark transition shadow-lg shadow-maroon/30"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>LOGIN</span>
                </Link>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            {user && (
              <Link
                to={dashboardPath}
                className="text-xs font-bold bg-maroon text-white px-3 py-1.5 rounded-lg mr-2"
              >
                {isAdmin ? 'ADMIN' : 'DASH'}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-maroon p-2 rounded-lg transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-gray-900 border-t border-gray-800 px-4 pt-3 pb-6 space-y-2 animate-fade-in shadow-2xl">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block hover:bg-maroon px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            HOME
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block hover:bg-maroon px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            RANKING
          </Link>
          {showMembership && (
            <Link
              to="/membership"
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:bg-maroon px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              MEMBERSHIP
            </Link>
          )}
          <Link
            to="/committees"
            onClick={() => setMobileMenuOpen(false)}
            className="block hover:bg-maroon px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            COMMITTEE
          </Link>
          {showPrograms && (
            <Link
              to="/programs"
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:bg-maroon px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              PROGRAMS
            </Link>
          )}
          <Link
            to="/notifications"
            onClick={() => setMobileMenuOpen(false)}
            className="block hover:bg-maroon px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            NOTIFICATIONS
          </Link>
          <Link
            to="/help"
            onClick={() => setMobileMenuOpen(false)}
            className="block hover:bg-maroon px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            HELP
          </Link>
          {showFund && (
            <Link
              to="/fund-collection"
              onClick={() => setMobileMenuOpen(false)}
              className="block bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-black px-4 py-2.5 rounded-xl text-sm shadow-md transition"
            >
              💰 FUND COLLECTION
            </Link>
          )}

          <div className="pt-4 border-t border-gray-800">
            {user ? (
              <div className="flex gap-2">
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition"
                >
                  {isAdmin ? 'ADMIN COMMAND CENTER' : 'UNIT DASHBOARD'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center bg-maroon text-white font-black py-2.5 rounded-xl text-sm shadow-lg"
              >
                LOGIN
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
