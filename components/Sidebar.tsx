import React from 'react';
import { Home, Compass, Bell, MessageSquare, User, Settings, LogOut, Bookmark, Activity, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, userProfile, logout } = useAuth();

  const menuItems = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="hidden lg:flex flex-col w-72 h-screen sticky top-0 py-6 pr-6 pl-2">
      <div className="flex items-center gap-3 px-4 mb-10">
        <div className="bg-gradient-to-tr from-synapse-600 to-synapse-400 p-2.5 rounded-xl shadow-lg shadow-synapse-500/20">
          <Activity className="text-white w-6 h-6" />
        </div>
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
          Synapse
        </span>
      </div>

      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group
              ${activeTab === item.id 
                ? 'bg-white shadow-lg shadow-slate-200/50 text-synapse-600' 
                : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'
              }`}
          >
            <item.icon 
              className={`w-5 h-5 transition-transform group-hover:scale-110 duration-200
                ${activeTab === item.id ? 'fill-synapse-100' : ''}
              `} 
            />
            <span className="font-medium text-sm tracking-wide">{item.label}</span>
          </button>
        ))}

        {userProfile?.role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-slate-200/50">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Management</p>
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group
                ${activeTab === 'admin' 
                  ? 'bg-synapse-950 shadow-lg text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium text-sm tracking-wide">Admin Panel</span>
            </button>
          </div>
        )}
      </nav>

      <div className="mt-auto px-4 pt-6 border-t border-slate-200/60">
        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors mb-2 text-slate-500 hover:text-slate-900">
          <Settings className="w-5 h-5" />
          <span className="font-medium text-sm">Settings</span>
        </button>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>

        <div className="mt-6 flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
          <img 
            src={userProfile?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {userProfile?.displayName || user?.displayName || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};