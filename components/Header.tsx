import React, { useState, useEffect, useRef } from 'react';
import { Search, Home, Compass, Users, LayoutGrid, MessageCircle, Bell, ChevronDown, Activity, Shield, Store, MonitorPlay, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { user, userProfile, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'feed', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'videos', icon: MonitorPlay, label: 'Watch' },
    { id: 'marketplace', icon: Store, label: 'Marketplace' },
    { id: 'groups', icon: Users, label: 'Groups' },
  ];

  if (userProfile?.role === 'admin') {
      navItems.push({ id: 'admin', icon: Shield, label: 'Admin' });
  }

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        // Simple prefix search (Note: Firestore is case-sensitive by default, 
        // comprehensive search usually requires a dedicated search service like Algolia or a normalized lowercase field)
        // For this clone, we'll check matching displayName or email
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('displayName', '>=', searchQuery),
          where('displayName', '<=', searchQuery + '\uf8ff'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => doc.data() as UserProfile);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-50 flex items-center justify-between px-4 select-none">
      {/* Left: Logo & Search */}
      <div className="flex items-center gap-2 z-50 relative" ref={searchRef}>
        <div 
          onClick={() => setActiveTab('feed')}
          className="w-10 h-10 bg-gradient-to-br from-synapse-600 to-synapse-700 rounded-full flex items-center justify-center cursor-pointer hover:brightness-110 transition-all flex-shrink-0"
        >
           <Activity className="text-white w-6 h-6" />
        </div>
        
        {/* Search Input */}
        <div className="relative hidden xl:block ml-1">
           <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
           <input 
             type="text" 
             value={searchQuery}
             onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(true); }}
             onFocus={() => setIsSearching(true)}
             placeholder="Search Synapse" 
             className="bg-slate-100 rounded-full py-2.5 pl-10 pr-4 w-60 text-[15px] focus:outline-none focus:ring-1 focus:ring-synapse-500 placeholder-slate-500 text-slate-900 transition-all hover:bg-slate-200/70"
           />
           {/* Clear Button */}
           {searchQuery && (
             <button 
               onClick={() => { setSearchQuery(''); setSearchResults([]); }}
               className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
             >
               <X className="w-4 h-4" />
             </button>
           )}
        </div>

        {/* Search Results Dropdown */}
        {isSearching && searchQuery && (
          <div className="absolute top-12 left-0 w-[300px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
            {searchResults.length > 0 ? (
              searchResults.map(result => (
                <div 
                  key={result.uid}
                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                  onClick={() => {
                    console.log("Navigate to user", result.uid);
                    setSearchQuery('');
                    setIsSearching(false);
                    // In a real router app, navigate here. For this single-page setup, we might just set activeTab to 'profile' and load that user
                    // But for now, just closing the search.
                  }}
                >
                  <img 
                    src={result.photoURL || `https://ui-avatars.com/api/?name=${result.displayName}`} 
                    alt={result.displayName || 'User'} 
                    className="w-9 h-9 rounded-full object-cover border border-slate-100"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{result.displayName}</p>
                    <p className="text-xs text-slate-500">User</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

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