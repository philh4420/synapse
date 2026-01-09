
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post as PostComponent } from './Post';
import { CreatePost } from './CreatePost';
import { Post as PostType, UserProfile } from '../types';
import { collection, query, where, orderBy, onSnapshot, documentId, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  MapPin, Link as LinkIcon, Edit3, Loader2, 
  Briefcase, GraduationCap, Heart, Camera, MoreHorizontal, 
  Plus, Search, Grid, Home, Phone, Globe, Calendar, User, Languages, MessageCircle
} from 'lucide-react';
import { EditProfileDialog } from './EditProfileDialog';
import { FriendButton } from './FriendButton';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Separator } from './ui/Separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ProfileProps {
  targetUid?: string | null;
}

export const Profile: React.FC<ProfileProps> = ({ targetUid }) => {
  const { userProfile: currentUserProfile, user } = useAuth();
  
  const [externalProfile, setExternalProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');

  // Determine which profile to show
  // If targetUid is present and different from current user, we use externalProfile.
  // Otherwise we use currentUserProfile.
  const isOwnProfile = !targetUid || targetUid === user?.uid;
  const viewedProfile = isOwnProfile ? currentUserProfile : externalProfile;

  // Fetch External Profile Data if needed
  useEffect(() => {
    if (targetUid && targetUid !== user?.uid) {
      setProfileLoading(true);
      const fetchUserProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', targetUid));
          if (userDoc.exists()) {
            setExternalProfile(userDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setProfileLoading(false);
        }
      };
      fetchUserProfile();
    } else {
      setExternalProfile(null);
      setProfileLoading(false);
    }
  }, [targetUid, user]);

  // Fetch Posts & Friends for the VIEWED profile
  useEffect(() => {
    if (!viewedProfile) return;

    // 1. Fetch Posts by viewed user
    const postsQuery = query(
      collection(db, 'posts'),
      where('author.uid', '==', viewedProfile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        };
      }) as PostType[];
      
      setPosts(postsData);
      
      const userPhotos = postsData
        .filter(p => p.image)
        .map(p => p.image!);
      setPhotos(userPhotos);
      
      setLoading(false);
    });

    // 2. Fetch Real Friends
    const fetchFriends = async () => {
      if (!viewedProfile?.friends || viewedProfile.friends.length === 0) {
        setFriends([]);
        return;
      }
      
      try {
        const friendIds = viewedProfile.friends.slice(0, 10);
        if (friendIds.length === 0) return;

        const q = query(collection(db, 'users'), where(documentId(), 'in', friendIds));
        const snap = await getDocs(q);
        const friendList = snap.docs.map(d => d.data() as UserProfile);
        setFriends(friendList);
      } catch (error) {
        console.error("Error fetching friends", error);
      }
    };
    
    fetchFriends();

    return () => unsubscribe();
  }, [viewedProfile?.uid]); // Re-run when the viewed profile UID changes

  if (profileLoading) {
     return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-synapse-600" /></div>;
  }

  if (!viewedProfile) return <div className="p-8 text-center text-slate-500">User not found</div>;

  // --- Sub-components for Tabs ---

  const PostsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
      <div className="space-y-4">
        <Card className="p-4 shadow-sm border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Intro</h3>
          <div className="space-y-4 text-[15px] text-slate-900">
            <div className="text-center pb-2">
              <p className="text-sm text-slate-600 mb-4">{viewedProfile.bio || (isOwnProfile ? 'Add a short bio.' : 'No bio available.')}</p>
              {isOwnProfile && (
                <Button 
                  variant="secondary" 
                  className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 font-semibold mb-2"
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  Edit bio
                </Button>
              )}
            </div>
            
            {viewedProfile.work && (
              <div className="flex items-center gap-3 text-slate-600">
                <Briefcase className="w-5 h-5 text-slate-400" />
                <span>Works at <strong className="text-slate-900">{viewedProfile.work}</strong></span>
              </div>
            )}
            
            {viewedProfile.education && (
              <div className="flex items-center gap-3 text-slate-600">
                <GraduationCap className="w-5 h-5 text-slate-400" />
                <span>Studied at <strong className="text-slate-900">{viewedProfile.education}</strong></span>
              </div>
            )}

            {viewedProfile.location && (
              <div className="flex items-center gap-3 text-slate-600">
                <Home className="w-5 h-5 text-slate-400" />
                <span>Lives in <strong className="text-slate-900">{viewedProfile.location}</strong></span>
              </div>
            )}
            
            {isOwnProfile && (
              <Button 
                onClick={() => setIsEditProfileOpen(true)}
                className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 font-semibold"
              >
                Edit details
              </Button>
            )}
          </div>
        </Card>

        {/* Photos Widget */}
        <Card className="p-4 shadow-sm border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">Photos</h3>
            <button onClick={() => setActiveTab('Photos')} className="text-synapse-600 text-[17px] hover:bg-slate-50 px-2 py-1 rounded-md transition-colors font-normal">See all photos</button>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {photos.slice(0, 9).map((photo, i) => (
              <div key={i} className="aspect-square bg-slate-100">
                <img src={photo} alt="" className="w-full h-full object-cover hover:opacity-90 cursor-pointer" />
              </div>
            ))}
            {photos.length === 0 && <div className="col-span-3 text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl">No photos yet</div>}
          </div>
        </Card>

        {/* Friends Widget */}
        <Card className="p-4 shadow-sm border-slate-200">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xl font-bold text-slate-900">Friends</h3>
            <button onClick={() => setActiveTab('Friends')} className="text-synapse-600 text-[17px] hover:bg-slate-50 px-2 py-1 rounded-md transition-colors font-normal">See all friends</button>
          </div>
          <p className="text-slate-500 text-[15px] mb-4">{viewedProfile.friends?.length || 0} friends</p>
          <div className="grid grid-cols-3 gap-3">
            {friends.slice(0, 9).map((friend) => (
              <div key={friend.uid} className="cursor-pointer group">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-1">
                  <img src={friend.photoURL || `https://ui-avatars.com/api/?name=${friend.displayName}`} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                </div>
                <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">{friend.displayName}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {isOwnProfile && <CreatePost />}
        
        <Card className="p-3 flex justify-between items-center shadow-sm border-slate-200">
          <h3 className="font-bold text-xl text-slate-900 px-2">Posts</h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="bg-slate-100 text-slate-700 hover:bg-slate-200"><Search className="w-4 h-4 mr-1" /> Filters</Button>
            <Button variant="secondary" size="sm" className="bg-slate-100 text-slate-700 hover:bg-slate-200"><Grid className="w-4 h-4 mr-1" /> Manage posts</Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-synapse-400" /></div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => <PostComponent key={post.id} post={post} />)}
            {posts.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3"><Edit3 className="w-6 h-6 text-slate-400" /></div>
                <h3 className="text-lg font-bold text-slate-900">No posts available</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const AboutTab = () => (
    <Card className="min-h-[500px] border-slate-200 shadow-sm p-8 text-center text-slate-500">
       <div className="max-w-2xl mx-auto text-left space-y-6">
          <h3 className="text-2xl font-bold text-slate-900 border-b border-slate-100 pb-4">About {viewedProfile.displayName}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work</label>
               <p className="text-slate-900 font-medium text-lg">{viewedProfile.work || 'No work info'}</p>
               <p className="text-slate-500 text-sm">{viewedProfile.position}</p>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Education</label>
               <p className="text-slate-900 font-medium text-lg">{viewedProfile.education || 'No education info'}</p>
               <p className="text-slate-500 text-sm">{viewedProfile.highSchool}</p>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</label>
               <p className="text-slate-900 font-medium text-lg">{viewedProfile.location || 'No location'}</p>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hometown</label>
               <p className="text-slate-900 font-medium text-lg">{viewedProfile.hometown || 'No hometown'}</p>
             </div>
          </div>
       </div>
    </Card>
  );

  const FriendsTab = () => (
    <Card className="p-6 border-slate-200 shadow-sm min-h-[500px]">
       <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Friends</h3>
          <input type="text" placeholder="Search friends" className="bg-slate-100 rounded-full py-2 pl-4 pr-4 text-sm focus:outline-none" />
       </div>
       {friends.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {friends.map(friend => (
              <div key={friend.uid} className="border border-slate-100 rounded-lg p-3 flex items-center gap-3">
                  <Avatar className="w-16 h-16 rounded-lg"><AvatarImage src={friend.photoURL || ''} /><AvatarFallback>{friend.displayName?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{friend.displayName}</p>
                    <p className="text-xs text-slate-500">Synapse User</p>
                  </div>
              </div>
            ))}
          </div>
       ) : (
          <div className="text-center py-20 text-slate-400">No friends to show</div>
       )}
    </Card>
  );

  const PhotosTab = () => (
    <Card className="p-6 border-slate-200 shadow-sm min-h-[500px]">
       <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-900">Photos</h3></div>
       {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {photos.map((photo, i) => (
               <div key={i} className="aspect-square bg-slate-100 rounded-sm overflow-hidden group cursor-pointer relative">
                  <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
               </div>
            ))}
          </div>
       ) : (
          <div className="text-center py-20 text-slate-400">No photos</div>
       )}
    </Card>
  );

  return (
    <div className="bg-[#F0F2F5] min-h-screen -mt-6 animate-in fade-in">
       <div className="bg-white shadow-sm pb-0">
          <div className="max-w-[1095px] mx-auto relative">
             <div className="relative w-full h-[200px] md:h-[350px] lg:h-[400px] bg-slate-200 rounded-b-xl overflow-hidden group">
                {viewedProfile.coverURL ? <img src={viewedProfile.coverURL} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-b from-slate-300 to-slate-400" />}
                {isOwnProfile && (
                   <button onClick={() => setIsEditProfileOpen(true)} className="absolute bottom-4 right-4 bg-white text-slate-900 px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-slate-100 shadow-sm opacity-0 group-hover:opacity-100">
                      <Camera className="w-5 h-5" /> <span className="hidden sm:inline">Edit cover photo</span>
                   </button>
                )}
             </div>

             <div className="px-4 lg:px-8 pb-4">
                <div className="flex flex-col md:flex-row gap-4 items-center md:items-end -mt-[80px] md:-mt-[30px] relative z-10">
                   <div className="relative">
                      <div className="w-[168px] h-[168px] rounded-full border-[4px] border-white bg-white overflow-hidden relative group shadow-sm">
                         <img src={viewedProfile.photoURL || ''} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                      {isOwnProfile && <button onClick={() => setIsEditProfileOpen(true)} className="absolute bottom-2 right-2 bg-slate-200 p-2 rounded-full hover:bg-slate-300 border-[2px] border-white"><Camera className="w-5 h-5 text-slate-800" /></button>}
                   </div>

                   <div className="flex-1 text-center md:text-left mb-2 md:mb-4 pt-4 md:pt-0">
                      <h1 className="text-[32px] font-bold text-slate-900 leading-tight">{viewedProfile.displayName}</h1>
                      <p className="text-slate-500 font-semibold text-[15px]">{viewedProfile.friends?.length || 0} friends</p>
                      <div className="flex justify-center md:justify-start -space-x-2 mt-2">
                         {friends.slice(0, 8).map((f, i) => (
                            <Avatar key={i} className="w-8 h-8 border-[2px] border-white"><AvatarImage src={f.photoURL || ''} /><AvatarFallback>{f.displayName?.[0]}</AvatarFallback></Avatar>
                         ))}
                      </div>
                   </div>

                   {/* Conditional Buttons based on Relationship */}
                   <div className="flex flex-col sm:flex-row gap-2 mb-4 w-full md:w-auto">
                      {isOwnProfile ? (
                        <>
                           <Button variant="primary" className="gap-2 px-4 bg-synapse-600 hover:bg-synapse-700 w-full sm:w-auto"><Plus className="w-4 h-4" /> Add to story</Button>
                           <Button variant="secondary" className="gap-2 px-4 bg-slate-200 text-slate-900 hover:bg-slate-300 w-full sm:w-auto" onClick={() => setIsEditProfileOpen(true)}><Edit3 className="w-4 h-4" /> Edit profile</Button>
                        </>
                      ) : (
                        <>
                           {/* Friend Button Integration */}
                           <FriendButton targetUid={viewedProfile.uid} />
                           <Button variant="secondary" className="gap-2 px-4 bg-slate-200 text-slate-900 hover:bg-slate-300 w-full sm:w-auto">
                              <MessageCircle className="w-4 h-4" /> Message
                           </Button>
                        </>
                      )}
                   </div>
                </div>

                <Separator className="my-4 h-[1px] bg-slate-300/50" />

                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                   {['Posts', 'About', 'Friends', 'Photos', 'More'].map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 font-semibold text-[15px] rounded-lg transition-colors whitespace-nowrap ${activeTab === tab ? 'text-synapse-600 border-b-[3px] border-synapse-600 rounded-b-none' : 'text-slate-600 hover:bg-slate-100'}`}>{tab}</button>
                   ))}
                </div>
             </div>
          </div>
       </div>

       <div className="max-w-[1095px] mx-auto px-2 md:px-4 lg:px-8 py-4">
          {activeTab === 'Posts' && <PostsTab />}
          {activeTab === 'About' && <AboutTab />}
          {activeTab === 'Friends' && <FriendsTab />}
          {activeTab === 'Photos' && <PhotosTab />}
       </div>
       
       <EditProfileDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} />
    </div>
  );
};
