import React from 'react';
import { Search, Home, Compass, Users, LayoutGrid, MessageCircle, Bell, ChevronDown, Activity, Shield, Store, MonitorPlay } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { user, userProfile, logout } = useAuth();

  const navItems = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'videos', icon: MonitorPlay, label: 'Watch' },
    { id: 'marketplace', icon: Store, label: 'Marketplace' },
    { id: 'groups', icon: Users, label: 'Groups' },
  ];

  // Add Admin tab if user is admin
  if (userProfile?.role === 'admin') {
      navItems.push({ id: 'admin', icon: Shield, label: 'Admin' });
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-50 flex items-center justify-between px-4 select-none">
      {/* Left: Logo & Search */}
      <div className="flex items-center gap-2 z-50">
        <div 
          onClick={() => setActiveTab('feed')}
          className="w-10 h-10 bg-gradient-to-br from-synapse-600 to-synapse-700 rounded-full flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
        >
           <Activity className="text-white w-6 h-6" />
        </div>
        <div className="relative hidden xl:block ml-1">
           <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Search Synapse" 
             className="bg-slate-100 rounded-full py-2.5 pl-10 pr-4 w-60 text-[15px] focus:outline-none focus:ring-1 focus:ring-synapse-500 placeholder-slate-500 text-slate-900 transition-all hover:bg-slate-200/70"
           />
        </div>
        <div className="xl:hidden w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center cursor-pointer transition-colors">
            <Search className="text-slate-600 w-5 h-5" />
        </div>
      </div>

      {/* Center: Navigation */}
      <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-auto h-full absolute left-0 right-0 pointer-events-none">
         <div className="flex w-full justify-center h-full pointer-events-auto gap-1 lg:gap-2">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="flex-1 flex items-center justify-center relative group h-full max-w-[110px]"
                    title={item.label}
                >
                    <div className={`w-full max-w-[110px] h-[90%] my-auto mx-1 rounded-lg flex items-center justify-center transition-colors
                        ${activeTab === item.id ? '' : 'hover:bg-slate-100'}
                    `}>
                        <item.icon 
                          className={`w-[28px] h-[28px] transition-colors duration-200
                            ${activeTab === item.id ? 'text-synapse-600 fill-synapse-600' : 'text-slate-500 group-hover:text-slate-600'}
                          `} 
                          strokeWidth={activeTab === item.id ? 2.5 : 2} 
                        />
                    </div>
                    {activeTab === item.id && (
                        <div className="absolute bottom-0 h-[3px] bg-synapse-600 w-full max-w-[110px] rounded-t-full"></div>
                    )}
                </button>
            ))}
         </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 justify-end z-50">
        <div 
          className="hidden xl:flex items-center gap-2 hover:bg-slate-100 p-1 pr-3 pl-1 rounded-full cursor-pointer transition-colors select-none" 
          onClick={() => setActiveTab('profile')}
        >
             <img 
                src={userProfile?.photoURL || user?.photoURL || ''} 
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
                alt="Profile"
             />
             <span className="font-semibold text-[15px] text-slate-900">{userProfile?.displayName?.split(' ')[0]}</span>
        </div>

        <div className="flex gap-2">
          <button className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors text-slate-900">
              <LayoutGrid className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors text-slate-900">
              <MessageCircle className="w-5 h-5" />
          </button>
          <button 
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-slate-900
                ${activeTab === 'notifications' ? 'bg-synapse-100 text-synapse-600' : 'bg-slate-100 hover:bg-slate-200'}
              `}
              onClick={() => setActiveTab('notifications')}
          >
              <Bell className={`w-5 h-5 ${activeTab === 'notifications' ? 'fill-current' : ''}`} />
          </button>
          <button 
              className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors text-slate-900"
              onClick={logout}
              title="Sign Out"
          >
              <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};