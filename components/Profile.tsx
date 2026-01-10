
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../context/MessengerContext'; // Import Context
import { Post as PostComponent } from './Post';
import { CreatePost } from './CreatePost';
import { Post as PostType, UserProfile } from '../types';
import { collection, query, where, orderBy, onSnapshot, documentId, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  MapPin, Link as LinkIcon, Edit3, Loader2, 
  Briefcase, GraduationCap, Heart, Camera, MoreHorizontal, 
  Plus, Search, Grid, Home, Phone, Globe, Calendar, User, Languages, MessageCircle,
  Image as ImageIcon, Sparkles, Layout, Mail, Users, MonitorPlay
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
  onViewProfile?: (uid: string) => void;
  onNavigate?: (tab: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ targetUid, onViewProfile, onNavigate }) => {
  const { userProfile: currentUserProfile, user } = useAuth();
  const { openChat } = useMessenger(); // Hook
  
  const [externalProfile, setExternalProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');

  // Determine which profile to show
  const isOwnProfile = !targetUid || targetUid === user?.uid;
  const viewedProfile = isOwnProfile ? currentUserProfile : externalProfile;

  // Fetch External Profile Data
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

  // Fetch Posts & Friends
  useEffect(() => {
    if (!viewedProfile) return;

    setLoading(true);

    // 1. Fetch Posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('author.uid', '==', viewedProfile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = (snapshot as any).docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        };
      }) as PostType[];
      
      setPosts(postsData);
      
      // Extract photos from posts for the photo tab
      const userPhotos = postsData
        .filter(p => p.image || (p.images && p.images.length > 0))
        .flatMap(p => p.images || (p.image ? [p.image] : []));
      setPhotos(userPhotos);
      
      setLoading(false);
    });

    // 2. Fetch Friends with Chunking (Fix for viewing other profiles' friends)
    const fetchFriends = async () => {
      if (!viewedProfile?.friends || viewedProfile.friends.length === 0) {
        setFriends([]);
        return;
      }
      
      try {
        // Sanitize friend IDs
        const validFriendIds = viewedProfile.friends.filter(id => id && typeof id === 'string' && id.trim().length > 0);
        
        if (validFriendIds.length === 0) {
            setFriends([]);
            return;
        }

        // Firestore 'in' query is limited to 10 items. We must chunk the requests.
        const chunks = [];
        const chunkSize = 10;
        for (let i = 0; i < validFriendIds.length; i += chunkSize) {
            chunks.push(validFriendIds.slice(i, i + chunkSize));
        }

        const promises = chunks.map(chunk => 
            getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
        );
        
        const snapshots = await Promise.all(promises);
        const allFriends = snapshots.flatMap(snap => snap.docs.map(d => d.data() as UserProfile));
        
        setFriends(allFriends);
      } catch (error) {
        console.error("Error fetching friends", error);
        setFriends([]);
      }
    };
    
    fetchFriends();

    return () => unsubscribe();
  }, [viewedProfile?.uid, viewedProfile?.friends]);

  if (profileLoading) {
     return (
       <div className="flex h-[calc(100vh-100px)] items-center justify-center">
         <div className="flex flex-col items-center gap-4">
           <div className="w-16 h-16 border-4 border-synapse-100 border-t-synapse-600 rounded-full animate-spin"></div>
           <p className="text-slate-400 font-medium animate-pulse">Loading Profile...</p>
         </div>
       </div>
     );
  }

  if (!viewedProfile) return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
      <User className="w-16 h-16 text-slate-300 mb-4" />
      <h2 className="text-xl font-bold text-slate-700">User not found</h2>
      <p>The profile you are looking for is not available.</p>
    </div>
  );

  // --- Tab Components ---

  const IntroCard = () => (
    <Card className="overflow-hidden border-white/60 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-4 border-b border-white/50">
        <h3 className="text-lg font-bold text-slate-900">Intro</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="text-center mb-2">
          {viewedProfile.bio ? (
            <p className="text-[15px] text-slate-700 leading-relaxed">{viewedProfile.bio}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No bio added yet.</p>
          )}
        </div>
        
        <div className="space-y-3 text-[14px]">
          {viewedProfile.work && (
            <div className="flex items-start gap-3 text-slate-700 group">
              <Briefcase className="w-5 h-5 text-slate-400 mt-0.5 group-hover:text-synapse-500 transition-colors" />
              <span>Works at <strong className="text-slate-900">{viewedProfile.work}</strong></span>
            </div>
          )}
          
          {viewedProfile.education && (
            <div className="flex items-start gap-3 text-slate-700 group">
              <GraduationCap className="w-5 h-5 text-slate-400 mt-0.5 group-hover:text-synapse-500 transition-colors" />
              <span>Studied at <strong className="text-slate-900">{viewedProfile.education}</strong></span>
            </div>
          )}

          {viewedProfile.location && (
            <div className="flex items-start gap-3 text-slate-700 group">
              <Home className="w-5 h-5 text-slate-400 mt-0.5 group-hover:text-synapse-500 transition-colors" />
              <span>Lives in <strong className="text-slate-900">{viewedProfile.location}</strong></span>
            </div>
          )}

          {viewedProfile.website && (
            <div className="flex items-start gap-3 text-slate-700 group">
              <LinkIcon className="w-5 h-5 text-slate-400 mt-0.5 group-hover:text-synapse-500 transition-colors" />
              <a href={viewedProfile.website.startsWith('http') ? viewedProfile.website : `https://${viewedProfile.website}`} target="_blank" rel="noopener noreferrer" className="text-synapse-600 hover:underline truncate">
                {viewedProfile.website}
              </a>
            </div>
          )}
        </div>

        {isOwnProfile && (
           <Button 
             variant="secondary" 
             className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
             onClick={() => setIsEditProfileOpen(true)}
           >
             Edit Details
           </Button>
        )}
      </div>
    </Card>
  );

  const PhotosPreview = () => (
    <Card className="overflow-hidden border-white/60 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-4 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Photos</h3>
        <button onClick={() => setActiveTab('Photos')} className="text-synapse-600 text-sm hover:underline font-medium">See all</button>
      </div>
      <div className="p-2 pt-0">
        <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
          {photos.slice(0, 9).map((photo, i) => (
            <div key={i} className="aspect-square bg-slate-100 relative group cursor-pointer overflow-hidden">
              <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
          {photos.length === 0 && (
             <div className="col-span-3 py-8 text-center bg-slate-50/50 rounded-xl text-slate-400 text-sm">
                No photos available
             </div>
          )}
        </div>
      </div>
    </Card>
  );

  const FriendsPreview = () => (
    <Card className="overflow-hidden border-white/60 bg-white/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-4 flex justify-between items-center">
        <div>
           <h3 className="text-lg font-bold text-slate-900">Friends</h3>
           <p className="text-xs text-slate-500 font-medium">{viewedProfile.friends?.length || 0} connections</p>
        </div>
        <button onClick={() => setActiveTab('Friends')} className="text-synapse-600 text-sm hover:underline font-medium">See all</button>
      </div>
      <div className="p-2 pt-0">
        <div className="grid grid-cols-3 gap-2">
          {friends.slice(0, 9).map((friend) => (
            <div 
              key={friend.uid} 
              className="cursor-pointer group text-center"
              onClick={() => onViewProfile?.(friend.uid)}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 mb-1.5 shadow-sm border border-slate-100">
                <img src={friend.photoURL || `https://ui-avatars.com/api/?name=${friend.displayName}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <p className="text-[12px] font-semibold text-slate-700 leading-tight truncate px-1 group-hover:text-synapse-600 transition-colors">{friend.displayName?.split(' ')[0]}</p>
            </div>
          ))}
          {friends.length === 0 && (
             <div className="col-span-3 py-8 text-center bg-slate-50/50 rounded-xl text-slate-400 text-sm">
                No friends yet
             </div>
          )}
        </div>
      </div>
    </Card>
  );

  const AboutTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 animate-in fade-in slide-in-from-bottom-2">
        {/* About Navigation */}
        <Card className="h-fit p-2 bg-white/80 backdrop-blur-xl border-white/60">
           <h3 className="px-4 py-3 text-lg font-bold text-slate-900 border-b border-slate-100 mb-2">About</h3>
           <div className="space-y-1">
              {['Overview', 'Work and Education', 'Places Lived', 'Contact and Basic Info', 'Family and Relationships'].map(item => (
                 <button key={item} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-slate-100 text-slate-600 font-medium text-[15px] transition-colors">
                    {item}
                 </button>
              ))}
           </div>
        </Card>

        {/* Content */}
        <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/60 min-h-[400px]">
           <div className="space-y-8">
              <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Identity</h4>
                 <div className="flex items-center gap-4">
                    <User className="w-6 h-6 text-slate-400" />
                    <div>
                       <p className="font-semibold text-slate-900 text-lg">{viewedProfile.displayName}</p>
                       <p className="text-slate-500 text-sm">@{viewedProfile.email?.split('@')[0]}</p>
                    </div>
                 </div>
              </div>

              <Separator />
              
              <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Work & Education</h4>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <Briefcase className="w-6 h-6 text-slate-400" />
                       <div>
                          <p className="text-slate-900 text-[15px]">{viewedProfile.work ? `Works at ${viewedProfile.work}` : 'No workplace added'}</p>
                          {viewedProfile.position && <p className="text-slate-500 text-sm">{viewedProfile.position}</p>}
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <GraduationCap className="w-6 h-6 text-slate-400" />
                       <div>
                          <p className="text-slate-900 text-[15px]">{viewedProfile.education ? `Studied at ${viewedProfile.education}` : 'No education added'}</p>
                          {viewedProfile.highSchool && <p className="text-slate-500 text-sm">Went to {viewedProfile.highSchool}</p>}
                       </div>
                    </div>
                 </div>
              </div>

              <Separator />

              <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Basic Info</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4">
                       <MapPin className="w-6 h-6 text-slate-400" />
                       <div>
                          <p className="text-slate-900 text-[15px]">{viewedProfile.location || 'No location'}</p>
                          <p className="text-slate-500 text-xs">Current City</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <Heart className="w-6 h-6 text-slate-400" />
                       <div>
                          <p className="text-slate-900 text-[15px]">{viewedProfile.relationshipStatus || 'Single'}</p>
                          <p className="text-slate-500 text-xs">Relationship</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <Calendar className="w-6 h-6 text-slate-400" />
                       <div>
                          <p className="text-slate-900 text-[15px]">{viewedProfile.birthDate ? format(new Date(viewedProfile.birthDate), 'MMMM do, yyyy') : 'No birth date'}</p>
                          <p className="text-slate-500 text-xs">Birth Date</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <Globe className="w-6 h-6 text-slate-400" />
                       <div>
                          <p className="text-slate-900 text-[15px]">{viewedProfile.website || 'No website'}</p>
                          <p className="text-slate-500 text-xs">Website</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </Card>
    </div>
  );

  const FriendsTab = () => (
     <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/60 min-h-[500px] animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
           <h3 className="text-xl font-bold text-slate-900">Friends</h3>
           <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search friends" 
                className="w-full bg-slate-100 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-synapse-500/20 transition-all" 
              />
           </div>
        </div>
        
        {friends.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map(friend => (
                 <div 
                   key={friend.uid} 
                   className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer"
                   onClick={() => onViewProfile?.(friend.uid)}
                 >
                    <Avatar className="w-16 h-16 rounded-xl border border-slate-100">
                       <AvatarImage src={friend.photoURL || ''} />
                       <AvatarFallback>{friend.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                       <p className="font-bold text-slate-900 truncate group-hover:text-synapse-600 transition-colors">{friend.displayName}</p>
                       <p className="text-xs text-slate-500 font-medium">Synapse User</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                       </Button>
                    </div>
                 </div>
              ))}
           </div>
        ) : (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <Users className="w-8 h-8 opacity-20" />
              </div>
              <p>No friends to show yet.</p>
           </div>
        )}
     </Card>
  );

  const PhotosTab = () => (
     <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/60 min-h-[500px] animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-bold text-slate-900">Photos</h3>
           <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Photos of you</Button>
              <Button variant="ghost" size="sm" className="font-semibold text-synapse-600 bg-synapse-50">Your photos</Button>
           </div>
        </div>

        {photos.length > 0 ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
              {photos.map((photo, i) => (
                 <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden group cursor-pointer relative shadow-sm hover:shadow-lg transition-all hover:z-10 hover:scale-105 duration-300">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                 </div>
              ))}
           </div>
        ) : (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <ImageIcon className="w-8 h-8 opacity-20" />
              </div>
              <p>No photos uploaded yet.</p>
           </div>
        )}
     </Card>
  );

  const VideosTab = () => {
     // Filter posts with videos
     const videoPosts = posts.filter(p => p.video);
     
     return (
        <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/60 min-h-[500px] animate-in fade-in slide-in-from-bottom-2">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Videos</h3>
           </div>

           {videoPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {videoPosts.map((post) => (
                    <div key={post.id} className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-md border border-slate-200">
                       <video src={post.video} className="w-full h-full object-cover" controls />
                    </div>
                 ))}
              </div>
           ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <MonitorPlay className="w-8 h-8 opacity-20" />
                 </div>
                 <p>No videos shared yet.</p>
                 {isOwnProfile && <p className="text-xs mt-2 text-synapse-500">Upload a video in a post to see it here.</p>}
              </div>
           )}
        </Card>
     );
  };

  const CheckInsTab = () => {
     const locationPosts = posts.filter(p => p.location);

     return (
        <Card className="p-6 bg-white/80 backdrop-blur-xl border-white/60 min-h-[500px] animate-in fade-in slide-in-from-bottom-2">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Check-ins</h3>
           </div>

           {locationPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {locationPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                       <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 fill-current" />
                       </div>
                       <div>
                          <h4 className="font-bold text-slate-900 text-lg">{post.location}</h4>
                          <p className="text-sm text-slate-500">{format(post.timestamp, 'MMMM do, yyyy')}</p>
                       </div>
                    </div>
                 ))}
              </div>
           ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 opacity-20" />
                 </div>
                 <p>No check-ins yet.</p>
                 {isOwnProfile && <p className="text-xs mt-2 text-synapse-500">Add a location to your posts to see it here.</p>}
              </div>
           )}
        </Card>
     );
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]/50 -mt-6 pb-20">
      
      {/* --- HERO HEADER --- */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/40 shadow-[0_1px_10px_rgba(0,0,0,0.02)]">
         <div className="max-w-[1250px] mx-auto px-0 md:px-4 lg:px-8">
            
            {/* Cover Photo */}
            <div className="relative group">
               <div className="h-[200px] md:h-[350px] lg:h-[400px] w-full md:rounded-b-[2.5rem] overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 relative">
                  {viewedProfile.coverURL ? (
                     <img src={viewedProfile.coverURL} className="w-full h-full object-cover animate-in fade-in duration-700" alt="Cover" />
                  ) : (
                     <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-cover opacity-30 mix-blend-overlay" />
                  )}
                  
                  {/* Default Gradient if no image */}
                  {!viewedProfile.coverURL && (
                     <div className="absolute inset-0 bg-gradient-to-r from-synapse-500 via-purple-500 to-indigo-500 opacity-90" />
                  )}

                  {/* Gradient Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                  {isOwnProfile && (
                     <Button 
                        onClick={() => setIsEditProfileOpen(true)}
                        className="absolute bottom-4 right-4 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border-0 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                     >
                        <Camera className="w-4 h-4 mr-2" /> Edit Cover
                     </Button>
                  )}
               </div>
            </div>

            {/* Profile Info Bar */}
            <div className="px-4 md:px-8 pb-4">
               <div className="flex flex-col md:flex-row items-center md:items-end -mt-[70px] md:-mt-[40px] relative z-10 gap-6">
                  
                  {/* Profile Pic */}
                  <div className="relative group">
                     <div className="w-[150px] h-[150px] md:w-[180px] md:h-[180px] rounded-full border-[6px] border-white/80 bg-white shadow-xl overflow-hidden backdrop-blur-sm">
                        <img 
                           src={viewedProfile.photoURL || `https://ui-avatars.com/api/?name=${viewedProfile.displayName}`} 
                           className="w-full h-full object-cover" 
                           alt="Profile" 
                        />
                     </div>
                     {isOwnProfile && (
                        <div 
                           onClick={() => setIsEditProfileOpen(true)}
                           className="absolute bottom-2 right-2 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer shadow-md border-2 border-white transition-colors"
                        >
                           <Camera className="w-5 h-5 text-slate-700" />
                        </div>
                     )}
                  </div>

                  {/* Name & Stats */}
                  <div className="flex-1 text-center md:text-left mb-2 md:mb-6">
                     <h1 className="text-[32px] md:text-[38px] font-black text-slate-900 leading-tight tracking-tight">
                        {viewedProfile.displayName}
                     </h1>
                     <p className="text-slate-500 font-semibold text-[16px] mb-2">
                        {viewedProfile.friends?.length || 0} friends
                     </p>
                     
                     {/* Friends Stack */}
                     <div 
                        className="flex justify-center md:justify-start -space-x-2.5 cursor-pointer"
                        onClick={() => setActiveTab('Friends')}
                     >
                        {friends.slice(0, 8).map((f, i) => (
                           <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm hover:z-10 hover:scale-110 transition-transform" title={f.displayName}>
                              <img src={f.photoURL || ''} className="w-full h-full object-cover" />
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6 w-full md:w-auto">
                     {isOwnProfile ? (
                        <>
                           <Button 
                              className="bg-synapse-600 hover:bg-synapse-700 text-white rounded-xl px-6 shadow-lg shadow-synapse-500/25 font-bold h-11"
                           >
                              <Plus className="w-5 h-5 mr-2" /> Add to Story
                           </Button>
                           <Button 
                              variant="secondary" 
                              onClick={() => setIsEditProfileOpen(true)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-6 font-bold h-11"
                           >
                              <Edit3 className="w-5 h-5 mr-2" /> Edit Profile
                           </Button>
                        </>
                     ) : (
                        <>
                           <FriendButton targetUid={viewedProfile.uid} className="h-11 px-6 rounded-xl" />
                           <Button 
                              variant="secondary"
                              onClick={() => openChat(viewedProfile.uid)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-6 font-bold h-11"
                           >
                              <MessageCircle className="w-5 h-5 mr-2" /> Message
                           </Button>
                        </>
                     )}
                  </div>
               </div>

               <Separator className="mt-6 mb-1 bg-slate-200/60" />

               {/* Navigation Tabs */}
               <div className="flex items-center gap-1 md:gap-2 overflow-x-auto hide-scrollbar pt-1">
                  {['Posts', 'About', 'Friends', 'Photos', 'Videos', 'Check-ins'].map((tab) => (
                     <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                           "px-4 py-4 font-bold text-[15px] rounded-t-lg transition-all relative whitespace-nowrap",
                           activeTab === tab 
                              ? "text-synapse-600" 
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg"
                        )}
                     >
                        {tab}
                        {activeTab === tab && (
                           <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-synapse-600 rounded-t-full shadow-[0_-2px_6px_rgba(99,102,241,0.4)]" />
                        )}
                     </button>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-[1250px] mx-auto px-4 lg:px-8 py-6">
         
         {activeTab === 'Posts' && (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 animate-in fade-in slide-in-from-bottom-2">
               
               {/* Left Sidebar (Desktop) */}
               <div className="space-y-6">
                  <IntroCard />
                  <PhotosPreview />
                  <FriendsPreview />
                  
                  {/* Copyright / Footer Links */}
                  <div className="text-[11px] text-slate-400 px-2 leading-relaxed">
                     <p>
                        <button onClick={() => onNavigate?.('legal:privacy')} className="hover:underline hover:text-slate-600">Privacy</button> · 
                        <button onClick={() => onNavigate?.('legal:terms')} className="hover:underline hover:text-slate-600">Terms</button> · 
                        <button onClick={() => onNavigate?.('legal:advertising')} className="hover:underline hover:text-slate-600">Advertising</button> · 
                        <button onClick={() => onNavigate?.('legal:ad_choices')} className="hover:underline hover:text-slate-600">Ad Choices</button> · 
                        <button onClick={() => onNavigate?.('legal:cookies')} className="hover:underline hover:text-slate-600">Cookies</button> · 
                        More · Synapse © 2026
                     </p>
                  </div>
               </div>

               {/* Right Feed */}
               <div className="space-y-6">
                  {isOwnProfile && <CreatePost />}
                  
                  {/* Filter / Manage Bar */}
                  <Card className="p-4 flex justify-between items-center bg-white/80 backdrop-blur-xl border-white/60 shadow-sm">
                     <h3 className="font-bold text-xl text-slate-900">Posts</h3>
                     <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                           <Layout className="w-4 h-4 mr-2" /> Filters
                        </Button>
                        <Button variant="ghost" size="sm" className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                           <Grid className="w-4 h-4 mr-2" /> Manage
                        </Button>
                     </div>
                  </Card>

                  {loading ? (
                     <div className="space-y-4">
                        <div className="h-40 bg-white/50 rounded-2xl animate-pulse" />
                        <div className="h-64 bg-white/50 rounded-2xl animate-pulse" />
                     </div>
                  ) : posts.length > 0 ? (
                     <div className="space-y-4">
                        {posts.map(post => <PostComponent key={post.id} post={post} />)}
                     </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center py-16 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                           <Sparkles className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No posts yet</h3>
                        <p className="text-slate-500">Share something to get started!</p>
                     </div>
                  )}
               </div>
            </div>
         )}

         {activeTab === 'About' && <AboutTab />}
         {activeTab === 'Friends' && <FriendsTab />}
         {activeTab === 'Photos' && <PhotosTab />}
         {activeTab === 'Videos' && <VideosTab />}
         {activeTab === 'Check-ins' && <CheckInsTab />}
      </div>

      <EditProfileDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} />
    </div>
  );
};
