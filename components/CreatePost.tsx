
import React, { useState, useRef, useEffect } from 'react';
import { 
  Image, Video, Smile, X, Loader2, Globe, MapPin, UserPlus, ChevronDown, 
  Type, Search, ArrowLeft, MoreHorizontal, Gift, Navigation, Users, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { Separator } from './ui/Separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose,
  DialogDescription
} from './ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/DropdownMenu';
import { uploadToCloudinary } from '../utils/upload';
import { collection, addDoc, serverTimestamp, getDocs, query, limit, where } from 'firebase/firestore';
import { db, GIPHY_API_KEY } from '../firebaseConfig';
import { UserProfile } from '../types';

// Background Gradients
const BACKGROUNDS = [
  'bg-white',
  'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold text-2xl text-center',
  'bg-gradient-to-r from-blue-400 to-emerald-400 text-white font-bold text-2xl text-center',
  'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold text-2xl text-center',
  'bg-gradient-to-r from-slate-900 to-slate-700 text-white font-bold text-2xl text-center',
  'bg-[url(https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80)] bg-cover text-white font-bold text-2xl text-center',
  'bg-[url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80)] bg-cover text-white font-bold text-2xl text-center',
];

const FEELINGS = [
  { emoji: '🙂', label: 'happy' },
  { emoji: '🥰', label: 'loved' },
  { emoji: '😔', label: 'sad' },
  { emoji: '😠', label: 'angry' },
  { emoji: '🥳', label: 'excited' },
  { emoji: '😴', label: 'tired' },
  { emoji: '😎', label: 'cool' },
  { emoji: '🤪', label: 'crazy' },
];

