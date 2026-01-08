import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Feed } from '../components/Feed';
import { RightPanel } from '../components/RightPanel';
import { AdminPanel } from '../components/AdminPanel';
import { Profile } from '../components/Profile';
import { Header } from '../components/Header';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  return (
    <div className="min-h-screen bg-[#F0F2F5]"> {/* Facebook-like background color */}
      
      {/* Fixed Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Container */}
      <div className="pt-14 flex justify-center min-h-screen">
        
        {/* Left Sidebar (Shortcuts) - Fixed */}
        <div className="hidden lg:block w-[280px] xl:w-[360px] flex-shrink-0">
           <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Center Content (Feed/Profile) - Scrollable */}
        <div className="flex-1 max-w-[740px] w-full mx-auto lg:px-8 py-6">
           {renderContent()}
        </div>

        {/* Right Sidebar (Contacts/Ads) - Fixed */}
        <div className="hidden lg:block w-[280px] xl:w-[360px] flex-shrink-0">
           <RightPanel />
        </div>

      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white pt-20 px-6 lg:hidden animate-fade-in">
          <button 
             onClick={() => setMobileMenuOpen(false)}
             className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"
          >
             <X />
          </button>
          <div className="space-y-4">
            {['Feed', 'Explore', 'Watch', 'Marketplace', 'Groups', 'Profile'].map((item) => (
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