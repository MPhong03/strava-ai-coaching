import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AiPartnerFab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show FAB on the Chat page itself
  if (location.pathname === '/chat') return null;

  return (
    <button
      onClick={() => navigate('/chat')}
      className="fixed bottom-24 lg:bottom-10 right-6 w-14 h-14 bg-gray-900 dark:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group"
    >
      <div className="relative">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-orange-600 rounded-full"></span>
      </div>
      
      {/* Tooltip on hover */}
      <span className="absolute right-full mr-4 px-3 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Chat with AI Partner
      </span>
    </button>
  );
};

export default AiPartnerFab;
