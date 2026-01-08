
import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Feed } from '../components/Feed';
import { RightPanel } from '../components/RightPanel';
import { AdminPanel } from '../components/AdminPanel';
import { Profile } from '../components/Profile';
import { FriendsPage } from '../components/FriendsPage';
import { Header } from '../components/Header';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userProfile } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed />;
      case 'profile':
        return <Profile />;
      case 'friends':
        return <FriendsPage />;
      case 'admin':
        return <AdminPanel />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
             <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
               <span className="text-4xl">🚧</span>
             </div>
             <h2 className="text-2xl font-bold text-slate-700 mb-2">Coming Soon</h2>
             <p className="text-slate-500 text-center max-w-md">
               The <span className="font-semibold text-synapse-600 capitalize">{activeTab}</span> section is currently under development for the 2026 release.
             </p>
          </div>
        );
    }
  };

  // Wide layout for everything except Feed (which mimics FB's narrow feed)
  const isWidePage = activeTab === 'friends' || activeTab === 'admin' || activeTab === 'profile';

  return (
    <div className="min-h-screen bg-[#F0F2F5]"> 
      
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="pt-14 flex justify-between min-h-screen">
        
        {/* Left Sidebar */}
        <div className="hidden lg:block w-[280px] xl:w-[360px] flex-shrink-0 z-10">
           <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Center Content */}
        {/* If isWidePage, use max-w-[1600px] to fill space between sidebars. */}
        <div className={cn(
          "flex-1 w-full mx-auto py-6 transition-all duration-300 min-w-0",
          isWidePage ? "px-2 md:px-4 max-w-[1600px]" : "max-w-[740px] lg:px-8"
        )}>
           {renderContent()}
        </div>

        {/* Right Panel - Always visible on XL screens */}
        <div className="hidden xl:block w-[280px] xl:w-[360px] flex-shrink-0 z-10">
           <RightPanel />
        </div>

      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white pt-20 px-6 lg:hidden animate-fade-in">
          <button 
             onClick={() => setMobileMenuOpen(false)}
             className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"
          >
             <X />
          </button>
          <div className="space-y-4">
            {['Feed', 'Friends', 'Explore', 'Watch', 'Marketplace', 'Groups', 'Profile'].map((item) => (
              <button 
                key={item}
                onClick={() => { setActiveTab(item.toLowerCase() === 'watch' ? 'videos' : item.toLowerCase()); setMobileMenuOpen(false); }}
                className="block w-full text-left text-lg font-medium text-slate-800 py-3 border-b border-slate-100"
              >
                {item}
              </button>
            ))}
            <button 
                onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-lg font-bold text-synapse-600 py-3 border-b border-slate-100"
            >
              Admin Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
