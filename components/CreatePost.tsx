import React, { useState, useRef } from 'react';
import { Image, Video, Smile, X, Loader2, Globe, MapPin, UserPlus } from 'lucide-react';
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
  DialogClose
} from './ui/Dialog';
import { uploadToCloudinary } from '../utils/upload';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const CreatePost: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !selectedImage) || isUploading || !user) return;
    
    setIsUploading(true);
    try {
      let imageUrl = undefined;
      if (selectedImage) {
        imageUrl = await uploadToCloudinary(selectedImage);
      }
      
      await addDoc(collection(db, 'posts'), {
        author: {
          name: userProfile?.displayName || user.displayName || 'Anonymous',
          handle: user.email ? `@${user.email.split('@')[0]}` : '@user',
          avatar: userProfile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
          uid: user.uid
        },
        content: content,
        image: imageUrl || null,
        timestamp: serverTimestamp(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedByUsers: []
      });
      
      // Reset
      setContent('');
      removeImage();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    setIsOpen(true);
    // Slight delay to allow dialog to mount before clicking input
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  return (
    <Card className="px-4 pt-3 pb-2 shadow-sm border-slate-200 bg-white">
      <div className="flex gap-3 mb-3">
        <Avatar className="h-10 w-10 cursor-pointer hover:brightness-95 transition-all">
          <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
          <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <div className="flex-1 bg-slate-100 hover:bg-slate-200/80 rounded-full px-4 py-2.5 cursor-pointer transition-colors text-slate-500 hover:text-slate-600 text-[15px]">
              What's on your mind, {userProfile?.displayName?.split(' ')[0]}?
            </div>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-xl">
            <DialogHeader className="p-4 border-b border-slate-100 relative">
              <DialogTitle className="text-center text-xl font-bold">Create Post</DialogTitle>
            </DialogHeader>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
                  <AvatarFallback>{userProfile?.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-[15px]">{userProfile?.displayName}</div>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-0.5 text-xs font-semibold text-slate-600 w-fit mt-0.5">
                     <Globe className="w-3 h-3" />
                     <span>Public</span>
                  </div>
                </div>
              </div>

              {/* Input */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind, ${userProfile?.displayName?.split(' ')[0]}?`}
                className="w-full min-h-[120px] text-lg placeholder:text-slate-500 resize-none outline-none border-none focus:ring-0 p-0"
              />

              {/* Image Preview */}
              {previewUrl && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-slate-200">
                  <img src={previewUrl} alt="Preview" className="w-full max-h-[300px] object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                     <button className="bg-white p-1.5 rounded-full shadow-sm hover:bg-slate-100" onClick={() => {}}>
                        <div className="text-sm font-semibold px-2">Edit</div>
                     </button>
                     <button 
                      onClick={removeImage}
                      className="bg-white p-1.5 rounded-full shadow-sm hover:bg-slate-100"
                    >
                      <X className="w-5 h-5 text-slate-700" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Add to Post Widget */}
              <div className="mt-4 border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                 <span className="font-semibold text-sm text-slate-900 pl-1">Add to your post</span>
                 <div className="flex gap-1">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors text-green-500"
                    >
                       <Image className="w-6 h-6" />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-blue-500">
                       <UserPlus className="w-6 h-6" />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-yellow-500">
                       <Smile className="w-6 h-6" />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-red-500">
                       <MapPin className="w-6 h-6" />
                    </button>
                 </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-slate-100">
              <Button 
                onClick={handleSubmit} 
                disabled={(!content.trim() && !selectedImage) || isUploading}
                className="w-full bg-synapse-600 hover:bg-synapse-700 text-white font-semibold h-9 rounded-lg"
              >
                {isUploading ? (
                  <>Posting <Loader2 className="w-4 h-4 ml-2 animate-spin" /></>
                ) : (
                  "Post"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator className="bg-slate-200/60" />

      <div className="flex items-center justify-between pt-1">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 font-semibold text-[15px]">
           <Video className="w-6 h-6 text-red-500" />
           <span className="hidden sm:inline">Live video</span>
        </button>
        <button 
          onClick={openFileDialog}
          className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 font-semibold text-[15px]"
        >
           <Image className="w-6 h-6 text-green-500" />
           <span className="hidden sm:inline">Photo/video</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 font-semibold text-[15px]">
           <Smile className="w-6 h-6 text-yellow-500" />
           <span className="hidden sm:inline">Feeling/activity</span>
        </button>
      </div>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />
    </Card>
  );
};