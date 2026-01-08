import React, { useEffect, useState } from 'react';
import { Search, MoreHorizontal, Video, Gift } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, Trend } from '../types';
import { useAuth } from '../context/AuthContext';

export const RightPanel: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch "Contacts" (Just random users for demo)
        const usersQuery = query(collection(db, 'users'), limit(15));
        const usersSnap = await getDocs(usersQuery);
        
        const usersData = usersSnap.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.uid !== user?.uid);
          
        setContacts(usersData);
      } catch (error) {
        console.error("Error fetching right panel data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="hidden lg:flex flex-col w-[280px] xl:w-[360px] h-[calc(100vh-56px)] fixed right-0 top-14 pt-4 pr-2 pb-4 hover:overflow-y-auto hide-scrollbar">
      {/* Sponsored */}
      <div className="mb-4 pb-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-500 text-[17px] mb-3 px-2">Sponsored</h3>
        <a href="#" className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg transition-colors group">
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop" className="w-28 h-28 rounded-lg object-cover" alt="Ad" />
          <div className="flex-1">
             <p className="font-semibold text-slate-900 text-[15px] leading-snug">Nike Air Max 2026</p>
             <p className="text-xs text-slate-500 mt-1">nike.com</p>
          </div>
        </a>
        <a href="#" className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg transition-colors group">
          <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop" className="w-28 h-28 rounded-lg object-cover" alt="Ad" />
          <div className="flex-1">
             <p className="font-semibold text-slate-900 text-[15px] leading-snug">Get 50% Off Streaming</p>
             <p className="text-xs text-slate-500 mt-1">streamplus.com</p>
          </div>
        </a>
      </div>

      {/* Birthdays (Static Demo) */}
      <div className="mb-4 pb-4 border-b border-slate-200 px-2">
         <h3 className="font-semibold text-slate-500 text-[17px] mb-3">Birthdays</h3>
         <div className="flex items-center gap-3 cursor-pointer hover:bg-black/5 p-2 -mx-2 rounded-lg transition-colors">
            <Gift className="w-8 h-8 text-blue-500" />
            <p className="text-[15px] text-slate-900">
               <span className="font-semibold">Alex Smith</span> and <span className="font-semibold">3 others</span> have birthdays today.
            </p>
         </div>
      </div>

      {/* Contacts */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="font-semibold text-slate-500 text-[17px]">Contacts</h3>
          <div className="flex gap-2 text-slate-500">
             <Video className="w-4 h-4 cursor-pointer hover:text-slate-700" />
             <Search className="w-4 h-4 cursor-pointer hover:text-slate-700" />
             <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-slate-700" />
          </div>
        </div>
        
        <div className="space-y-0.5">
          {loading ? (
            <div className="px-2 py-2 text-slate-400 text-sm">Loading contacts...</div>
          ) : (
            contacts.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg cursor-pointer transition-colors group">
                <div className="relative">
                  <img 
                    src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                    alt={u.displayName || 'User'} 
                    className="w-9 h-9 rounded-full object-cover border border-slate-200" 
                  />
                  {/* Random online status dot */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <span className="font-medium text-slate-900 text-[15px]">{u.displayName}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};