export const CreatePost: React.FC = () => {
  const { user, userProfile } = useAuth();
  
  // Content State
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Enhanced Features State
  const [background, setBackground] = useState('');
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [feeling, setFeeling] = useState<{emoji: string, label: string} | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<UserProfile[]>([]);
  const [gif, setGif] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [subModal, setSubModal] = useState<'none' | 'feeling' | 'location' | 'tag' | 'gif'>('none');
  
  // Search States
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  
  // Location Search State (REAL)
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Real Location Handlers ---

  useEffect(() => {
    const searchLocation = async () => {
      if (locationSearch.trim().length < 2) {
        setLocationResults([]);
        return;
      }
      try {
        // Using OpenStreetMap Nominatim API (Free, Real Data)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=8&addressdetails=1`);
        if (res.ok) {
          const data = await res.json();
          setLocationResults(data);
        }
      } catch (e) {
        console.error("Location search failed", e);
      }
    };

    const timeoutId = setTimeout(searchLocation, 500);
    return () => clearTimeout(timeoutId);
  }, [locationSearch]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        // Reverse Geocoding
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`);
        if (res.ok) {
          const data = await res.json();
          const addr = data.address;
          // Construct a friendly name (City, State)
          const name = addr.city || addr.town || addr.village || addr.suburb || data.name.split(',')[0];
          const region = addr.state || addr.country;
          setLocation(`${name}, ${region}`);
          setSubModal('none');
        }
      } catch (error) {
        console.error("Error getting location details:", error);
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      console.error("Geo error:", error);
      setIsLocating(false);
      alert("Could not retrieve location.");
    });
  };

  // --- Other Handlers ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
      
      // Auto-open dialog
      if (!isOpen) setIsOpen(true);
      
      // Reset background if images are added
      setBackground('');
      setShowBackgrounds(false);
      setGif(null);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    const newUrls = [...previewUrls];
    newFiles.splice(index, 1);
    newUrls.splice(index, 1);
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const handleGifSearch = async (term: string) => {
    setGifSearch(term);
    if (!term) {
      // Load trending if empty
      const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=12`);
      const data = await res.json();
      setGifs(data.data);
      return;
    }
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${term}&limit=12`);
    const data = await res.json();
    setGifs(data.data);
  };

  const selectGif = (url: string) => {
    setGif(url);
    setSelectedFiles([]); // Clear images if GIF selected
    setPreviewUrls([]);
    setSubModal('none');
  };

  const handleUserSearch = async (term: string) => {
    setUserSearch(term);
    if (!term) {
      setUserResults([]);
      return;
    }
    const q = query(collection(db, 'users'), where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'), limit(5));
    const snap = await getDocs(q);
    setUserResults(snap.docs.map(d => d.data() as UserProfile));
  };

  const handleSubmit = async () => {
    if ((!content.trim() && selectedFiles.length === 0 && !gif) || isUploading || !user) return;
    
    setIsUploading(true);
    try {
      // Upload all images
      const imageUrls = [];
      for (const file of selectedFiles) {
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }
      
      await addDoc(collection(db, 'posts'), {
        author: {
          name: userProfile?.displayName || user.displayName || 'Anonymous',
          handle: user.email ? `@${user.email.split('@')[0]}` : '@user',
          avatar: userProfile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
          uid: user.uid
        },
        content: content,
        images: imageUrls.length > 0 ? imageUrls : null,
        gif: gif,
        background: background || null,
        feeling: feeling ? `${feeling.emoji} feeling ${feeling.label}` : null,
        location: location || null,
        taggedUsers: taggedUsers.map(u => u.displayName),
        privacy: privacy, // Save privacy setting
        
        timestamp: serverTimestamp(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedByUsers: []
      });
      
      // Reset
      setContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setGif(null);
      setBackground('');
      setFeeling(null);
      setLocation(null);
      setTaggedUsers([]);
      setPrivacy('public');
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const firstName = userProfile?.displayName?.split(' ')[0] || 'User';

  const getPrivacyIcon = (p: string) => {
    switch(p) {
      case 'friends': return <Users className="w-3 h-3" />;
      case 'only_me': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const getPrivacyLabel = (p: string) => {
    switch(p) {
      case 'friends': return 'Friends';
      case 'only_me': return 'Only me';
      default: return 'Public';
    }
  };

  return (
    <Card className="px-4 pt-3 pb-2 shadow-sm border-slate-200 bg-white rounded-xl">
      <div className="flex gap-3 mb-3">
        <Avatar className="h-10 w-10 cursor-pointer hover:brightness-95 transition-all">
          <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
          <AvatarFallback>{firstName[0]}</AvatarFallback>
        </Avatar>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <div className="flex-1 bg-[#F0F2F5] hover:bg-[#E4E6E9] rounded-full px-4 py-2.5 cursor-pointer transition-colors text-slate-500 hover:text-slate-600 text-[15px] select-none flex items-center">
              What's on your mind, {firstName}?
            </div>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-xl h-[550px] flex flex-col">
            <DialogHeader className="p-4 border-b border-slate-200 relative flex items-center justify-center shrink-0">
              {subModal !== 'none' && (
                <button 
                  onClick={() => setSubModal('none')} 
                  className="absolute left-4 top-4 p-1 hover:bg-slate-100 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <DialogTitle className="text-center text-[20px] font-bold text-slate-900">
                {subModal === 'none' ? 'Create Post' : 
                 subModal === 'feeling' ? 'How are you feeling?' :
                 subModal === 'location' ? 'Check in' :
                 subModal === 'tag' ? 'Tag people' : 'Choose a GIF'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Create a new post to share thoughts, photos, videos, or feelings with your friends on Synapse.
              </DialogDescription>
            </DialogHeader>
            
            {/* --- Main Create Post View --- */}
            {subModal === 'none' && (
              <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
                <div className="p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
                      <AvatarFallback>{firstName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-[15px] text-slate-900">
                        {userProfile?.displayName}
                        {feeling && <span className="font-normal text-slate-600"> is {feeling.emoji} feeling {feeling.label}</span>}
                        {location && <span className="font-normal text-slate-600"> at 📍 {location}</span>}
                        {taggedUsers.length > 0 && <span className="font-normal text-slate-600"> with {taggedUsers.length} others</span>}
                      </div>
                      
                      {/* Privacy Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center gap-1 bg-slate-200/60 hover:bg-slate-200 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-600 w-fit mt-0.5 cursor-pointer select-none transition-colors">
                            {getPrivacyIcon(privacy)}
                            <span>{getPrivacyLabel(privacy)}</span>
                            <ChevronDown className="w-3 h-3" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[240px] p-2 rounded-xl">
                          <div className="px-2 py-1.5 text-sm font-semibold text-slate-900 mb-1">Who can see your post?</div>
                          <DropdownMenuItem onClick={() => setPrivacy('public')} className="gap-3 p-2 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Globe className="w-5 h-5 text-slate-700" /></div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">Public</span>
                              <span className="text-xs text-slate-500">Anyone on or off Synapse</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPrivacy('friends')} className="gap-3 p-2 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Users className="w-5 h-5 text-slate-700" /></div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">Friends</span>
                              <span className="text-xs text-slate-500">Your friends on Synapse</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPrivacy('only_me')} className="gap-3 p-2 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Lock className="w-5 h-5 text-slate-700" /></div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">Only me</span>
                              <span className="text-xs text-slate-500">Only you can see this post</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                    </div>
                  </div>

                  {/* Input with Background Logic */}
                  <div className={`relative transition-all ${background ? 'aspect-video flex items-center justify-center rounded-xl overflow-hidden mb-4' : ''} ${background}`}>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={`What's on your mind, ${firstName}?`}
                      className={`w-full min-h-[100px] text-[24px] placeholder:text-slate-500 resize-none outline-none border-none focus:ring-0 p-2 bg-transparent ${background ? 'text-center text-white placeholder:text-white/70 h-full flex items-center justify-center align-middle pt-[20%]' : 'text-slate-900'}`}
                      autoFocus
                    />
                  </div>

                  {/* Background Toggle (Only if no images/gifs) */}
                  {previewUrls.length === 0 && !gif && !background && (
                    <div className="flex items-center justify-between mb-2">
                       <button onClick={() => setShowBackgrounds(!showBackgrounds)}>
                         <img src="https://www.facebook.com/images/composer/SATP_Aa_square-2x.png" className="w-9 h-9" alt="Backgrounds" />
                       </button>
                    </div>
                  )}
                  
                  {/* Background Picker */}
                  {showBackgrounds && previewUrls.length === 0 && !gif && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      <button onClick={() => setBackground('')} className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center"><X className="w-4 h-4" /></button>
                      {BACKGROUNDS.slice(1).map((bg, i) => (
                        <button key={i} onClick={() => setBackground(bg)} className={`w-8 h-8 rounded-lg ${bg.split(' ')[0]} ${bg.includes('url') ? 'bg-cover' : ''} border border-slate-100 shadow-sm`} />
                      ))}
                    </div>
                  )}

                  {/* Image/GIF Previews */}
                  {previewUrls.length > 0 && (
                     <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-4">
                        <div className="absolute top-2 right-2 z-10">
                           <button onClick={() => { setSelectedFiles([]); setPreviewUrls([]); }} className="bg-white p-1.5 rounded-full shadow-md"><X className="w-5 h-5" /></button>
                        </div>
                        <div className={`grid gap-1 ${previewUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                           {previewUrls.map((url, i) => (
                              <img key={i} src={url} className="w-full h-auto max-h-[300px] object-cover" />
                           ))}
                        </div>
                     </div>
                  )}
                  {gif && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-4">
                       <button onClick={() => setGif(null)} className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-md z-10"><X className="w-5 h-5" /></button>
                       <img src={gif} className="w-full" />
                    </div>
                  )}

                  {/* Add to Post Actions */}
                  <div className="border border-slate-300 rounded-lg p-3 flex items-center justify-between shadow-sm mt-auto">
                    <span className="font-semibold text-[15px] text-slate-900 pl-1 cursor-default">Add to your post</span>
                    <div className="flex gap-1">
                        <div onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer text-[#45BD62] relative group">
                          <Image className="w-6 h-6" />
                        </div>
                        <div onClick={() => setSubModal('tag')} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer text-[#1877F2]">
                          <UserPlus className="w-6 h-6" />
                        </div>
                        <div onClick={() => setSubModal('feeling')} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer text-[#F7B928]">
                          <Smile className="w-6 h-6" />
                        </div>
                        <div onClick={() => setSubModal('location')} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer text-[#F5533D]">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div onClick={() => { setSubModal('gif'); handleGifSearch(''); }} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer text-[#a33df5]">
                          <Gift className="w-6 h-6" />
                        </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 mt-auto">
                   <Button 
                      onClick={handleSubmit} 
                      disabled={(!content.trim() && selectedFiles.length === 0 && !gif) || isUploading}
                      className="w-full bg-synapse-600 hover:bg-synapse-700 text-white font-semibold h-9 rounded-lg text-[15px] disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {isUploading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> Posting</> : "Post"}
                   </Button>
                </div>
              </div>
            )}

            {/* --- Sub Modals --- */}
            
            {/* Feelings */}
            {subModal === 'feeling' && (
              <div className="flex-1 p-4 grid grid-cols-2 gap-2 overflow-y-auto">
                {FEELINGS.map(f => (
                   <button 
                    key={f.label}
                    onClick={() => { setFeeling(f); setSubModal('none'); }}
                    className="flex items-center gap-3 p-3 hover:bg-slate-100 rounded-lg transition-colors text-left"
                   >
                     <div className="text-2xl bg-slate-100 rounded-full w-10 h-10 flex items-center justify-center">{f.emoji}</div>
                     <span className="font-medium text-slate-700 capitalize">{f.label}</span>
                   </button>
                ))}
              </div>
            )}

            {/* Location (REAL) */}
            {subModal === 'location' && (
              <div className="flex-1 p-4 flex flex-col">
                <div className="relative mb-4">
                   <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                   <input 
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Where are you?" 
                      className="w-full bg-slate-100 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-synapse-500"
                      autoFocus
                    />
                </div>
                
                <div className="space-y-1 overflow-y-auto">
                   {/* Current Location Option */}
                   {!locationSearch && (
                      <button 
                        onClick={getCurrentLocation}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-lg text-left text-synapse-600"
                      >
                         <div className="w-10 h-10 bg-synapse-50 rounded-full flex items-center justify-center">
                            {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5 fill-current" />}
                         </div>
                         <span className="font-medium">Use current location</span>
                      </button>
                   )}

                   {/* API Results */}
                   {locationResults.map((place: any, i) => {
                      // Nominatim 'display_name' is very long. Let's try to extract parts.
                      // Format often: "Name, Suburb, City, State, Postcode, Country"
                      const parts = place.display_name.split(', ');
                      const mainText = parts[0];
                      const subText = parts.slice(1, 3).join(', ');
                      
                      return (
                        <button 
                          key={i}
                          onClick={() => { setLocation(mainText); setSubModal('none'); }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-lg text-left group"
                        >
                          <div className="w-10 h-10 bg-slate-200 group-hover:bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                              <MapPin className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{mainText}</div>
                              <div className="text-xs text-slate-500 truncate">{subText}</div>
                          </div>
                        </button>
                      );
                   })}
                   
                   {locationSearch && locationResults.length === 0 && (
                      <div className="text-center text-slate-500 py-4">No locations found</div>
                   )}
                </div>
              </div>
            )}

            {/* Tag People */}
            {subModal === 'tag' && (
               <div className="flex-1 p-4 flex flex-col">
                  <div className="relative mb-4">
                     <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                     <input 
                        value={userSearch}
                        onChange={(e) => handleUserSearch(e.target.value)}
                        placeholder="Search for friends" 
                        className="w-full bg-slate-100 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-synapse-500"
                      />
                  </div>
                  <div className="space-y-1 overflow-y-auto">
                     {userSearch ? userResults.map(u => (
                        <button 
                          key={u.uid}
                          onClick={() => { 
                             if (!taggedUsers.find(t => t.uid === u.uid)) setTaggedUsers([...taggedUsers, u]);
                             setSubModal('none'); 
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg text-left"
                        >
                           <Avatar><AvatarImage src={u.photoURL || ''} /><AvatarFallback>U</AvatarFallback></Avatar>
                           <span className="font-medium">{u.displayName}</span>
                        </button>
                     )) : (
                        <div className="text-center text-slate-500 py-4">Type to search friends</div>
                     )}
                  </div>
               </div>
            )}

            {/* GIFs */}
            {subModal === 'gif' && (
              <div className="flex-1 p-4 flex flex-col h-full">
                  <div className="relative mb-4">
                     <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                     <input 
                        value={gifSearch}
                        onChange={(e) => handleGifSearch(e.target.value)}
                        placeholder="Search GIFs" 
                        className="w-full bg-slate-100 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-synapse-500"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
                     {gifs.map((g: any) => (
                        <div key={g.id} onClick={() => selectGif(g.images.fixed_height.url)} className="cursor-pointer rounded-lg overflow-hidden bg-slate-100 h-32 relative group">
                           <img src={g.images.fixed_height_small.url} className="w-full h-full object-cover" />
                        </div>
                     ))}
                  </div>
              </div>
            )}

          </DialogContent>
        </Dialog>
      </div>

      <Separator className="bg-slate-200/60" />

      <div className="flex items-center justify-between pt-1">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500 font-semibold text-[15px]">
           <Video className="w-6 h-6 text-[#F02849]" />
           <span className="hidden sm:inline text-slate-600">Live video</span>
        </button>
        <button 
          onClick={() => { setIsOpen(true); setTimeout(() => fileInputRef.current?.click(), 200); }}
          className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500 font-semibold text-[15px]"
        >
           <Image className="w-6 h-6 text-[#45BD62]" />
           <span className="hidden sm:inline text-slate-600">Photo/video</span>
        </button>
        <button 
          onClick={() => { setIsOpen(true); setSubModal('feeling'); }}
          className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500 font-semibold text-[15px]"
        >
           <Smile className="w-6 h-6 text-[#F7B928]" />
           <span className="hidden sm:inline text-slate-600">Feeling/activity</span>
        </button>
      </div>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
    </Card>
  );
};
