
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, documentId } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, FriendRequest } from '../types';
import { Card } from './ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { FriendButton } from './FriendButton';
import { Users, UserPlus } from 'lucide-react';
import { Button } from './ui/Button';

export const FriendsPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'requests' | 'all'>('requests');

  useEffect(() => {
    if (!user) return;

    // 1. Listen for Incoming Requests
    const qRequests = query(
      collection(db, 'friend_requests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(qRequests, async (snapshot) => {
      const reqs: FriendRequest[] = [];
      
      // Fetch sender details for each request
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const senderRef = doc(db, 'users', data.senderId);
        const senderSnap = await getDoc(senderRef);
        if (senderSnap.exists()) {
          reqs.push({
            id: docSnap.id,
            senderId: data.senderId,
            receiverId: data.receiverId,
            status: data.status,
            timestamp: data.timestamp,
            sender: senderSnap.data() as UserProfile
          });
        }
      }
      setRequests(reqs);
    });

    // 2. Fetch All Friends
    const fetchFriends = async () => {
        if (!userProfile?.friends || userProfile.friends.length === 0) {
            setFriends([]);
            setLoading(false);
            return;
        }
        
        // Firestore 'in' query supports max 10. For production, fetch by chunks.
        // For this demo, we assume < 30 friends fetched via chunks or just top 10.
        // Simplified: Fetch individually if array is small, or skip 'in' limit logic for brevity in XML.
        try {
            const chunks = [];
            const friendsList = [...userProfile.friends];
            const fetchedFriends: UserProfile[] = [];
            
            while (friendsList.length > 0) {
                const chunk = friendsList.splice(0, 10);
                const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(d => fetchedFriends.push(d.data() as UserProfile));
            }
            setFriends(fetchedFriends);
        } catch (e) {
            console.error("Error fetching friends list", e);
        } finally {
            setLoading(false);
        }
    };

    fetchFriends();

    return () => unsubscribe();
  }, [user, userProfile?.friends]); // Refetch list when profile friends array changes

  return (
    <div className="max-w-[1000px] mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-6">
         {/* Sidebar Navigation */}
         <div className="w-full md:w-[280px] flex-shrink-0">
            <h1 className="text-2xl font-bold mb-6">Friends</h1>
            <div className="space-y-1">
               <button 
                 onClick={() => setView('requests')}
                 className={`w-full text-left px-3 py-3 rounded-lg font-semibold flex items-center gap-3 transition-colors ${view === 'requests' ? 'bg-synapse-100 text-synapse-700' : 'hover:bg-slate-100 text-slate-700'}`}
               >
                  <div className={`p-2 rounded-full ${view === 'requests' ? 'bg-synapse-600 text-white' : 'bg-slate-200'}`}>
                     <UserPlus className="w-5 h-5" />
                  </div>
                  Friend Requests
                  {requests.length > 0 && <span className="ml-auto text-red-500 font-bold">{requests.length}</span>}
               </button>
               <button 
                 onClick={() => setView('all')}
                 className={`w-full text-left px-3 py-3 rounded-lg font-semibold flex items-center gap-3 transition-colors ${view === 'all' ? 'bg-synapse-100 text-synapse-700' : 'hover:bg-slate-100 text-slate-700'}`}
               >
                  <div className={`p-2 rounded-full ${view === 'all' ? 'bg-synapse-600 text-white' : 'bg-slate-200'}`}>
                     <Users className="w-5 h-5" />
                  </div>
                  All Friends
               </button>
            </div>
         </div>

         {/* Main Content */}
         <div className="flex-1">
            {view === 'requests' && (
               <>
                  <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
                  {requests.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                         {requests.map(req => (
                             <Card key={req.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-40 bg-slate-100">
                                   <img 
                                     src={req.sender?.photoURL || ''} 
                                     className="w-full h-full object-cover" 
                                   />
                                </div>
                                <div className="p-3">
                                   <h3 className="font-semibold text-lg text-slate-900 truncate mb-1">{req.sender?.displayName}</h3>
                                   <p className="text-xs text-slate-500 mb-3">1 mutual friend</p>
                                   <div className="flex flex-col gap-2">
                                      <FriendButton targetUid={req.senderId} className="w-full justify-center" />
                                   </div>
                                </div>
                             </Card>
                         ))}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-100">
                         <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <UserPlus className="w-10 h-10 text-slate-400" />
                         </div>
                         <h3 className="text-lg font-bold text-slate-700">No new requests</h3>
                      </div>
                  )}
               </>
            )}

            {view === 'all' && (
               <>
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold">All Friends</h2>
                     <span className="text-slate-500">{friends.length} friends</span>
                  </div>
                  
                  {loading ? (
                     <div className="text-center py-10">Loading...</div>
                  ) : friends.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {friends.map(friend => (
                           <div key={friend.uid} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white">
                              <Avatar className="w-16 h-16 rounded-xl border border-slate-100">
                                 <AvatarImage src={friend.photoURL || ''} />
                                 <AvatarFallback>{friend.displayName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                 <h3 className="font-semibold text-slate-900 truncate">{friend.displayName}</h3>
                                 <p className="text-xs text-slate-500">Synapse User</p>
                              </div>
                              <FriendButton targetUid={friend.uid} className="w-10 h-10 p-0 rounded-full" />
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
                        <p className="text-slate-500">You haven't added any friends yet.</p>
                     </div>
                  )}
               </>
            )}
         </div>
      </div>
    </div>
  );
};
