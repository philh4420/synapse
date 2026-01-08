import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post as PostComponent } from './Post';
import { CreatePost } from './CreatePost';
import { Post as PostType, UserProfile } from '../types';
import { collection, query, where, orderBy, onSnapshot, documentId, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  MapPin, Link as LinkIcon, Edit3, Loader2, 
  Briefcase, GraduationCap, Heart, Camera, MoreHorizontal, 
  Plus, Search, Grid, Home, Phone, Globe, Calendar, User
} from 'lucide-react';
import { EditProfileDialog } from './EditProfileDialog';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Separator } from './ui/Separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export const Profile: React.FC = () => {
  const { userProfile, user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Posts by current user
    const postsQuery = query(
      collection(db, 'posts'),
      where('author.uid', '==', user.uid),
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
      
      // Extract photos from posts (Real Data)
      const userPhotos = postsData
        .filter(p => p.image)
        .map(p => p.image!);
      setPhotos(userPhotos);
      
      setLoading(false);
    });

    // 2. Fetch Real Friends (based on 'following' array)
    const fetchFriends = async () => {
      if (!userProfile?.following || userProfile.following.length === 0) {
        setFriends([]);
        return;
      }
      
      try {
        // Firestore 'in' query supports up to 10 items (or 30 depending on version). 
        // For production, this would need batching or a separate 'friendships' collection.
        // We slice to 10 for safety in this demo context.
        const friendIds = userProfile.following.slice(0, 10);
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
  }, [user, userProfile?.following]);

  if (!userProfile) return null;

  // --- Sub-components for Tabs ---

  const PostsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
      {/* Left Column (Sticky Details) */}
      <div className="space-y-4">
        {/* Intro Card */}
        <Card className="p-4 shadow-sm border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Intro</h3>
          <div className="space-y-4 text-[15px] text-slate-900">
            <div className="text-center pb-2">
              <p className="text-sm text-slate-600 mb-4">{userProfile.bio || 'Add a short bio to tell people more about yourself.'}</p>
              <Button 
                variant="secondary" 
                className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 font-semibold mb-2"
                onClick={() => setIsEditProfileOpen(true)}
              >
                Edit bio
              </Button>
            </div>
            
            {userProfile.work && (
              <div className="flex items-center gap-3 text-slate-600">
                <Briefcase className="w-5 h-5 text-slate-400" />
                <span>Works at <strong className="text-slate-900">{userProfile.work}</strong></span>
              </div>
            )}
            
            {userProfile.education && (
              <div className="flex items-center gap-3 text-slate-600">
                <GraduationCap className="w-5 h-5 text-slate-400" />
                <span>Studied at <strong className="text-slate-900">{userProfile.education}</strong></span>
              </div>
            )}

            {userProfile.location && (
              <div className="flex items-center gap-3 text-slate-600">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span>Lives in <strong className="text-slate-900">{userProfile.location}</strong></span>
              </div>
            )}

            {userProfile.website && (
              <div className="flex items-center gap-3 text-slate-600">
                <LinkIcon className="w-5 h-5 text-slate-400" />
                <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-synapse-600 hover:underline truncate">
                  {userProfile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            
            <Button 
              onClick={() => setIsEditProfileOpen(true)}
              className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 font-semibold"
            >
              Edit details
            </Button>
          </div>
        </Card>

        {/* Photos Widget */}
        <Card className="p-4 shadow-sm border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">Photos</h3>
            <button 
              onClick={() => setActiveTab('Photos')}
              className="text-synapse-600 text-[17px] hover:bg-slate-50 px-2 py-1 rounded-md transition-colors font-normal"
            >
              See all photos
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {photos.slice(0, 9).map((photo, i) => (
              <div key={i} className="aspect-square bg-slate-100">
                <img src={photo} alt="" className="w-full h-full object-cover hover:opacity-90 cursor-pointer" />
              </div>
            ))}
            {photos.length === 0 && (
              <div className="col-span-3 text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl">
                No photos yet
              </div>
            )}
          </div>
        </Card>

        {/* Friends Widget */}
        <Card className="p-4 shadow-sm border-slate-200">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xl font-bold text-slate-900">Friends</h3>
            <button 
              onClick={() => setActiveTab('Friends')}
              className="text-synapse-600 text-[17px] hover:bg-slate-50 px-2 py-1 rounded-md transition-colors font-normal"
            >
              See all friends
            </button>
          </div>
          <p className="text-slate-500 text-[15px] mb-4">{friends.length} friends</p>
          
          <div className="grid grid-cols-3 gap-3">
            {friends.slice(0, 9).map((friend) => (
              <div key={friend.uid} className="cursor-pointer group">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-1">
                  <img 
                    src={friend.photoURL || `https://ui-avatars.com/api/?name=${friend.displayName}`} 
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" 
                  />
                </div>
                <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">
                  {friend.displayName}
                </p>
              </div>
            ))}
          </div>
          {friends.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">
               Start following people to see them here.
            </div>
          )}
        </Card>
      </div>

      {/* Right Column (Feed) */}
      <div className="space-y-4">
        <CreatePost />
        
        <Card className="p-3 flex justify-between items-center shadow-sm border-slate-200">
          <h3 className="font-bold text-xl text-slate-900 px-2">Posts</h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              <Search className="w-4 h-4 mr-1" /> Filters
            </Button>
            <Button variant="secondary" size="sm" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
              <Grid className="w-4 h-4 mr-1" /> Manage posts
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-synapse-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostComponent key={post.id} post={post} />
            ))}
            {posts.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Edit3 className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No posts available</h3>
                <p className="text-slate-500">Posts you create will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const AboutTab = () => {
    const [subTab, setSubTab] = useState('Overview');
    
    const menuItems = [
      { name: 'Overview', icon: null },
      { name: 'Work and education', icon: null },
      { name: 'Places lived', icon: null },
      { name: 'Contact and basic info', icon: null },
      { name: 'Family and relationships', icon: null },
      { name: 'Details about you', icon: null },
      { name: 'Life events', icon: null },
    ];

    const renderAboutContent = () => {
      // Reusable item renderer
      const InfoItem = ({ icon: Icon, text, subtext, action }: any) => (
         <div className="flex items-start justify-between group mb-6">
            <div className="flex items-center gap-3">
               {Icon && <Icon className="w-6 h-6 text-slate-400" />}
               <div>
                  <div className="text-slate-900 font-medium text-[15px]">{text}</div>
                  {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
               </div>
            </div>
            {action && (
               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditProfileOpen(true)}>
                  <Edit3 className="w-5 h-5 text-slate-500" />
               </Button>
            )}
         </div>
      );

      const EmptyState = ({ label }: {label: string}) => (
        <div className="flex items-center gap-3 text-synapse-600 cursor-pointer hover:underline mb-4" onClick={() => setIsEditProfileOpen(true)}>
           <Plus className="w-6 h-6 border-2 border-synapse-600 rounded-full p-0.5" />
           <span className="font-medium text-[15px]">Add {label}</span>
        </div>
      );

      switch (subTab) {
        case 'Overview':
        case 'Work and education':
          return (
            <div className="space-y-2">
              <h4 className="text-[17px] font-bold text-slate-900 mb-4">{subTab === 'Overview' ? 'Overview' : 'Work and Education'}</h4>
              
              {userProfile.work ? (
                <InfoItem icon={Briefcase} text={`Works at ${userProfile.work}`} action />
              ) : (
                <EmptyState label="a workplace" />
              )}
              
              {userProfile.education ? (
                <InfoItem icon={GraduationCap} text={`Studied at ${userProfile.education}`} action />
              ) : (
                <EmptyState label="a high school or college" />
              )}
              
              {userProfile.location && (
                <InfoItem icon={Home} text={`Lives in ${userProfile.location}`} action />
              )}
            </div>
          );
        case 'Places lived':
           return (
             <div>
                <h4 className="text-[17px] font-bold text-slate-900 mb-4">Places Lived</h4>
                {userProfile.location ? (
                  <InfoItem icon={MapPin} text={userProfile.location} subtext="Current City" action />
                ) : (
                  <EmptyState label="current city" />
                )}
             </div>
           );
        case 'Contact and basic info':
           return (
             <div>
                <h4 className="text-[17px] font-bold text-slate-900 mb-4">Contact Info</h4>
                <InfoItem icon={Phone} text={user.email} subtext="Email" />
                
                {userProfile.website && (
                   <InfoItem icon={Globe} text={userProfile.website} subtext="Website" action />
                )}

                <h4 className="text-[17px] font-bold text-slate-900 mb-4 mt-8">Basic Info</h4>
                <InfoItem icon={User} text={userProfile.displayName} subtext="Name" action />
                {userProfile.birthDate && (
                  <InfoItem icon={Calendar} text={userProfile.birthDate} subtext="Birth Date" action />
                )}
             </div>
           );
        default:
          return (
            <div className="text-slate-500 italic py-10">
              Details for {subTab} are editable via the "Edit Profile" button.
            </div>
          );
      }
    };

    return (
      <Card className="flex flex-col md:flex-row min-h-[500px] border-slate-200 shadow-sm overflow-hidden">
        {/* About Sidebar */}
        <div className="w-full md:w-1/3 border-r border-slate-100 p-2">
           <h3 className="text-xl font-bold text-slate-900 px-4 py-3">About</h3>
           <div className="space-y-0.5">
             {menuItems.map(item => (
               <button
                 key={item.name}
                 onClick={() => setSubTab(item.name)}
                 className={cn(
                   "w-full text-left px-4 py-2.5 text-[15px] font-semibold rounded-lg transition-colors",
                   subTab === item.name 
                     ? "bg-synapse-50 text-synapse-700" 
                     : "text-slate-600 hover:bg-slate-50"
                 )}
               >
                 {item.name}
               </button>
             ))}
           </div>
        </div>
        {/* About Content */}
        <div className="flex-1 p-6 md:p-8">
           {renderAboutContent()}
        </div>
      </Card>
    );
  };

  const FriendsTab = () => (
    <Card className="p-6 border-slate-200 shadow-sm min-h-[500px]">
       <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Friends</h3>
          <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
             <input type="text" placeholder="Search friends" className="bg-slate-100 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none" />
          </div>
       </div>

       {friends.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {friends.map(friend => (
              <div key={friend.uid} className="border border-slate-100 rounded-lg p-3 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
                  <Avatar className="w-16 h-16 rounded-lg border border-slate-100">
                    <AvatarImage src={friend.photoURL || ''} />
                    <AvatarFallback>{friend.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{friend.displayName}</p>
                    <p className="text-xs text-slate-500">Mutual friends</p>
                  </div>
              </div>
            ))}
          </div>
       ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <div className="bg-slate-50 p-4 rounded-full mb-4">
                <User className="w-8 h-8 text-slate-300" />
             </div>
             <p className="font-semibold text-lg text-slate-600">No friends to show</p>
             <p className="text-sm">When you follow people, they will appear here.</p>
          </div>
       )}
    </Card>
  );

  const PhotosTab = () => (
    <Card className="p-6 border-slate-200 shadow-sm min-h-[500px]">
       <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Photos</h3>
          <button className="text-synapse-600 text-sm font-semibold hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">Add Photos</button>
       </div>

       {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {photos.map((photo, i) => (
               <div key={i} className="aspect-square bg-slate-100 rounded-sm overflow-hidden group cursor-pointer relative">
                  <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
               </div>
            ))}
          </div>
       ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Camera className="w-8 h-8 text-slate-300" />
             </div>
             <p className="font-semibold text-lg text-slate-600">No photos</p>
             <p className="text-sm">Photos you post will appear here.</p>
          </div>
       )}
    </Card>
  );

  // --- Main Render ---
  return (
    <div className="bg-[#F0F2F5] min-h-screen -mt-6">
       {/* --- Header Section (White Background) --- */}
       <div className="bg-white shadow-sm pb-0">
          <div className="max-w-[1095px] mx-auto relative">
             
             {/* Cover Photo */}
             <div className="relative w-full h-[200px] md:h-[350px] lg:h-[400px] bg-slate-200 rounded-b-xl overflow-hidden group">
                {userProfile.coverURL ? (
                   <img src={userProfile.coverURL} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full bg-gradient-to-b from-slate-300 to-slate-400" />
                )}
                <button 
                  onClick={() => setIsEditProfileOpen(true)}
                  className="absolute bottom-4 right-4 bg-white text-slate-900 px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                >
                   <Camera className="w-5 h-5" />
                   <span className="hidden sm:inline">Edit cover photo</span>
                </button>
             </div>

             {/* Profile Info Section */}
             <div className="px-4 lg:px-8 pb-4">
                <div className="flex flex-col md:flex-row gap-4 items-center md:items-end -mt-[80px] md:-mt-[30px] relative z-10">
                   
                   {/* Avatar */}
                   <div className="relative">
                      <div className="w-[168px] h-[168px] rounded-full border-[4px] border-white bg-white overflow-hidden relative group shadow-sm">
                         <img 
                            src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.displayName}`} 
                            alt={userProfile.displayName || 'Profile'} 
                            className="w-full h-full object-cover"
                         />
                         <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors pointer-events-none" />
                      </div>
                      <button 
                        onClick={() => setIsEditProfileOpen(true)}
                        className="absolute bottom-2 right-2 bg-slate-200 p-2 rounded-full hover:bg-slate-300 border-[2px] border-white transition-colors"
                      >
                         <Camera className="w-5 h-5 text-slate-800" />
                      </button>
                   </div>

                   {/* Name & Friends Count */}
                   <div className="flex-1 text-center md:text-left mb-2 md:mb-4 pt-4 md:pt-0">
                      <h1 className="text-[32px] font-bold text-slate-900 leading-tight">{userProfile.displayName}</h1>
                      <p className="text-slate-500 font-semibold text-[15px]">{friends.length} friends</p>
                      
                      {/* Friend Avatars overlap */}
                      <div className="flex justify-center md:justify-start -space-x-2 mt-2">
                         {friends.slice(0, 8).map((f, i) => (
                            <Avatar key={i} className="w-8 h-8 border-[2px] border-white">
                               <AvatarImage src={f.photoURL || ''} />
                               <AvatarFallback>{f.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                         ))}
                      </div>
                   </div>

                   {/* Action Buttons */}
                   <div className="flex flex-col sm:flex-row gap-2 mb-4 w-full md:w-auto">
                      <Button variant="primary" className="gap-2 px-4 bg-synapse-600 hover:bg-synapse-700 w-full sm:w-auto">
                         <Plus className="w-4 h-4" />
                         Add to story
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="gap-2 px-4 bg-slate-200 text-slate-900 hover:bg-slate-300 w-full sm:w-auto"
                        onClick={() => setIsEditProfileOpen(true)}
                      >
                         <Edit3 className="w-4 h-4" />
                         Edit profile
                      </Button>
                   </div>
                </div>

                <Separator className="my-4 h-[1px] bg-slate-300/50" />

                {/* Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                   {['Posts', 'About', 'Friends', 'Photos', 'Videos', 'Check-ins', 'More'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                           px-4 py-3 font-semibold text-[15px] rounded-lg transition-colors whitespace-nowrap
                           ${activeTab === tab 
                              ? 'text-synapse-600 border-b-[3px] border-synapse-600 rounded-b-none' 
                              : 'text-slate-600 hover:bg-slate-100'
                           }
                        `}
                      >
                         {tab}
                      </button>
                   ))}
                   <div className="flex-1" />
                   <Button variant="secondary" size="icon" className="bg-slate-100 hover:bg-slate-200">
                      <MoreHorizontal className="w-5 h-5 text-slate-600" />
                   </Button>
                </div>
             </div>
          </div>
       </div>

       {/* --- Dynamic Content Area --- */}
       <div className="max-w-[1095px] mx-auto px-2 md:px-4 lg:px-8 py-4">
          {activeTab === 'Posts' && <PostsTab />}
          {activeTab === 'About' && <AboutTab />}
          {activeTab === 'Friends' && <FriendsTab />}
          {activeTab === 'Photos' && <PhotosTab />}
          {['Videos', 'Check-ins', 'More'].includes(activeTab) && (
             <div className="flex justify-center py-20 text-slate-400 font-medium bg-white rounded-xl border border-slate-200 shadow-sm">
                This section is under construction.
             </div>
          )}
       </div>
       
       <EditProfileDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} />
    </div>
  );
};