
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

  // 1. Listen for Incoming Requests
  useEffect(() => {
    if (!user) return;
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
    return () => unsubscribe();
  }, [user]);

  // 2. Fetch All Friends (Reactive to userProfile changes)
  useEffect(() => {
    const fetchFriends = async () => {
        if (!userProfile?.friends || userProfile.friends.length === 0) {
            setFriends([]);
            setLoading(false);
            return;
        }
        
        try {
            // Sanitize friends list to remove empty strings or invalid IDs
            const validFriends = userProfile.friends.filter(id => id && typeof id === 'string' && id.trim().length > 0);
            
            if (validFriends.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }

            // Batch fetch friends (Firestore limits 'in' query to 10-30 items depending on sdk version, usually 10 is safe for 'in')
            // For a production app, we would paginate this properly.
            const chunk = validFriends.slice(0, 20);
            
            if (chunk.length > 0) {
                const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const snap = await getDocs(q);
                const fetchedFriends: UserProfile[] = [];
                snap.forEach(d => fetchedFriends.push(d.data() as UserProfile));
                setFriends(fetchedFriends);
            } else {
                setFriends([]);
            }
        } catch (e) {
            console.error("Error fetching friends list", e);
        } finally {
            setLoading(false);
        }
    };

    fetchFriends();
  }, [user, userProfile?.friends]);

  // 3. Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user || view !== 'suggestions') return;
      setLoading(true);
      try {
        const excludeIds = new Set<string>();
        excludeIds.add(user.uid);
        userProfile?.friends?.forEach(id => excludeIds.add(id));

        const qSent = query(collection(db, 'friend_requests'), where('senderId', '==', user.uid));
        const sentSnap = await getDocs(qSent);
        sentSnap.forEach(doc => excludeIds.add(doc.data().receiverId));

        const qReceived = query(collection(db, 'friend_requests'), where('receiverId', '==', user.uid));
        const recSnap = await getDocs(qReceived);
        recSnap.forEach(doc => excludeIds.add(doc.data().senderId));

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
    <div className="w-full h-full p-2 md:p-6">
      <div className="flex flex-col md:flex-row gap-6 h-full items-start">
         
         {/* Internal Sidebar */}
         <div className="w-full md:w-[280px] md:flex-shrink-0 md:sticky md:top-20">
            <div className="flex items-center justify-between mb-4 px-2">
                <h1 className="text-2xl font-bold text-slate-900">Friends</h1>
                <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200">
                    <Settings className="w-5 h-5 text-slate-700" />
                </Button>
            </div>
            
            <div className="space-y-1">
               <Button 
                 variant={view === 'requests' ? 'secondary' : 'ghost'}
                 onClick={() => setView('requests')}
                 className={`w-full justify-start h-12 gap-3 text-base font-medium px-2 ${view === 'requests' ? 'bg-synapse-100/50 text-synapse-700' : ''}`}
               >
                  <div className={`p-2 rounded-full flex items-center justify-center ${view === 'requests' ? 'bg-synapse-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                     <UserPlus className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left">Friend Requests</span>
                  {requests.length > 0 && <ChevronRight className="w-5 h-5 text-slate-400" />}
               </Button>

               <Button 
                 variant={view === 'suggestions' ? 'secondary' : 'ghost'}
                 onClick={() => setView('suggestions')}
                 className={`w-full justify-start h-12 gap-3 text-base font-medium px-2 ${view === 'suggestions' ? 'bg-synapse-100/50 text-synapse-700' : ''}`}
               >
                  <div className={`p-2 rounded-full flex items-center justify-center ${view === 'suggestions' ? 'bg-synapse-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                     <UserSearch className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left">Suggestions</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
               </Button>

               <Button 
                 variant={view === 'all' ? 'secondary' : 'ghost'}
                 onClick={() => setView('all')}
                 className={`w-full justify-start h-12 gap-3 text-base font-medium px-2 ${view === 'all' ? 'bg-synapse-100/50 text-synapse-700' : ''}`}
               >
                  <div className={`p-2 rounded-full flex items-center justify-center ${view === 'all' ? 'bg-synapse-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                     <Users className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-left">All Friends</span>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
               </Button>
            </div>
            
            <Separator className="my-4" />
         </div>

         {/* Content Area - Fluid Grid */}
         <div className="flex-1 w-full min-w-0">
            {view === 'requests' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-slate-900">Friend Requests</h2>
                     {requests.length > 0 && <Button variant="link" className="text-synapse-600">See all</Button>}
                  </div>

                  {requests.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
                      </div>
                  )}
               </div>
            )}

            {view === 'suggestions' && (
               <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900">People You May Know</h2>
                  {loading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] bg-slate-100 rounded-xl animate-pulse" />)}
                     </div>
                  ) : suggestions.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {suggestions.map(s => (
                           <Card key={s.uid} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                              <div className="aspect-square bg-slate-100 relative shrink-0">
                                 <img 
                                   src={s.photoURL || `https://ui-avatars.com/api/?name=${s.displayName}`} 
                                   className="w-full h-full object-cover" 
                                   alt={s.displayName || 'User'}
                                 />
                              </div>
                              <div className="p-3 space-y-3 flex-1 flex flex-col">
                                 <div className="space-y-1 flex-1">
                                    <h3 className="font-semibold text-[16px] text-slate-900 truncate leading-tight">{s.displayName}</h3>
                                    <p className="text-xs text-slate-500">Suggested for you</p>
                                 </div>
                                 <div className="space-y-2 mt-auto">
                                    <FriendButton targetUid={s.uid} className="w-full" />
                                    <Button variant="secondary" className="w-full text-slate-700 bg-slate-100 hover:bg-slate-200">Remove</Button>
                                 </div>
                              </div>
                           </Card>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900">No suggestions</h3>
                     </div>
                  )}
               </div>
            )}

            {view === 'all' && (
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold text-slate-900">All Friends</h2>
                     <input 
                       type="text" 
                       placeholder="Search Friends" 
                       className="bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-synapse-500 w-48 focus:w-64 transition-all"
                     />
                  </div>
                  
                  {friends.length > 0 ? (
                     <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
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
                              <FriendButton targetUid={friend.uid} size="icon" className="rounded-full" />
                           </Card>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900">No friends yet</h3>
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
