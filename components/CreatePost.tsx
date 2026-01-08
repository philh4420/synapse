import React, { useState, useRef, useEffect } from 'react';
import { 
  Image, Video, Smile, X, Loader2, Globe, MapPin, UserPlus, ChevronDown, 
  Search, ArrowLeft, Gift, Navigation, Users, Lock, MoreHorizontal, MousePointerClick
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { Separator } from './ui/Separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from './ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/DropdownMenu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/Popover';
import { uploadToCloudinary } from '../utils/upload';
import { collection, addDoc, serverTimestamp, getDocs, query, limit, where } from 'firebase/firestore';
import { db, GIPHY_API_KEY } from '../firebaseConfig';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

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
  { emoji: '🤒', label: 'sick' },
  { emoji: '🤗', label: 'thankful' },
];

const EMOJIS = ['🙂', '😀', '😂', '😍', '🥰', '😎', '😭', '😡', '👍', '👎', '🎉', '🔥', '❤️', '💔', '✨', '🎁', '👋', '🙏', '🤔', '🙄', '😴', '🤮', '🤯', '🥳'];

export const CreatePost: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  // Content State
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
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
  const [isDragging, setIsDragging] = useState(false);
  
  // Search States
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // --- Real Location Handlers ---
  useEffect(() => {
    const searchLocation = async () => {
      if (locationSearch.trim().length < 2) {
        setLocationResults([]);
        return;
      }
      try {
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
      toast("Geolocation is not supported by your browser", "error");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`);
        if (res.ok) {
          const data = await res.json();
          const addr = data.address;
          const name = addr.city || addr.town || addr.village || addr.suburb || data.name.split(',')[0];
          const region = addr.state || addr.country;
          setLocation(`${name}, ${region}`);
          setSubModal('none');
        }
      } catch (error) {
        toast("Could not retrieve location details.", "error");
      } finally {
        setIsLocating(false);
      }
    }, () => {
      setIsLocating(false);
      toast("Could not retrieve location.", "error");
    });
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    // Determine if video or image
    const video = files.find(f => f.type.startsWith('video/'));
    const images = files.filter(f => f.type.startsWith('image/'));

    if (video) {
      // Prioritize video - clear images
      setVideoFile(video);
      setVideoPreview(URL.createObjectURL(video));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setGif(null);
    } else if (images.length > 0) {
      // Images
      setSelectedFiles(prev => [...prev, ...images]);
      const newUrls = images.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
      setVideoFile(null);
      setVideoPreview(null);
      setGif(null);
    }

    // Auto-open and UI resets
    if (!isOpen) setIsOpen(true);
    setBackground('');
    setShowBackgrounds(false);
  };

  const removeMedia = (index?: number) => {
    if (videoFile) {
      setVideoFile(null);
      setVideoPreview(null);
    } else {
      if (index !== undefined) {
        const newFiles = [...selectedFiles];
        const newUrls = [...previewUrls];
        newFiles.splice(index, 1);
        newUrls.splice(index, 1);
        setSelectedFiles(newFiles);
        setPreviewUrls(newUrls);
      } else {
        setSelectedFiles([]);
        setPreviewUrls([]);
      }
    }
  };

  // --- Other Handlers ---
  const handleGifSearch = async (term: string) => {
    setGifSearch(term);
    if (!term) {
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
    setSelectedFiles([]); 
    setPreviewUrls([]);
    setVideoFile(null);
    setVideoPreview(null);
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
    if ((!content.trim() && selectedFiles.length === 0 && !videoFile && !gif) || isUploading || !user) return;
    
    setIsUploading(true);
    try {
      // Upload Media
      let mediaUrls: string[] = [];
      let videoUrl: string | null = null;

      if (videoFile) {
         videoUrl = await uploadToCloudinary(videoFile);
      } else if (selectedFiles.length > 0) {
         for (const file of selectedFiles) {
            const url = await uploadToCloudinary(file);
            mediaUrls.push(url);
         }
      }
      
      await addDoc(collection(db, 'posts'), {
        author: {
          name: userProfile?.displayName || user.displayName || 'Anonymous',
          handle: user.email ? `@${user.email.split('@')[0]}` : '@user',
          avatar: userProfile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
          uid: user.uid
        },
        content: content,
        images: mediaUrls.length > 0 ? mediaUrls : null,
        video: videoUrl,
        gif: gif,
        background: background || null,
        feeling: feeling ? `${feeling.emoji} feeling ${feeling.label}` : null,
        location: location || null,
        taggedUsers: taggedUsers.map(u => u.displayName),
        privacy: privacy,
        
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
      setVideoFile(null);
      setVideoPreview(null);
      setGif(null);
      setBackground('');
      setFeeling(null);
      setLocation(null);
      setTaggedUsers([]);
      setPrivacy('public');
      setIsOpen(false);
      toast("Post created successfully!", "success");
    } catch (error) {
      console.error("Failed to create post:", error);
      toast("Failed to create post.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    textAreaRef.current?.focus();
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
            <div className="flex-1 bg-[#F0F2F5] hover:bg-[#E4E6E9] rounded-full px-4 py-2.5 cursor-pointer transition-colors text-slate-500 hover:text-slate-600 text-[15px] select-none flex items-center truncate">
              What's on your mind, {firstName}?
            </div>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-xl h-[80vh] sm:h-auto sm:max-h-[85vh] flex flex-col">
            <DialogHeader className="p-4 border-b border-slate-200 relative flex items-center justify-center shrink-0">
              {subModal !== 'none' && (
                <button 
                  onClick={() => setSubModal('none')} 
                  className="absolute left-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <DialogTitle className="text-center text-[20px] font-bold text-slate-900">
                {subModal === 'none' ? 'Create Post' : 
                 subModal === 'feeling' ? 'How are you feeling?' :
                 subModal === 'location' ? 'Search for location' :
                 subModal === 'tag' ? 'Tag friends' : 'Choose a GIF'}
              </DialogTitle>
              <DialogDescription className="sr-only">Create post dialog</DialogDescription>
            </DialogHeader>
            
            {/* --- Main Create Post View --- */}
            {subModal === 'none' && (
              <div 
                className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Drag Overlay */}
                {isDragging && (
                   <div className="absolute inset-0 bg-synapse-50/90 z-50 flex items-center justify-center border-4 border-dashed border-synapse-300 m-2 rounded-xl">
                      <div className="text-synapse-600 font-bold text-xl flex flex-col items-center">
                         <Image className="w-12 h-12 mb-2" />
                         Drop photos or videos here
                      </div>
                   </div>
                )}

                <div className="p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
                      <AvatarFallback>{firstName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-[15px] text-slate-900 leading-tight">
                        {userProfile?.displayName}
                        {feeling && <span className="font-normal text-slate-600"> is {feeling.emoji} feeling {feeling.label}</span>}
                        {location && <span className="font-normal text-slate-600"> at <span className="text-red-500 font-medium">{location}</span></span>}
                        {taggedUsers.length > 0 && <span className="font-normal text-slate-600"> with <span className="text-blue-600 font-medium">{taggedUsers.length} others</span></span>}
                      </div>
                      
                      {/* Privacy Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center gap-1 bg-slate-200/60 hover:bg-slate-200 rounded-md px-2 py-0.5 text-xs font-bold text-slate-600 w-fit mt-1 cursor-pointer select-none transition-colors">
                            {getPrivacyIcon(privacy)}
                            <span>{getPrivacyLabel(privacy)}</span>
                            <ChevronDown className="w-3 h-3" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[280px] p-2 rounded-xl">
                          <div className="px-2 py-2 text-[17px] font-bold text-slate-900">Post Audience</div>
                          <Separator className="mb-2" />
                          <DropdownMenuItem onClick={() => setPrivacy('public')} className="gap-3 p-2.5 rounded-lg cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Globe className="w-6 h-6 text-slate-700" /></div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-base">Public</span>
                              <span className="text-xs text-slate-500">Anyone on or off Synapse</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPrivacy('friends')} className="gap-3 p-2.5 rounded-lg cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Users className="w-6 h-6 text-slate-700" /></div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-base">Friends</span>
                              <span className="text-xs text-slate-500">Your friends on Synapse</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPrivacy('only_me')} className="gap-3 p-2.5 rounded-lg cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Lock className="w-6 h-6 text-slate-700" /></div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 text-base">Only me</span>
                              <span className="text-xs text-slate-500">Only you can see this post</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                    </div>
                  </div>

                  {/* Input with Background Logic */}
                  <div className={`relative transition-all ${background ? 'aspect-video flex items-center justify-center rounded-xl overflow-hidden mb-4' : 'min-h-[150px]'}`}>
                    {background && <div className={`absolute inset-0 ${background} -z-10`} />}
                    
                    <textarea
                      ref={textAreaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={`What's on your mind, ${firstName}?`}
                      className={cn(
                        "w-full resize-none outline-none border-none focus:ring-0 p-1 bg-transparent placeholder:text-slate-500",
                        background 
                           ? "text-center text-white placeholder:text-white/70 h-full flex items-center justify-center align-middle pt-[15%] text-[24px] font-bold px-8 leading-tight" 
                           : "text-[20px] text-slate-900 min-h-[140px]"
                      )}
                      autoFocus
                    />
                    
                    {/* Emoji Picker Button (Only if no background for simplicity in layout) */}
                    {!background && (
                      <div className="absolute bottom-2 right-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                               <Smile className="w-6 h-6" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-64 p-2">
                             <div className="grid grid-cols-6 gap-1 max-h-[200px] overflow-y-auto">
                               {EMOJIS.map(e => (
                                 <button key={e} onClick={() => insertEmoji(e)} className="text-xl p-1 hover:bg-slate-100 rounded">{e}</button>
                               ))}
                             </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>

                  {/* Background Toggle (Only if no media) */}
                  {previewUrls.length === 0 && !videoFile && !gif && !background && (
                    <div className="flex items-center justify-between mb-4 animate-in fade-in slide-in-from-left-2">
                       <button onClick={() => setShowBackgrounds(!showBackgrounds)} className="h-9 w-9 rounded-lg overflow-hidden">
                         <img src="https://www.facebook.com/images/composer/SATP_Aa_square-2x.png" className="w-full h-full" alt="Backgrounds" />
                       </button>
                    </div>
                  )}
                  
                  {/* Background Picker */}
                  {showBackgrounds && previewUrls.length === 0 && !videoFile && !gif && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
                      <button onClick={() => setBackground('')} className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center transition-transform hover:scale-110"><div className="w-2 h-2 bg-slate-400 rounded-full" /></button>
                      {BACKGROUNDS.slice(1).map((bg, i) => (
                        <button key={i} onClick={() => setBackground(bg)} className={`w-8 h-8 flex-shrink-0 rounded-lg ${bg.split(' ')[0]} ${bg.includes('url') ? 'bg-cover' : ''} border border-slate-100 shadow-sm transition-transform hover:scale-110`} />
                      ))}
                    </div>
                  )}

                  {/* Media Previews */}
                  {(previewUrls.length > 0 || videoPreview || gif) && (
                     <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-4 group">
                        <div className="absolute top-2 right-2 z-10">
                           <button onClick={() => removeMedia()} className="bg-white p-1.5 rounded-full shadow-md hover:bg-slate-100 text-slate-600 transition-colors">
                             <X className="w-5 h-5" />
                           </button>
                        </div>
                        
                        {/* Images Grid */}
                        {previewUrls.length > 0 && (
                           <div className={`grid gap-0.5 ${previewUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {previewUrls.map((url, i) => (
                                 <div key={i} className="relative group/img">
                                    <img src={url} className="w-full h-auto max-h-[300px] object-cover" />
                                    {previewUrls.length > 1 && (
                                       <button onClick={() => removeMedia(i)} className="absolute top-1 left-1 bg-white/80 p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity">
                                          <X className="w-3 h-3" />
                                       </button>
                                    )}
                                 </div>
                              ))}
                           </div>
                        )}
                        
                        {/* Video Preview */}
                        {videoPreview && (
                           <div className="relative bg-black flex justify-center items-center">
                              <video src={videoPreview} controls className="max-h-[300px] w-full" />
                           </div>
                        )}
                        
                        {/* GIF Preview */}
                        {gif && (
                           <div className="relative">
                              <img src={gif} className="w-full" />
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded font-bold">GIF</div>
                           </div>
                        )}
                        
                        {/* Add More Button (Images Only) */}
                        {previewUrls.length > 0 && !videoFile && (
                           <div className="absolute top-2 left-2">
                             <Button size="sm" variant="secondary" className="h-8 bg-white/90 hover:bg-white text-slate-700 shadow-sm" onClick={() => fileInputRef.current?.click()}>
                                <Image className="w-4 h-4 mr-1.5" /> Add Photos
                             </Button>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Add to Post Actions Box */}
                  <div className="border border-slate-300 rounded-lg p-3 flex items-center justify-between shadow-sm mt-4">
                    <span className="font-semibold text-[15px] text-slate-900 pl-1 cursor-default select-none">Add to your post</span>
                    <div className="flex gap-1">
                        <TooltipBtn 
                           onClick={() => fileInputRef.current?.click()} 
                           icon={Image} color="text-[#45BD62]" 
                           tooltip="Photo/Video"
                        />
                        <TooltipBtn 
                           onClick={() => setSubModal('tag')} 
                           icon={UserPlus} color="text-[#1877F2]" 
                           tooltip="Tag People"
                        />
                        <TooltipBtn 
                           onClick={() => setSubModal('feeling')} 
                           icon={Smile} color="text-[#F7B928]" 
                           tooltip="Feeling/Activity"
                        />
                        <TooltipBtn 
                           onClick={() => setSubModal('location')} 
                           icon={MapPin} color="text-[#F5533D]" 
                           tooltip="Check in"
                        />
                        <TooltipBtn 
                           onClick={() => { setSubModal('gif'); handleGifSearch(''); }} 
                           icon={Gift} color="text-[#2ABBA7]" 
                           tooltip="GIF"
                        />
                        <TooltipBtn 
                           onClick={() => {}} 
                           icon={MoreHorizontal} color="text-slate-500" 
                           tooltip="More"
                        />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 mt-auto bg-white sticky bottom-0 z-20">
                   <Button 
                      onClick={handleSubmit} 
                      disabled={(!content.trim() && selectedFiles.length === 0 && !videoFile && !gif) || isUploading}
                      className="w-full bg-synapse-600 hover:bg-synapse-700 text-white font-semibold h-10 rounded-lg text-[15px] disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                    >
                      {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</> : "Post"}
                   </Button>
                </div>
              </div>
            )}

            {/* --- Sub Modals --- */}
            
            {/* Feelings */}
            {subModal === 'feeling' && (
              <div className="flex-1 p-2 grid grid-cols-2 gap-1 overflow-y-auto content-start">
                {FEELINGS.map(f => (
                   <button 
                    key={f.label}
                    onClick={() => { setFeeling(f); setSubModal('none'); }}
                    className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg transition-colors text-left"
                   >
                     <div className="text-2xl bg-slate-100 rounded-full w-9 h-9 flex items-center justify-center border border-slate-200">{f.emoji}</div>
                     <span className="font-medium text-slate-700 capitalize text-[15px]">{f.label}</span>
                   </button>
                ))}
              </div>
            )}

            {/* Location */}
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
                   {!locationSearch && (
                      <button 
                        onClick={getCurrentLocation}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-lg text-left text-synapse-600"
                      >
                         <div className="w-9 h-9 bg-synapse-50 rounded-full flex items-center justify-center">
                            {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5 fill-current" />}
                         </div>
                         <span className="font-medium">Use current location</span>
                      </button>
                   )}

                   {locationResults.map((place: any, i) => {
                      const parts = place.display_name.split(', ');
                      return (
                        <button 
                          key={i}
                          onClick={() => { setLocation(parts[0]); setSubModal('none'); }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-lg text-left group transition-colors"
                        >
                          <div className="w-9 h-9 bg-slate-200 group-hover:bg-slate-300 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                              <MapPin className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{parts[0]}</div>
                              <div className="text-xs text-slate-500 truncate">{parts.slice(1, 3).join(', ')}</div>
                          </div>
                        </button>
                      );
                   })}
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
                        autoFocus
                      />
                  </div>
                  <div className="space-y-1 overflow-y-auto">
                     <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Suggestions</div>
                     {userResults.map(u => (
                        <button 
                          key={u.uid}
                          onClick={() => { 
                             if (!taggedUsers.find(t => t.uid === u.uid)) setTaggedUsers([...taggedUsers, u]);
                             setSubModal('none'); 
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg text-left transition-colors"
                        >
                           <Avatar><AvatarImage src={u.photoURL || ''} /><AvatarFallback>{u.displayName?.[0]}</AvatarFallback></Avatar>
                           <span className="font-medium text-slate-900">{u.displayName}</span>
                        </button>
                     ))}
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
                        autoFocus
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 content-start">
                     {gifs.map((g: any) => (
                        <div key={g.id} onClick={() => selectGif(g.images.fixed_height.url)} className="cursor-pointer rounded-lg overflow-hidden bg-slate-100 h-32 relative group hover:opacity-90 transition-opacity">
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
        <ActionButton 
          icon={Video} color="text-[#F02849]" label="Live video" 
          onClick={() => {}} 
        />
        <ActionButton 
          icon={Image} color="text-[#45BD62]" label="Photo/video" 
          onClick={() => { setIsOpen(true); setTimeout(() => fileInputRef.current?.click(), 200); }} 
        />
        <ActionButton 
          icon={Smile} color="text-[#F7B928]" label="Feeling/activity" 
          onClick={() => { setIsOpen(true); setSubModal('feeling'); }} 
        />
      </div>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*"
        className="hidden"
      />
    </Card>
  );
};

// Helper Components
const ActionButton: React.FC<{ icon: any, color: string, label: string, onClick: () => void }> = ({ icon: Icon, color, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500 font-semibold text-[15px]"
  >
     <Icon className={`w-6 h-6 ${color}`} />
     <span className="hidden sm:inline text-slate-600">{label}</span>
  </button>
);

const TooltipBtn: React.FC<{ onClick: () => void, icon: any, color: string, tooltip: string }> = ({ onClick, icon: Icon, color, tooltip }) => (
  <div onClick={onClick} className={`p-2 hover:bg-slate-100 rounded-full cursor-pointer ${color} relative group transition-colors`} title={tooltip}>
    <Icon className="w-6 h-6" />
  </div>
);