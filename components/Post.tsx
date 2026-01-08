import React, { useState, useEffect } from 'react';
import { 
  ThumbsUp, MessageCircle, Share2, MoreHorizontal, Globe, 
  Trash2, AlertCircle, EyeOff, Send, Smile, Camera, X 
} from 'lucide-react';
import { Post as PostType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { 
  doc, updateDoc, increment, arrayUnion, arrayRemove, 
  collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
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
import { cn } from '../lib/utils';

interface Comment {
  id: string;
  text: string;
  author: {
    uid: string;
    name: string;
    avatar: string;
  };
  timestamp: any;
}

export const Post: React.FC<{ post: PostType }> = ({ post }) => {
  const { user, userProfile } = useAuth();
  
  // State
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isLiked = user ? post.likedByUsers?.includes(user.uid) : false;
  const isAuthor = user?.uid === post.author.uid;

  // Real-time comments listener
  useEffect(() => {
    if (showComments) {
      const q = query(
        collection(db, 'posts', post.id, 'comments'), 
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[]);
      });
      return () => unsubscribe();
    }
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!user) return;
    const postRef = doc(db, 'posts', post.id);
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedByUsers: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedByUsers: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;

    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        text: commentText,
        author: {
          uid: user.uid,
          name: userProfile?.displayName || user.displayName || 'User',
          avatar: userProfile?.photoURL || user.photoURL || ''
        },
        timestamp: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'posts', post.id), {
        comments: increment(1)
      });
      
      setCommentText('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (error) {
      console.error("Error deleting post:", error);
      setIsDeleting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  if (isDeleting) return null;

  return (
    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in duration-500">
      
      {/* --- Header --- */}
      <div className="p-4 pb-2 flex justify-between items-start">
        <div className="flex gap-3">
           <Avatar className="h-10 w-10 cursor-pointer hover:brightness-95">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>{post.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
           </Avatar>
           <div className="flex flex-col">
              <span className="font-semibold text-slate-900 text-[15px] hover:underline cursor-pointer leading-tight">
                {post.author.name}
              </span>
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                 <span className="hover:underline cursor-pointer">
                    {post.timestamp ? formatDistanceToNow(post.timestamp, { addSuffix: true }).replace('about ', '') : 'Just now'}
                 </span>
                 <span>·</span>
                 <Globe className="w-3 h-3" />
              </div>
           </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 -mt-1 -mr-2">
               <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
             <DropdownMenuItem className="gap-2 cursor-pointer font-medium py-2">
                <Share2 className="w-4 h-4" /> Save post
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuItem className="gap-2 cursor-pointer font-medium py-2">
                <EyeOff className="w-4 h-4" /> Hide post
             </DropdownMenuItem>
             <DropdownMenuItem className="gap-2 cursor-pointer font-medium py-2">
                <AlertCircle className="w-4 h-4" /> Report post
             </DropdownMenuItem>
             {isAuthor && (
               <>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem 
                    onClick={handleDeletePost}
                    className="gap-2 cursor-pointer font-medium py-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" /> Move to trash
                 </DropdownMenuItem>
               </>
             )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* --- Content --- */}
      <div className="px-4 pb-3">
         <p className="text-[15px] text-slate-900 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.image && (
        <div className="w-full bg-slate-50 border-t border-b border-slate-100 flex items-center justify-center max-h-[600px] overflow-hidden cursor-pointer">
           <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
        </div>
      )}

      {/* --- Stats --- */}
      <div className="px-4 py-3 flex items-center justify-between">
         <div className="flex items-center gap-1.5 cursor-pointer hover:underline decoration-slate-500">
             {post.likes > 0 && (
                <div className="bg-synapse-600 rounded-full p-1 flex items-center justify-center">
                   <ThumbsUp className="w-3 h-3 text-white fill-current" />
                </div>
             )}
             <span className="text-slate-500 text-[15px]">{post.likes > 0 ? post.likes : 'Be the first to like this'}</span>
         </div>
         <div className="flex items-center gap-3 text-slate-500 text-[15px]">
            {post.comments > 0 && (
               <span className="hover:underline cursor-pointer" onClick={() => setShowComments(true)}>{post.comments} comments</span>
            )}
            {post.shares > 0 && (
               <span className="hover:underline cursor-pointer">{post.shares} shares</span>
            )}
         </div>
      </div>

      <div className="px-3">
         <Separator className="bg-slate-200" />
      </div>

      {/* --- Actions --- */}
      <div className="px-2 py-1 flex items-center justify-between">
         <Button 
            variant="ghost" 
            onClick={handleLike}
            className={cn(
              "flex-1 gap-2 font-semibold text-[15px] hover:bg-slate-100 rounded-lg h-9 transition-colors",
              isLiked ? "text-synapse-600" : "text-slate-500"
            )}
         >
            <ThumbsUp className={cn("w-5 h-5", isLiked && "fill-current")} />
            Like
         </Button>

         <Button 
            variant="ghost" 
            onClick={() => setShowComments(!showComments)}
            className="flex-1 gap-2 font-semibold text-[15px] text-slate-500 hover:bg-slate-100 rounded-lg h-9 transition-colors"
         >
            <MessageCircle className="w-5 h-5" />
            Comment
         </Button>

         <Button 
            variant="ghost" 
            onClick={handleShare}
            className="flex-1 gap-2 font-semibold text-[15px] text-slate-500 hover:bg-slate-100 rounded-lg h-9 transition-colors"
         >
            <Share2 className="w-5 h-5" />
            Share
         </Button>
      </div>

      {/* --- Comments Section --- */}
      {(showComments || comments.length > 0) && (
         <div className="px-4 pb-4 border-t border-slate-200/60 pt-3">
            
            {/* View More */}
            {post.comments > comments.length && comments.length > 0 && (
               <div className="font-semibold text-slate-500 text-sm hover:underline cursor-pointer mb-3">
                  View more comments
               </div>
            )}

            {/* List */}
            <div className="space-y-3 mb-4">
               {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2 group">
                     <Avatar className="w-8 h-8 mt-1 cursor-pointer hover:brightness-95">
                        <AvatarImage src={comment.author.avatar} />
                        <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                     </Avatar>
                     <div className="flex-1 max-w-[90%]">
                        <div className="bg-slate-100 rounded-2xl px-3 py-2 inline-block relative">
                           <span className="font-semibold text-xs text-slate-900 block hover:underline cursor-pointer">
                              {comment.author.name}
                           </span>
                           <span className="text-[15px] text-slate-900 leading-snug">
                              {comment.text}
                           </span>
                           {/* Likes count on comment could go here absolutely positioned */}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 ml-3 text-xs font-semibold text-slate-500">
                           <span className="hover:underline cursor-pointer">Like</span>
                           <span className="hover:underline cursor-pointer">Reply</span>
                           <span className="font-normal">
                             {comment.timestamp ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true }).replace('about ', '') : 'Just now'}
                           </span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 items-start pt-1">
               <Avatar className="w-8 h-8 mt-1">
                  <AvatarImage src={userProfile?.photoURL || user?.photoURL || ''} />
                  <AvatarFallback>ME</AvatarFallback>
               </Avatar>
               <form onSubmit={handleComment} className="flex-1 relative bg-slate-100 rounded-2xl flex items-center">
                  <input 
                     type="text"
                     value={commentText}
                     onChange={(e) => setCommentText(e.target.value)}
                     placeholder="Write a comment..."
                     className="bg-transparent border-none focus:ring-0 w-full px-3 py-2 text-[15px] placeholder-slate-500 text-slate-900 rounded-2xl"
                  />
                  <div className="flex items-center gap-1 pr-2 text-slate-500">
                     <Smile className="w-4 h-4 hover:text-slate-700 cursor-pointer" />
                     <Camera className="w-4 h-4 hover:text-slate-700 cursor-pointer" />
                     <button 
                        type="submit" 
                        disabled={!commentText.trim()}
                        className="p-1 rounded-full text-synapse-600 hover:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent transition-colors"
                     >
                        <Send className="w-4 h-4" />
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </Card>
  );
};