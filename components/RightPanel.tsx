import React, { useEffect, useState } from 'react';
import { Search, MoreHorizontal, Video } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

export const RightPanel: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users to populate the contacts list
        // In a real app, this would query a subcollection of friends/contacts
        const usersQuery = query(collection(db, 'users'), limit(20));
        const usersSnap = await getDocs(usersQuery);
        
        const usersData = usersSnap.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.uid !== user?.uid);
          
        setContacts(usersData);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // If no contacts and not loading, render nothing (or a subtle empty state)
  // Facebook often just leaves the area empty or shows "No contacts"
  if (!loading && contacts.length === 0) {
    return (
      <div className="hidden lg:flex flex-col w-[280px] xl:w-[360px] h-[calc(100vh-56px)] fixed right-0 top-14 pt-4 pr-2 pb-4">
        <div className="px-2 text-slate-500 text-sm">No contacts found</div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col w-[280px] xl:w-[360px] h-[calc(100vh-56px)] fixed right-0 top-14 pt-4 pr-2 pb-4 hover:overflow-y-auto hide-scrollbar">
      
      {/* Contacts Header */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="font-semibold text-slate-500 text-[17px]">Contacts</h3>
          <div className="flex gap-2 text-slate-500">
             <div className="p-2 hover:bg-slate-200 rounded-full cursor-pointer transition-colors">
               <Video className="w-4 h-4" />
             </div>
             <div className="p-2 hover:bg-slate-200 rounded-full cursor-pointer transition-colors">
               <Search className="w-4 h-4" />
             </div>
             <div className="p-2 hover:bg-slate-200 rounded-full cursor-pointer transition-colors">
               <MoreHorizontal className="w-4 h-4" />
             </div>
          </div>
        </div>
        
        {/* Contact List */}
        <div className="space-y-0.5">
          {loading ? (
             // Skeleton loading state
             [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                   <div className="w-9 h-9 bg-slate-200 rounded-full animate-pulse"></div>
                   <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
                </div>
             ))
          ) : (
            contacts.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-lg cursor-pointer transition-colors group">
                <div className="relative">
                  <img 
                    src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                    alt={u.displayName || 'User'} 
                    className="w-9 h-9 rounded-full object-cover border border-slate-200" 
                  />
                  {/* Note: Online status dot removed as we do not track real-time presence yet. 
                      Adding it without data would be fake data. */}
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