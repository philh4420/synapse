
import React, { useState, useEffect, useRef } from 'react';
import { 
  ThumbsUp, MessageCircle, Share2, MoreHorizontal, Globe, 
  Trash2, Send, X, MessageSquare, Users, Lock, Edit3, Camera, Loader2, Smile, Gift, Search, AlertTriangle, Play, Bookmark, Copy, Repeat
} from 'lucide-react';
import { Post as PostType, ReactionType, Comment } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  doc, updateDoc, increment, arrayUnion, arrayRemove, 
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, deleteDoc, deleteField,
  writeBatch, getDocs 
} from 'firebase/firestore';
import { db, GIPHY_API_KEY } from '../firebaseConfig';
import { uploadToCloudinary } from '../utils/upload';
import { Card } from './ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { Button } from './ui/Button';
import { Separator } from './ui/Separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/DropdownMenu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/Popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';
import { cn } from '../lib/utils';

// --- Assets ---
const REACTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-600' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'care', emoji: '🥰', label: 'Care', color: 'text-amber-500' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: 'text-yellow-500' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-500' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-600' },
];

const EMOJIS = ['🙂', '😀', '😂', '😍', '🥰', '😎', '😭', '😡', '👍', '👎', '🎉', '🔥', '❤️', '💔', '✨', '🎁', '👋', '🙏', '🤔', '🙄', '😴', '🤮', '🤯', '🥳'];

