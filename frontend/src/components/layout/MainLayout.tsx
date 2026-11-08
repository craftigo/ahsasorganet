import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export function MainLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans antialiased overflow-x-hidden w-full max-w-full">
      <Navbar />
      <main className="flex-grow w-full max-w-full flex flex-col overflow-x-hidden">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
