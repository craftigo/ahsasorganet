import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 border-t border-gray-800 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <img src="/assets/ahsas logo png logo.png" alt="AHSAS Logo" className="h-7 w-auto object-contain" />
              <span className="text-xl font-black text-white tracking-wider">AHSAS</span>
            </div>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Anwarul Huda Students' Association portal for activity reporting, real-time leaderboard rankings, committee directories, and community fund collections.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-white transition">Home</Link></li>
              <li><Link to="/leaderboard" className="hover:text-white transition">Leaderboard Rankings</Link></li>
              <li><Link to="/committees" className="hover:text-white transition">Committees Directory</Link></li>
              <li><Link to="/notifications" className="hover:text-white transition">Circulars & Notices</Link></li>
              <li><Link to="/help" className="hover:text-white transition">Help & Guide</Link></li>
            </ul>
          </div>

          {/* Portal Access */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Portal Access</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/login" className="hover:text-white transition">Unit & Admin Login</Link></li>
              <li><Link to="/register" className="hover:text-white transition">Register Class Unit</Link></li>
              <li><Link to="/reset-password" className="hover:text-white transition">Password Recovery</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>&copy; {new Date().getFullYear()} Anwarul Huda Students' Association (AHSAS). All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-maroon fill-maroon" /> for excellence.
          </p>
        </div>
      </div>
    </footer>
  );
}