export const Post: React.FC<{ post: PostType }> = ({ post: initialPost }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  // -- State --
  const [currentPost, setCurrentPost] = useState<PostType>(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Comment Input
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  // Comment Features (Gif/Emoji)
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Comment Editing
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Post Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialPost.content);
  const [editImages, setEditImages] = useState<string[]>(initialPost.images || (initialPost.image ? [initialPost.image] : []));
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    type: 'post' | 'comment';
    targetId?: string;
  }>({ isOpen: false, type: 'post' });
  
  // Sharing & Lightbox
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Optimistic Reactions
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);

  // -- Derived --
  const displayImages = isEditing ? editImages : (currentPost.images || (currentPost.image ? [currentPost.image] : []));
  const isAuthor = user?.uid === currentPost.author.uid;
  const isSaved = userProfile?.savedPosts?.includes(currentPost.id) || false;

  // -- Effects --
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'posts', initialPost.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentPost({
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as PostType);
      } else {
        setIsDeleting(true);
      }
    });
    return () => unsub();
  }, [initialPost.id]);

  useEffect(() => {
    if (user) {
      if (currentPost.reactions && currentPost.reactions[user.uid]) {
        setCurrentReaction(currentPost.reactions[user.uid]);
      } else if (currentPost.likedByUsers?.includes(user.uid)) {
        setCurrentReaction('like');
      } else {
        setCurrentReaction(null);
      }
    }
  }, [currentPost.reactions, currentPost.likedByUsers, user]);

  useEffect(() => {
    if (showComments) {
      const q = query(collection(db, 'posts', currentPost.id, 'comments'), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[]);
      });
      return () => unsubscribe();
    }
  }, [showComments, currentPost.id]);

  // -- Handlers --
  const createNotification = async (type: 'like' | 'comment', previewText?: string) => {
    if (!user || user.uid === currentPost.author.uid) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: currentPost.author.uid,
        sender: {
          uid: user.uid,
          displayName: userProfile?.displayName || user.displayName || 'Someone',
          photoURL: userProfile?.photoURL || user.photoURL || ''
        },
        type,
        postId: currentPost.id,
        previewText: previewText || '',
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to create notification", e);
    }
  };

  const handleReaction = async (type: ReactionType) => {
    if (!user) return;
    const oldReaction = currentReaction;
    const newReaction = oldReaction === type ? null : type; 
    setCurrentReaction(newReaction);
    const postRef = doc(db, 'posts', currentPost.id);
    try {
      if (oldReaction && !newReaction) {
        await updateDoc(postRef, { 
          likes: increment(-1), 
          likedByUsers: arrayRemove(user.uid),
          [`reactions.${user.uid}`]: deleteField() 
        } as any);
      } else if (!oldReaction && newReaction) {
        await updateDoc(postRef, { 
          likes: increment(1), 
          likedByUsers: arrayUnion(user.uid),
          [`reactions.${user.uid}`]: newReaction 
        });
        await createNotification('like', currentPost.content.substring(0, 30));
      } else if (oldReaction && newReaction && oldReaction !== newReaction) {
        await updateDoc(postRef, { [`reactions.${user.uid}`]: newReaction });
      }
    } catch (error) {
      setCurrentReaction(oldReaction);
      toast("Failed to react", "error");
    }
  };

  const handleSavePost = async () => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      if (isSaved) {
        await updateDoc(userRef, { savedPosts: arrayRemove(currentPost.id) });
        toast("Post unsaved", "info");
      } else {
        await updateDoc(userRef, { savedPosts: arrayUnion(currentPost.id) });
        toast("Post saved to your collection", "success");
      }
      await refreshProfile();
    } catch (e) {
      toast("Failed to update save state", "error");
    }
  };

  const handleSharePost = async () => {
    if (!user) return;
    setIsSharing(true);
    try {
      await addDoc(collection(db, 'posts'), {
        author: {
          name: userProfile?.displayName || user.displayName || 'User',
          handle: user.email || '@user',
          avatar: userProfile?.photoURL || user.photoURL || '',
          uid: user.uid
        },
        content: `Shared ${currentPost.author.name}'s post`,
        timestamp: serverTimestamp(),
        likes: 0,
        comments: 0,
        shares: 0,
        likedByUsers: [],
        privacy: 'public',
        sharedPost: {
          id: currentPost.id,
          author: currentPost.author,
          content: currentPost.content,
          image: currentPost.images?.[0] || currentPost.image || null,
          video: currentPost.video || null,
          timestamp: currentPost.timestamp
        }
      });
      
      await updateDoc(doc(db, 'posts', currentPost.id), { shares: increment(1) });
      setShareDialogOpen(false);
      toast("Shared to your feed", "success");
    } catch (e) {
      toast("Failed to share post", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${currentPost.id}`);
    toast("Link copied to clipboard", "success");
    setShareDialogOpen(false);
  };

  const handleCommentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setCommentImage(file);
      setCommentImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGifSearch = async (term: string) => {
    setGifSearch(term);
    if (!GIPHY_API_KEY) return;
    const endpoint = term 
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${term}&limit=12`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=12`;
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data);
    } catch (e) { console.error("Giphy error", e); }
  };

  const sendGifComment = async (gifUrl: string) => {
    if (!user) return;
    setShowGifPicker(false);
    try {
       await addDoc(collection(db, 'posts', currentPost.id, 'comments'), {
        text: '',
        gif: gifUrl,
        author: {
          uid: user.uid,
          name: userProfile?.displayName || user.displayName || 'User',
          avatar: userProfile?.photoURL || user.photoURL || ''
        },
        likes: 0,
        likedByUsers: [],
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', currentPost.id), { comments: increment(1) });
      await createNotification('comment', 'posted a GIF');
      toast("GIF posted", "success");
    } catch (error) { toast("Failed to post GIF", "error"); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!commentText.trim() && !commentImage)) return;
    setIsPostingComment(true);
    try {
      let imageUrl = null;
      if (commentImage) {
        imageUrl = await uploadToCloudinary(commentImage);
      }
      await addDoc(collection(db, 'posts', currentPost.id, 'comments'), {
        text: commentText,
        image: imageUrl,
        author: {
          uid: user.uid,
          name: userProfile?.displayName || user.displayName || 'User',
          avatar: userProfile?.photoURL || user.photoURL || ''
        },
        likes: 0,
        likedByUsers: [],
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', currentPost.id), { comments: increment(1) });
      await createNotification('comment', commentText.substring(0, 30));
      setCommentText('');
      setCommentImage(null);
      setCommentImagePreview(null);
      toast("Comment posted", "success");
    } catch (error) { toast("Failed to post comment", "error"); } 
    finally { setIsPostingComment(false); }
  };

  const handleEditComment = async (commentId: string) => {
      if (!editCommentText.trim()) return;
      try {
        await updateDoc(doc(db, 'posts', currentPost.id, 'comments', commentId), { text: editCommentText });
        setEditingCommentId(null);
        setEditCommentText('');
        toast("Comment updated", "success");
      } catch (error) { toast("Failed to edit comment", "error"); }
  };

  const handleDeleteComment = (commentId: string) => {
    setDeleteState({ isOpen: true, type: 'comment', targetId: commentId });
  };

  const toggleCommentLike = async (comment: Comment) => {
    if (!user) return;
    const commentRef = doc(db, 'posts', currentPost.id, 'comments', comment.id);
    const isLiked = comment.likedByUsers?.includes(user.uid);
    try {
      if (isLiked) {
         await updateDoc(commentRef, { likes: increment(-1), likedByUsers: arrayRemove(user.uid) });
      } else {
         await updateDoc(commentRef, { likes: increment(1), likedByUsers: arrayUnion(user.uid) });
      }
    } catch (e) { toast("Failed to like comment", "error"); }
  };

  const handleReply = (authorName: string) => {
     setCommentText(`@${authorName} `);
     textInputRef.current?.focus();
  };

  const handleUpdatePost = async () => {
    if (!editContent.trim() && editImages.length === 0 && !currentPost.gif && !currentPost.video) {
       toast("Post cannot be empty", "error");
       return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'posts', currentPost.id), {
        content: editContent,
        images: editImages,
        image: editImages.length > 0 ? editImages[0] : null 
      });
      setIsEditing(false);
      toast("Post updated", "success");
    } catch (error) { toast("Failed to update post", "error"); } 
    finally { setIsSaving(false); }
  };

  const handleDeletePost = () => setDeleteState({ isOpen: true, type: 'post' });

  const confirmDelete = async () => {
    setDeleteState(prev => ({ ...prev, isOpen: false }));
    const type = deleteState.type;
    const targetId = deleteState.targetId;
    if (type === 'post') {
      setIsDeleting(true);
      try {
        const batch = writeBatch(db);
        const commentsRef = collection(db, 'posts', currentPost.id, 'comments');
        const commentsSnapshot = await getDocs(commentsRef);
        commentsSnapshot.forEach((doc) => batch.delete(doc.ref));
        const postRef = doc(db, 'posts', currentPost.id);
        batch.delete(postRef);
        await batch.commit();
        toast("Post deleted", "success");
      } catch (error) { toast("Failed to delete post", "error"); setIsDeleting(false); }
    } else if (type === 'comment' && targetId) {
      try {
        await deleteDoc(doc(db, 'posts', currentPost.id, 'comments', targetId));
        await updateDoc(doc(db, 'posts', currentPost.id), { comments: increment(-1) });
        toast("Comment deleted", "success");
      } catch (error) { toast("Failed to delete comment", "error"); }
    }
  };

  const formatTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-synapse-600 hover:underline break-all">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const getPrivacyIcon = (p?: string) => {
    switch(p) {
      case 'friends': return <Users className="w-3 h-3" />;
      case 'only_me': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const renderPhotoGrid = () => {
    if (displayImages.length === 0) return null;
    
    // Edit mode grid
    if (isEditing) {
       return (
          <div className="p-3 grid grid-cols-2 gap-2">
             {displayImages.map((img, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                   <img src={img} className="w-full h-full object-cover" />
                   <button 
                      onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                   >
                      <X className="w-4 h-4" />
                   </button>
                </div>
             ))}
          </div>
       );
    }

    // Display mode grid
    const count = displayImages.length;
    const clickHandler = (idx: number) => setLightboxIndex(idx);

    if (count === 1) return <div className="w-full bg-slate-50 border-t border-b border-slate-100 flex items-center justify-center max-h-[600px] overflow-hidden cursor-pointer" onClick={() => clickHandler(0)}><img src={displayImages[0]} alt="" className="w-full h-auto object-cover" /></div>;
    if (count === 2) return <div className="w-full h-[350px] flex gap-0.5 border-t border-b border-slate-100 cursor-pointer overflow-hidden"><img src={displayImages[0]} className="w-1/2 h-full object-cover hover:opacity-90" onClick={() => clickHandler(0)} /><img src={displayImages[1]} className="w-1/2 h-full object-cover hover:opacity-90" onClick={() => clickHandler(1)} /></div>;
    if (count === 3) return <div className="w-full h-[400px] flex gap-0.5 border-t border-b border-slate-100 cursor-pointer overflow-hidden"><div className="w-2/3 h-full"><img src={displayImages[0]} className="w-full h-full object-cover hover:opacity-90" onClick={() => clickHandler(0)} /></div><div className="w-1/3 h-full flex flex-col gap-0.5"><img src={displayImages[1]} className="w-full h-1/2 object-cover hover:opacity-90" onClick={() => clickHandler(1)} /><img src={displayImages[2]} className="w-full h-1/2 object-cover hover:opacity-90" onClick={() => clickHandler(2)} /></div></div>;
    return <div className="w-full h-[400px] flex flex-col gap-0.5 border-t border-b border-slate-100 cursor-pointer overflow-hidden"><div className="w-full h-3/5"><img src={displayImages[0]} className="w-full h-full object-cover hover:opacity-90" onClick={() => clickHandler(0)} /></div><div className="w-full h-2/5 flex gap-0.5"><img src={displayImages[1]} className="w-1/3 h-full object-cover hover:opacity-90" onClick={() => clickHandler(1)} /><img src={displayImages[2]} className="w-1/3 h-full object-cover hover:opacity-90" onClick={() => clickHandler(2)} /><div className="w-1/3 h-full relative" onClick={() => clickHandler(3)}><img src={displayImages[3]} className="w-full h-full object-cover hover:opacity-90" />{count > 4 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-2xl">+{count - 4}</div>}</div></div></div>;
  };

  if (isDeleting) return null;

  return (
    <>
    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-visible animate-in fade-in duration-300">
      <div className="p-3 pb-2 flex justify-between items-start">
        <div className="flex gap-2.5">
           <Avatar className="h-10 w-10 cursor-pointer hover:brightness-95">
              <AvatarImage src={currentPost.author.avatar} />
              <AvatarFallback>{currentPost.author.name[0]}</AvatarFallback>
           </Avatar>
           <div className="flex flex-col pt-0.5">
              <div className="font-semibold text-slate-900 text-[15px] leading-tight">
                 <span className="hover:underline cursor-pointer">{currentPost.author.name}</span>
                 {(currentPost.feeling || currentPost.location || (currentPost.taggedUsers && currentPost.taggedUsers.length > 0)) && (
                    <span className="font-normal text-slate-600">
                       {currentPost.feeling && ` is ${currentPost.feeling}`}
                       {currentPost.taggedUsers?.length ? ` with ${currentPost.taggedUsers[0]}` : ''}
                       {currentPost.location && ` at ${currentPost.location}`}
                    </span>
                 )}
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-[13px]">
                 <span className="hover:underline cursor-pointer">
                    {formatDistanceToNow(currentPost.timestamp, { addSuffix: true }).replace('about ', '').replace('less than a minute ago', 'Just now')}
                 </span>
                 <span className="text-[10px] font-bold">·</span>
                 {getPrivacyIcon(currentPost.privacy)}
              </div>
           </div>
        </div>
        
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 -mr-2">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-slate-100">
              <DropdownMenuItem onClick={handleSavePost} className="gap-3 cursor-pointer font-medium py-2 rounded-lg">
                <Bookmark className={cn("w-5 h-5", isSaved ? "fill-current text-synapse-600" : "")} /> 
                {isSaved ? "Unsave post" : "Save post"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              {isAuthor && (
                <>
                  <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(currentPost.content); setEditImages(currentPost.images || (currentPost.image ? [currentPost.image] : [])); }} className="gap-3 cursor-pointer font-medium py-2 rounded-lg">
                    <Edit3 className="w-5 h-5" /> Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeletePost} className="gap-3 cursor-pointer font-medium py-2 text-red-600 rounded-lg">
                    <Trash2 className="w-5 h-5" /> Move to trash
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isEditing ? (
         <div className="px-3 pb-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[100px] text-[15px] resize-none outline-none border border-slate-200 focus:ring-1 focus:ring-synapse-500 p-3 bg-slate-50 rounded-lg text-slate-900"
              placeholder="What's on your mind?"
            />
         </div>
      ) : (
         currentPost.background && !displayImages.length && !currentPost.gif && !currentPost.video && !currentPost.sharedPost ? (
           <div className={`w-full min-h-[350px] flex items-center justify-center p-8 text-center ${currentPost.background}`}>
              <p className="whitespace-pre-wrap font-bold text-2xl">{currentPost.content}</p>
           </div>
         ) : (
           <div className="px-3 pb-3">
              <p className="text-[15px] text-slate-900 leading-normal whitespace-pre-wrap">
                 {formatTextWithLinks(currentPost.content)}
              </p>
           </div>
         )
      )}

      {renderPhotoGrid()}
      
      {currentPost.video && !isEditing && (
         <div className="w-full bg-black border-t border-b border-slate-100 flex justify-center">
             <video src={currentPost.video} controls className="max-h-[600px] w-full" />
         </div>
      )}

      {currentPost.gif && !isEditing && (
        <div className="w-full bg-slate-50 border-t border-b border-slate-100">
           <img src={currentPost.gif} className="w-full h-auto object-cover" />
        </div>
      )}

      {/* Shared Post Content */}
      {currentPost.sharedPost && (
        <div className="px-3 pb-3">
          <div className="border border-slate-200 rounded-xl overflow-hidden hover:bg-slate-50 transition-colors cursor-pointer">
             <div className="p-3 bg-white border-b border-slate-100 flex gap-2 items-center">
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={currentPost.sharedPost.author.avatar} />
                    <AvatarFallback>{currentPost.sharedPost.author.name[0]}</AvatarFallback>
                 </Avatar>
                 <div className="flex flex-col">
                    <span className="font-semibold text-sm">{currentPost.sharedPost.author.name}</span>
                    <span className="text-xs text-slate-500">{formatDistanceToNow(currentPost.sharedPost.timestamp.toDate ? currentPost.sharedPost.timestamp.toDate() : currentPost.sharedPost.timestamp)} ago</span>
                 </div>
             </div>
             <div className="p-3 bg-white">
                <p className="text-sm">{currentPost.sharedPost.content}</p>
             </div>
             {currentPost.sharedPost.image && (
                <div className="w-full max-h-[300px] overflow-hidden">
                   <img src={currentPost.sharedPost.image} className="w-full h-full object-cover" />
                </div>
             )}
          </div>
        </div>
      )}

      {isEditing && (
         <div className="px-3 pb-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleUpdatePost} disabled={isSaving} className="bg-synapse-600 hover:bg-synapse-700 text-white">
               {isSaving ? "Saving..." : "Save"}
            </Button>
         </div>
      )}

      {!isEditing && (
        <>
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 cursor-pointer hover:underline decoration-slate-500">
                {(currentPost.likes > 0 || Object.keys(currentPost.reactions || {}).length > 0) && (
                   <div className="flex -space-x-1">
                      <div className="bg-synapse-600 rounded-full p-1 z-20 border border-white">
                         <ThumbsUp className="w-2 h-2 text-white fill-current" />
                      </div>
                   </div>
                )}
                <span className="text-slate-500 text-[15px]">{currentPost.likes > 0 ? currentPost.likes : 'Be the first to like this'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-[15px]">
                {currentPost.comments > 0 && <span onClick={() => setShowComments(true)} className="hover:underline cursor-pointer">{currentPost.comments} comments</span>}
                {currentPost.shares > 0 && <span className="hover:underline cursor-pointer">{currentPost.shares} shares</span>}
            </div>
          </div>

          <div className="px-3"><Separator className="bg-slate-200" /></div>

          <div className="px-2 py-1 flex items-center justify-between relative">
            <div className="group relative flex-1">
              <div className="absolute -top-12 left-0 hidden group-hover:flex animate-in fade-in slide-in-from-bottom-2 duration-200 bg-white border border-slate-200 shadow-xl rounded-full p-1 gap-1 z-50">
                {REACTIONS.map((r) => (
                   <button key={r.type} onClick={() => handleReaction(r.type)} className="p-1 hover:scale-125 transition-transform duration-200 text-2xl relative" title={r.label}>{r.emoji}</button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => handleReaction(currentReaction === 'like' ? 'like' : 'like')} className={cn("w-full gap-2 font-semibold text-[15px] hover:bg-slate-100 rounded-lg h-9 transition-colors select-none", currentReaction ? REACTIONS.find(r => r.type === currentReaction)?.color || "text-synapse-600" : "text-slate-600")}>
                 {currentReaction ? <><span className="text-lg leading-none">{REACTIONS.find(r => r.type === currentReaction)?.emoji}</span><span>{REACTIONS.find(r => r.type === currentReaction)?.label}</span></> : <><ThumbsUp className="w-5 h-5 mb-0.5" /> <span>Like</span></>}
              </Button>
            </div>
            
            <Button variant="ghost" onClick={() => setShowComments(!showComments)} className="flex-1 gap-2 font-semibold text-[15px] text-slate-600 hover:bg-slate-100 rounded-lg h-9 transition-colors select-none">
              <MessageSquare className="w-5 h-5 mb-0.5 scale-x-[-1]" /> Comment
            </Button>
            
            <Button variant="ghost" onClick={() => setShareDialogOpen(true)} className="flex-1 gap-2 font-semibold text-[15px] text-slate-600 hover:bg-slate-100 rounded-lg h-9 transition-colors select-none">
              <Share2 className="w-5 h-5 mb-0.5" /> Share
            </Button>
          </div>

          <div className="px-3"><Separator className="bg-slate-200" /></div>

          {(showComments || comments.length > 0) && (
            <div className="px-4 pb-4 pt-3">
                <div className="space-y-4 mb-4">
                  {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2 group items-start relative">
                        <Avatar className="w-8 h-8 mt-0.5 cursor-pointer hover:brightness-95">
                           <AvatarImage src={comment.author.avatar} />
                           <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 max-w-[90%] group/comment">
                            {editingCommentId === comment.id ? (
                              <div className="w-full">
                                 <input className="w-full bg-[#F0F2F5] rounded-xl px-3 py-2 text-[15px] focus:outline-none focus:ring-1 focus:ring-synapse-500 mb-1" value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(comment.id); if (e.key === 'Escape') setEditingCommentId(null); }} />
                                 <div className="text-xs text-slate-500">Press Esc to cancel, Enter to save</div>
                              </div>
                            ) : (
                              <>
                                <div className="bg-[#F0F2F5] rounded-2xl px-3 py-2 inline-block relative pr-8 min-w-[120px]">
                                  <span className="font-semibold text-[13px] text-slate-900 block hover:underline cursor-pointer">{comment.author.name}</span>
                                  {comment.text && <span className="text-[15px] text-slate-900 leading-snug break-words">{formatTextWithLinks(comment.text)}</span>}
                                  {(user?.uid === comment.author.uid || isAuthor) && (
                                     <div className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild><button className="p-1 hover:bg-slate-200 rounded-full"><MoreHorizontal className="w-4 h-4 text-slate-500" /></button></DropdownMenuTrigger>
                                          <DropdownMenuContent align="start">
                                            {user?.uid === comment.author.uid && <DropdownMenuItem onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.text); }}>Edit</DropdownMenuItem>}
                                            <DropdownMenuItem onClick={() => handleDeleteComment(comment.id)} className="text-red-600">Delete</DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                     </div>
                                  )}
                                  {(comment.likes || 0) > 0 && (
                                     <div className="absolute -right-2 -bottom-2 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-slate-200 flex items-center gap-1"><div className="bg-synapse-600 rounded-full p-0.5"><ThumbsUp className="w-2 h-2 text-white" /></div><span className="text-[11px] text-slate-500 font-semibold">{comment.likes}</span></div>
                                  )}
                                </div>
                                {comment.image && <div className="mt-2 rounded-xl overflow-hidden max-w-[200px] border border-slate-200"><img src={comment.image} className="w-full h-auto" /></div>}
                                {comment.gif && <div className="mt-2 rounded-xl overflow-hidden max-w-[200px] border border-slate-200"><img src={comment.gif} className="w-full h-auto" /><div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1 rounded">GIF</div></div>}
                                <div className="flex gap-4 px-2 mt-0.5 select-none">
                                  <span onClick={() => toggleCommentLike(comment)} className={cn("text-xs font-bold cursor-pointer hover:underline", comment.likedByUsers?.includes(user?.uid || '') ? "text-synapse-600" : "text-slate-500")}>Like</span>
                                  <span onClick={() => handleReply(comment.author.name)} className="text-xs font-bold text-slate-500 cursor-pointer hover:underline">Reply</span>
                                  <span className="text-xs text-slate-400">{comment.timestamp ? formatDistanceToNow(comment.timestamp.toDate()) : 'Just now'}</span>
                                </div>
                              </>
                            )}
                        </div>
                      </div>
                  ))}
                </div>
                <div className="flex gap-2 items-start pt-1">
                  <Avatar className="w-8 h-8 mt-1"><AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} /><AvatarFallback>ME</AvatarFallback></Avatar>
                  <form onSubmit={handleComment} className="flex-1 relative z-10">
                      <div className="relative bg-[#F0F2F5] rounded-2xl flex items-center transition-all focus-within:ring-1 focus-within:ring-slate-300">
                        <input ref={textInputRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." className="bg-transparent border-none focus:ring-0 w-full px-3 py-2 text-[15px] text-slate-900 rounded-2xl placeholder-slate-500" disabled={isPostingComment} />
                        <div className="flex items-center gap-1 pr-2">
                           <Popover>
                             <PopoverTrigger asChild><button type="button" className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"><Smile className="w-4 h-4" /></button></PopoverTrigger>
                             <PopoverContent className="w-64 p-2" align="end" side="top"><div className="grid grid-cols-6 gap-1">{EMOJIS.map(emoji => (<button key={emoji} type="button" className="text-xl p-1 hover:bg-slate-100 rounded" onClick={() => setCommentText(prev => prev + emoji)}>{emoji}</button>))}</div></PopoverContent>
                           </Popover>
                           <Popover open={showGifPicker} onOpenChange={(open) => { setShowGifPicker(open); if(open) handleGifSearch(''); }}>
                             <PopoverTrigger asChild><button type="button" className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"><Gift className="w-4 h-4" /></button></PopoverTrigger>
                             <PopoverContent className="w-72 p-0 overflow-hidden" align="end" side="top">
                                <div className="p-2 border-b border-slate-100"><div className="relative"><Search className="absolute left-2 top-1.5 w-4 h-4 text-slate-400" /><input className="w-full bg-slate-100 rounded-full pl-8 pr-4 py-1 text-sm focus:outline-none" placeholder="Search GIFs" value={gifSearch} onChange={(e) => handleGifSearch(e.target.value)} autoFocus /></div></div>
                                <div className="h-64 overflow-y-auto p-1 grid grid-cols-2 gap-1">{gifs.map((g: any) => (<img key={g.id} src={g.images.fixed_height_small.url} className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80" onClick={() => sendGifComment(g.images.fixed_height.url)} />))}</div>
                             </PopoverContent>
                           </Popover>
                           <input type="file" ref={fileInputRef} onChange={handleCommentFileSelect} className="hidden" accept="image/*" />
                           <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"><Camera className="w-4 h-4" /></button>
                           <button type="submit" disabled={(!commentText.trim() && !commentImage) || isPostingComment} className="p-1.5 rounded-full text-synapse-600 hover:bg-slate-200 disabled:text-transparent">{isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                        </div>
                      </div>
                      {commentImagePreview && (
                         <div className="mt-2 relative inline-block"><img src={commentImagePreview} className="h-20 w-auto rounded-lg border border-slate-200" /><button type="button" onClick={() => { setCommentImage(null); setCommentImagePreview(null); }} className="absolute -top-1 -right-1 bg-slate-100 rounded-full p-0.5 border border-slate-300 shadow-sm"><X className="w-3 h-3" /></button></div>
                      )}
                  </form>
                </div>
            </div>
          )}
        </>
      )}
    </Card>

    {/* Delete Dialog */}
    <Dialog open={deleteState.isOpen} onOpenChange={(open) => setDeleteState(prev => ({...prev, isOpen: open}))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" />{deleteState.type === 'post' ? 'Delete Post?' : 'Delete Comment?'}</DialogTitle><DialogDescription className="pt-2">{deleteState.type === 'post' ? "Are you sure you want to delete this post? This action cannot be undone and will remove all comments and reactions." : "Are you sure you want to delete this comment? This action cannot be undone."}</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="ghost" onClick={() => setDeleteState(prev => ({...prev, isOpen: false}))}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete</Button></DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Share Dialog */}
    <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
       <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white">
          <DialogHeader className="p-4 border-b border-slate-100 text-center relative">
             <DialogTitle className="text-lg font-bold">Share Post</DialogTitle>
             <button onClick={() => setShareDialogOpen(false)} className="absolute right-4 top-4 p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
          </DialogHeader>
          <div className="p-4 grid grid-cols-2 gap-3">
             <button onClick={handleSharePost} disabled={isSharing} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group">
                <div className="w-12 h-12 bg-synapse-50 rounded-full flex items-center justify-center group-hover:bg-synapse-100 transition-colors">
                   {isSharing ? <Loader2 className="w-6 h-6 text-synapse-600 animate-spin" /> : <Repeat className="w-6 h-6 text-synapse-600" />}
                </div>
                <span className="font-semibold text-slate-900">Share Now (Public)</span>
             </button>
             <button onClick={copyLink} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                   <Copy className="w-6 h-6 text-slate-600" />
                </div>
                <span className="font-semibold text-slate-900">Copy Link</span>
             </button>
          </div>
       </DialogContent>
    </Dialog>

    {/* Lightbox / Image Viewer */}
    {lightboxIndex !== null && displayImages.length > 0 && (
      <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-300">
         <button onClick={() => setLightboxIndex(null)} className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors z-50">
            <X className="w-6 h-6" />
         </button>
         
         <div className="w-full h-full flex items-center justify-center relative p-4">
             <img src={displayImages[lightboxIndex]} className="max-w-full max-h-full object-contain shadow-2xl" alt="" />
             
             {displayImages.length > 1 && (
                <>
                  <button 
                     onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : displayImages.length - 1)); }}
                     className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                  >
                     <ChevronLeftIcon className="w-8 h-8" />
                  </button>
                  <button 
                     onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev !== null && prev < displayImages.length - 1 ? prev + 1 : 0)); }}
                     className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                  >
                     <ChevronRightIcon className="w-8 h-8" />
                  </button>
                </>
             )}
         </div>
         
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
            Image {lightboxIndex + 1} of {displayImages.length}
         </div>
      </div>
    )}
    </>
  );
};

// Icons for Lightbox
const ChevronLeftIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const ChevronRightIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
