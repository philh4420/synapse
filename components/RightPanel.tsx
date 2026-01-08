import React, { useEffect, useState } from 'react';
import { Search, MoreHorizontal, UserPlus } from 'lucide-react';
import { collection, query, limit, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, Trend } from '../types';
import { useAuth } from '../context/AuthContext';

export const RightPanel: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Trends
        // Note: Assuming a 'trends' collection exists. If not, this handles gracefully.
        const trendsRef = collection(db, 'trending');
        const trendsQuery = query(trendsRef, orderBy('count', 'desc'), limit(4));
        const trendsSnap = await getDocs(trendsQuery);
        
        if (!trendsSnap.empty) {
          setTrends(trendsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trend)));
        } else {
          // Fallback if no trends collection (optional, or just show empty)
          setTrends([]); 
        }

        // Fetch Suggested Users
        // Fetching 5 users that are not the current user
        const usersRef = collection(db, 'users');
        // Firestore limitation: cannot effectively shuffle or filter 'not-equal' efficiently without composite indexes/client filtering.
        // For simplicity in this scale, fetch latest 10 and filter client side.
        const usersQuery = query(usersRef, limit(10)); 
        const usersSnap = await getDocs(usersQuery);
        
        const usersData = usersSnap.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.uid !== user?.uid)
          .slice(0, 3);
          
        setSuggestedUsers(usersData);
      } catch (error) {
        console.error("Error fetching right panel data:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="hidden xl:block w-80 h-screen sticky top-0 py-6 pl-2 pr-6 space-y-6">
      {/* Search */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-synapse-500 transition-colors">
          <Search size={18} />
        </div>
        <input 
          type="text" 
          placeholder="Search Synapse..." 
          className="w-full bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-synapse-500/20 focus:border-synapse-500 transition-all shadow-sm"
        />
      </div>

      {/* Trending */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900">Trending Now</h3>
          <button className="text-slate-400 hover:text-slate-600">
            <MoreHorizontal size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {trends.length > 0 ? (
            trends.map((item) => (
              <div key={item.id} className="flex justify-between items-center group cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800 text-sm group-hover:text-synapse-600 transition-colors">{item.tag}</p>
                  <p className="text-xs text-slate-400">{item.posts} Posts</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            ))
          ) : (
             <p className="text-sm text-slate-400 italic">No trending topics yet.</p>
          )}
        </div>
      </div>

      {/* Who to follow */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
         <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900">Who to follow</h3>
          <button className="text-synapse-600 text-sm font-semibold hover:underline">See all</button>
        </div>
        <div className="space-y-4">
          {loadingUsers ? (
            <div className="space-y-3">
               {[1,2,3].map(i => (
                 <div key={i} className="flex items-center gap-3 animate-pulse">
                   <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                   <div className="flex-1 space-y-2">
                     <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                     <div className="h-2 bg-slate-100 rounded w-1/3"></div>
                   </div>
                 </div>
               ))}
            </div>
          ) : (
            suggestedUsers.map((u) => (
              <div key={u.uid} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                    alt={u.displayName || 'User'} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-100" 
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">{u.displayName}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[120px]">@{u.email?.split('@')[0]}</p>
                  </div>
                </div>
                <button className="p-2 text-synapse-600 bg-synapse-50 hover:bg-synapse-100 rounded-full transition-colors">
                  <UserPlus size={18} />
                </button>
              </div>
            ))
          )}
          {!loadingUsers && suggestedUsers.length === 0 && (
             <p className="text-sm text-slate-400 italic">No suggestions available.</p>
          )}
        </div>
      </div>
    </div>
  );
};