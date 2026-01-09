
import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Feed } from '../components/Feed';
import { RightPanel } from '../components/RightPanel';
import { AdminPanel } from '../components/AdminPanel';
import { Profile } from '../components/Profile';
import { FriendsPage } from '../components/FriendsPage';
import { MemoriesPage } from '../components/MemoriesPage';
import { SavedPage } from '../components/SavedPage';
import { Header } from '../components/Header';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewedProfileUid, setViewedProfileUid] = useState<string | null>(null);
  const { userProfile } = useAuth();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      // If manually clicking profile tab, reset to own profile
      setViewedProfileUid(null);
    }
  };

  const handleViewProfile = (uid: string) => {
    setViewedProfileUid(uid);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed />;
      case 'profile':
        return <Profile targetUid={viewedProfileUid} />;
      case 'friends':
        return <FriendsPage onViewProfile={handleViewProfile} />;
      case 'memories':
        return <MemoriesPage />;
      case 'bookmarks':
        return <SavedPage />;
      case 'admin':
        return <AdminPanel />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
             <div className="w-24 h-24 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-sm border border-white">
               <span className="text-4xl">🚧</span>
             </div>
             <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Coming Soon</h2>
             <p className="text-slate-500 text-center max-w-md text-lg">
               The <span className="font-bold text-synapse-600 capitalize">{activeTab}</span> experience is currently being crafted for the 2026 release.
             </p>
          </div>
        );
    }
  };

  // Wide layout for everything except Feed (which mimics FB's narrow feed)
  // Memories page is somewhat wide but centered, similar to profile
  // Saved page is also centered but potentially wider than feed
  const isWidePage = activeTab === 'friends' || activeTab === 'admin' || activeTab === 'profile' || activeTab === 'memories' || activeTab === 'bookmarks';

  return (
    <div className="min-h-screen bg-[#F0F2F5] relative selection:bg-synapse-200 selection:text-synapse-900">
      
      {/* 2026 Subtle Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-multiply">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[120px]" />
         <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-200/20 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative z-10">
        <Header activeTab={activeTab} setActiveTab={handleTabChange} />

        {/* Increased top padding (pt-24) to account for the floating header island */}
        <div className="pt-24 flex justify-between min-h-screen">
          
          {/* Left Sidebar */}
          <div className="hidden lg:block w-[280px] xl:w-[360px] flex-shrink-0 z-20">
            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
          </div>

          {/* Center Content */}
          {/* If isWidePage, use max-w-[1600px] to fill space between sidebars. */}
          <div className={cn(
            "flex-1 w-full mx-auto py-6 transition-all duration-300 min-w-0 z-10",
            isWidePage ? "px-2 md:px-4 max-w-[1600px]" : "max-w-[740px] lg:px-8"
          )}>
            {renderContent()}
          </div>

          {/* Right Panel - Always visible on LG screens and up to mimic Facebook */}
          <div className="hidden lg:block w-[280px] xl:w-[360px] flex-shrink-0 z-20">
            <RightPanel />
          </div>

        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl pt-24 px-6 lg:hidden animate-in fade-in slide-in-from-bottom-10">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full"
            >
              <X />
            </button>
            <div className="space-y-4">
              {['Feed', 'Friends', 'Explore', 'Watch', 'Marketplace', 'Groups', 'Profile'].map((item) => (
                <button 
                  key={item}
                  onClick={() => { handleTabChange(item.toLowerCase() === 'watch' ? 'videos' : item.toLowerCase()); setMobileMenuOpen(false); }}
                  className="block w-full text-left text-2xl font-bold text-slate-800 py-4 border-b border-slate-100 hover:text-synapse-600 transition-colors"
                >
                  {item}
                </button>
              ))}
              <button 
                  onClick={() => { handleTabChange('admin'); setMobileMenuOpen(false); }}
                  className="block w-full text-left text-2xl font-black text-synapse-600 py-4 border-b border-slate-100"
              >
                Admin Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
