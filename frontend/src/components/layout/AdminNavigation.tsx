import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, ClipboardList, LayoutDashboard, Sparkles } from 'lucide-react';

interface AdminNavigationProps {
  currentTab?: 'command-center' | 'edu-day';
  registrationCountBadge?: number;
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({ registrationCountBadge }) => {
  const location = useLocation();

  const isEduDayActive = location.pathname.startsWith('/admin/edu-day-registrations');
  const isCommandCenterActive = location.pathname === '/admin' || (!isEduDayActive && location.pathname.startsWith('/admin'));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200/80 p-2 mb-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" aria-label="Admin Sections">
          <Link
            to="/admin"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap ${
              isCommandCenterActive
                ? 'bg-maroon text-white shadow-md shadow-maroon/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Command Center</span>
          </Link>

          <Link
            to="/admin/edu-day-registrations"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap relative ${
              isEduDayActive
                ? 'bg-gradient-to-r from-amber-600 to-maroon text-white shadow-md shadow-amber-600/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>EDU DAY Registrations</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-amber-950 ml-1">
              <Sparkles className="w-2.5 h-2.5" />
              Workshop
            </span>
            {typeof registrationCountBadge === 'number' && registrationCountBadge > 0 && (
              <span className="ml-1.5 px-2 py-0.2 rounded-full text-xs font-black bg-white text-maroon shadow-sm">
                {registrationCountBadge}
              </span>
            )}
          </Link>
        </nav>

        {/* Quick status pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200/60 text-[11px] font-semibold text-gray-500">
          <Shield className="w-3.5 h-3.5 text-maroon" />
          <span>Authorized Admin Console</span>
        </div>
      </div>
    </div>
  );
};

export default AdminNavigation;
