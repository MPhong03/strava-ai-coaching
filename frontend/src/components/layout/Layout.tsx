import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import AiPartnerFab from './AiPartnerFab';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar />
      
      {/* Container chính với khoảng cách StatusBar cho Mobile */}
      <main className="flex-1 pt-[env(safe-area-inset-top,0px)] pb-safe">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <AiPartnerFab />
      <BottomNav />
    </div>
  );
};

export default Layout;
