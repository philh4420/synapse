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

  const getHeaderProps = () => {
    switch (activeTab) {
      case 'feed': return { title: 'Home', showTabs: true };
      case 'explore': return { title: 'Explore', showTabs: false };
      case 'notifications': return { title: 'Notifications', showTabs: false };
      case 'messages': return { title: 'Messages', showTabs: false };
      case 'bookmarks': return { title: 'Bookmarks', showTabs: false };
      case 'profile': return { title: userProfile?.displayName || 'Profile', showTabs: false };
      case 'admin': return { title: 'Admin Panel', showTabs: false };
      default: return { title: 'Synapse', showTabs: false };
    }
  };

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
          <div className="flex items-center justify-center h-[80vh] text-slate-400">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-300 mb-2">Coming Soon</h2>
              <p>This section is under construction for 2026.</p>
            </div>
          </div>
        );
    }
  };

  const headerProps = getHeaderProps();

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-synapse-600 to-synapse-400">
          Synapse
        </span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-20 px-6 lg:hidden animate-fade-in">
          <div className="space-y-4">
            {['Feed', 'Explore', 'Notifications', 'Messages', 'Profile'].map((item) => (
              <button 
                key={item}
                onClick={() => { setActiveTab(item.toLowerCase()); setMobileMenuOpen(false); }}
                className="block w-full text-left text-lg font-medium text-slate-800 py-3 border-b border-slate-100"
              >
                {item}
              </button>
            ))}
            {userProfile?.role === 'admin' && (
              <button 
                onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-lg font-bold text-synapse-600 py-3 border-b border-slate-100"
              >
                Admin Panel
              </button>
            )}
          </div>
        </div>
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 w-full max-w-2xl mt-14 lg:mt-0 min-h-screen border-x border-slate-200/60 bg-white/50">
        <Header title={headerProps.title} showTabs={headerProps.showTabs} />
        <div className="lg:pt-4">
           {renderContent()}
        </div>
      </main>

      <RightPanel />
    </div>
  );
};