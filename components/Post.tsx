import React from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark } from 'lucide-react';
import { Post as PostType } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import firebase from 'firebase/app';
import { db } from '../firebaseConfig';

export const Post: React.FC<{ post: PostType }> = ({ post }) => {
  const { user } = useAuth();
  
  // Check if current user has already liked this post
  const isLiked = user ? post.likedByUsers?.includes(user.uid) : false;

  const handleLike = async () => {
    if (!user) return;

    const postRef = db.collection('posts').doc(post.id);

    try {
      if (isLiked) {
        // Unlike
        await postRef.update({
          likes: firebase.firestore.FieldValue.increment(-1),
          likedByUsers: firebase.firestore.FieldValue.arrayRemove(user.uid)
        });
      } else {
        // Like
        await postRef.update({
          likes: firebase.firestore.FieldValue.increment(1),
          likedByUsers: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <img 
            src={post.author.avatar} 
            alt={post.author.name} 
            className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-50"
          />
          <div>
            <h3 className="font-semibold text-slate-900 leading-tight hover:text-synapse-600 cursor-pointer transition-colors">
              {post.author.name}
            </h3>
            <p className="text-sm text-slate-500">
              {post.author.handle} · {post.timestamp ? formatDistanceToNow(post.timestamp, { addSuffix: true }) : 'Just now'}
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap break-words">
        {post.content}
      </p>

      {post.image && (
        <div className="mb-4 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <img src={post.image} alt="Post content" className="w-full h-auto hover:scale-105 transition-transform duration-500" />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex gap-6">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{post.likes}</span>
          </button>
          
          <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-synapse-600 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span>{post.comments}</span>
          </button>
          
          <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-green-600 transition-colors">
            <Share2 className="w-5 h-5" />
            <span>{post.shares}</span>
          </button>
        </div>
        
        <button className="text-slate-400 hover:text-synapse-600 transition-colors">
          <Bookmark className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};