
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Story } from '../types';
import { uploadToCloudinary } from '../utils/upload';
import { cn } from '../lib/utils';

export const Stories: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch stories from Firestore, ordered by newest first
    const q = query(
      collection(db, 'stories'), 
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        };
      }) as Story[];
      
      setStories(fetchedStories);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      
      await addDoc(collection(db, 'stories'), {
        uid: user.uid,
        displayName: userProfile?.displayName || user.displayName || 'User',
        avatar: userProfile?.photoURL || user.photoURL || '',
        image: imageUrl,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error("Error creating story:", error);
      alert("Failed to upload story.");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar h-[250px] items-center px-4">
        {[1, 2, 3, 4].map(i => (
           <div key={i} className="min-w-[140px] w-[140px] h-[250px] rounded-2xl bg-slate-200 animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-8 overflow-x-auto pb-4 pt-1 hide-scrollbar px-1">
      {/* Create Story Card */}
      <Card 
        onClick={triggerFileInput}
        className="min-w-[140px] w-[140px] h-[250px] flex-shrink-0 relative overflow-hidden group cursor-pointer border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl bg-white ring-1 ring-slate-100"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleCreateStory} 
          accept="image/*" 
          className="hidden" 
        />
        
        <div className="h-[75%] w-full relative overflow-hidden">
            <img 
                src={userProfile?.photoURL || user?.photoURL || ''} 
                alt="Me" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 bg-slate-100"
            />
            {uploading ? (
               <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
               </div>
            ) : (
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            )}
        </div>
        <div className="h-[25%] bg-white relative pt-7 text-center z-10">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-synapse-600 p-1.5 rounded-full border-4 border-white shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-white stroke-[3]" />
            </div>
            <p className="text-sm font-bold text-slate-800">Create story</p>
        </div>
      </Card>

      {/* Real Stories from DB */}
      {stories.map(story => (
        <Card key={story.id} className="min-w-[140px] w-[140px] h-[250px] flex-shrink-0 relative overflow-hidden group cursor-pointer border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl bg-slate-900">
            <img 
                src={story.image} 
                alt={story.displayName} 
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
            
            <div className="absolute top-3 left-3 z-10">
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-synapse-500 to-fuchsia-500 group-hover:animate-spin-slow">
                    <Avatar className="w-9 h-9 border-2 border-white/20">
                        <AvatarImage src={story.avatar} />
                        <AvatarFallback>{story.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                </div>
            </div>
            
            <div className="absolute bottom-3 left-3 right-3 z-10">
                <p className="text-white font-bold text-sm drop-shadow-md truncate">{story.displayName}</p>
            </div>
        </Card>
      ))}
    </div>
  );
};
