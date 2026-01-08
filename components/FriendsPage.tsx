
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, documentId, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserProfile, FriendRequest } from '../types';
import { Card } from './ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Button } from './ui/Button';
import { FriendButton } from './FriendButton';
import { Users, UserPlus, ChevronRight, Settings, Sparkles, UserSearch } from 'lucide-react';
import { Separator } from './ui/Separator';

export const FriendsPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'requests' | 'suggestions' | 'all'>('requests');

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
            return;
        }
        
        try {
            const friendsList = [...userProfile.friends];
            const fetchedFriends: UserProfile[] = [];
            
            // Limit to first 20 for initial load
            const chunk = friendsList.slice(0, 20);
            if (chunk.length > 0) {
                const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(d => fetchedFriends.push(d.data() as UserProfile));
            }
            
            setFriends(fetchedFriends);
        } catch (e) {
            console.error("Error fetching friends list", e);
        }
    };

    fetchFriends();
    setLoading(false);

    return () => unsubscribe();
  }, [user, userProfile?.friends]);

  // 3. Fetch Suggestions (Users not in friends list and no pending requests)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user || view !== 'suggestions') return;
      setLoading(true);

      try {
        // Build exclusion set
        const excludeIds = new Set<string>();
        excludeIds.add(user.uid);
        userProfile?.friends?.forEach(id => excludeIds.add(id));

        // Get Outgoing Requests to exclude
        const qSent = query(collection(db, 'friend_requests'), where('senderId', '==', user.uid));
        const sentSnap = await getDocs(qSent);
        sentSnap.forEach(doc => excludeIds.add(doc.data().receiverId));

        // Get Incoming Requests to exclude
        const qReceived = query(collection(db, 'friend_requests'), where('receiverId', '==', user.uid));
        const recSnap = await getDocs(qReceived);
        recSnap.forEach(doc => excludeIds.add(doc.data().senderId));

        // Fetch Users (Limit 50 to simulate "Suggestions")
        const qUsers = query(collection(db, 'users'), limit(50));
        const userSnap = await getDocs(qUsers);
        
        const newSuggestions: UserProfile[] = [];
        userSnap.forEach(doc => {
            if (!excludeIds.has(doc.id)) {
                newSuggestions.push(doc.data() as UserProfile);
            }
        });
        
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error("Error fetching suggestions", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user, userProfile, view]);

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8 items-start">
         
         {/* Sidebar Navigation */}
         <div className="sticky top-20">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-slate-900">Friends</h1>
                <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200">
                    <Settings className="w-5 h-5 text-slate-700" />
                </Button>
            </div>
            
            <div className="space-y-1">
               <Button 
                 variant={view === 'requests' ? 'secondary' : 'ghost'}
                 onClick={() => setView('requests')}
                 className="w-full justify-start h-12 gap-3 text-base font-medium px-2"
               >
                  <div className={`p-1.5 rounded-full ${view === 'requests' ? 'bg-synapse-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                     <UserPlus className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left">Friend Requests</span>
                  {requests.length > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
               </Button>

               <Button 
                 variant={view === 'suggestions' ? 'secondary' : 'ghost'}
                 onClick={() => setView('suggestions')}
                 className="w-full justify-start h-12 gap-3 text-base font-medium px-2"
               >
                  <div className={`p-1.5 rounded-full ${view === 'suggestions' ? 'bg-synapse-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                     <UserSearch className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left">Suggestions</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </Button>

               <Button 
                 variant={view === 'all' ? 'secondary' : 'ghost'}
                 onClick={() => setView('all')}
                 className="w-full justify-start h-12 gap-3 text-base font-medium px-2"
               >
                  <div className={`p-1.5 rounded-full ${view === 'all' ? 'bg-synapse-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                     <Users className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left">All Friends</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </Button>
            </div>
            
            <Separator className="my-4" />
         </div>

         {/* Main Content Area */}
         <div className="min-h-[500px]">
            {view === 'requests' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-slate-900">Friend Requests</h2>
                     {requests.length > 0 && (
                        <Button variant="link" className="text-synapse-600">See all</Button>
                     )}
                  </div>

                  {requests.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                         {requests.map(req => (
                             <Card key={req.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="aspect-square bg-slate-100 relative">
                                   <img 
                                     src={req.sender?.photoURL || ''} 
                                     className="w-full h-full object-cover" 
                                     alt={req.sender?.displayName || 'User'}
                                   />
                                </div>
                                <div className="p-3 space-y-3">
                                   <div className="space-y-1">
                                      <h3 className="font-semibold text-[16px] text-slate-900 truncate leading-tight">{req.sender?.displayName}</h3>
                                      <p className="text-xs text-slate-500">1 mutual friend</p>
                                   </div>
                                   <div className="space-y-2">
                                      <FriendButton targetUid={req.senderId} className="w-full" />
                                   </div>
                                </div>
                             </Card>
                         ))}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
                         <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <UserPlus className="w-10 h-10 text-slate-300" />
                         </div>
                         <h3 className="text-lg font-bold text-slate-900">No new requests</h3>
                         <p className="text-slate-500 mt-1">Check back later for more.</p>
                      </div>
                  )}
               </div>
            )}

            {view === 'suggestions' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-slate-900">People You May Know</h2>
                  </div>
                  
                  {loading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {[1,2,3,4,5].map(i => (
                           <div key={i} className="aspect-[3/4] bg-slate-100 rounded-xl animate-pulse" />
                        ))}
                     </div>
                  ) : suggestions.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {suggestions.map(s => (
                           <Card key={s.uid} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="aspect-square bg-slate-100 relative">
                                 <img 
                                   src={s.photoURL || `https://ui-avatars.com/api/?name=${s.displayName}`} 
                                   className="w-full h-full object-cover" 
                                   alt={s.displayName || 'User'}
                                 />
                              </div>
                              <div className="p-3 space-y-3">
                                 <div className="space-y-1">
                                    <h3 className="font-semibold text-[16px] text-slate-900 truncate leading-tight">{s.displayName}</h3>
                                    <p className="text-xs text-slate-500">Suggested for you</p>
                                 </div>
                                 <div className="space-y-2">
                                    <FriendButton targetUid={s.uid} className="w-full" />
                                    <Button variant="secondary" className="w-full text-slate-700 bg-slate-100 hover:bg-slate-200">Remove</Button>
                                 </div>
                              </div>
                           </Card>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No suggestions available</h3>
                        <p className="text-slate-500 mt-1">Try searching for people you know.</p>
                     </div>
                  )}
               </div>
            )}

            {view === 'all' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-slate-900">All Friends</h2>
                     <div className="relative">
                        <input 
                           type="text" 
                           placeholder="Search Friends" 
                           className="bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-synapse-500 w-48 transition-all focus:w-64"
                        />
                     </div>
                  </div>
                  
                  {friends.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {friends.map(friend => (
                           <Card key={friend.uid} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-slate-200 shadow-sm">
                              <Avatar className="w-20 h-20 rounded-xl border border-slate-100">
                                 <AvatarImage src={friend.photoURL || ''} />
                                 <AvatarFallback>{friend.displayName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                 <h3 className="font-semibold text-slate-900 text-base truncate">{friend.displayName}</h3>
                                 <p className="text-xs text-slate-500">Synapse User</p>
                              </div>
                              <div>
                                 <FriendButton targetUid={friend.uid} size="icon" className="rounded-full" />
                              </div>
                           </Card>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No friends yet</h3>
                        <p className="text-slate-500 mt-1">When you add friends, they'll appear here.</p>
                        <Button variant="link" className="mt-2 text-synapse-600" onClick={() => setView('suggestions')}>Find Friends</Button>
                     </div>
                  )}
               </div>
            )}
         </div>
      </div>
    </div>
  );
};
