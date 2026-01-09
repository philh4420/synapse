
import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserMinus, Loader2, X, Check, Clock, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { 
  collection, query, where, addDoc, deleteDoc, 
  doc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useToast } from '../context/ToastContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/DropdownMenu';
import { cn } from '../lib/utils';

interface FriendButtonProps {
  targetUid: string;
  className?: string;
  onStatusChange?: () => void;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const FriendButton: React.FC<FriendButtonProps> = ({ targetUid, className, onStatusChange, size = 'default' }) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user || !targetUid) return;

    // Immediate check from profile
    if (userProfile?.friends?.includes(targetUid)) {
      setStatus('friends');
      setLoading(false);
    }

    // Listen for requests sent BY me
    const qSent = query(
      collection(db, 'friend_requests'),
      where('senderId', '==', user.uid),
      where('receiverId', '==', targetUid)
    );

    // Listen for requests sent TO me
    const qReceived = query(
      collection(db, 'friend_requests'),
      where('senderId', '==', targetUid),
      where('receiverId', '==', user.uid)
    );

    const unsubSent = onSnapshot(qSent, (snap) => {
      if (!snap.empty) {
        setStatus('pending_sent');
        setRequestId(snap.docs[0].id);
      } else {
        if (status === 'pending_sent') setStatus('none');
      }
      setLoading(false);
    });

    const unsubReceived = onSnapshot(qReceived, (snap) => {
      if (!snap.empty) {
        setStatus('pending_received');
        setRequestId(snap.docs[0].id);
      } else {
        if (status === 'pending_received') setStatus('none');
      }
      setLoading(false);
    });

    return () => { unsubSent(); unsubReceived(); };
  }, [user, targetUid, userProfile?.friends]);

  const sendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'friend_requests'), {
        senderId: user.uid,
        receiverId: targetUid,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        recipientUid: targetUid,
        sender: {
          uid: user.uid,
          displayName: userProfile?.displayName || user.displayName || 'User',
          photoURL: userProfile?.photoURL || ''
        },
        type: 'friend_request',
        read: false,
        timestamp: serverTimestamp()
      });

      toast("Friend request sent", "success");
    } catch (e) {
      toast("Failed to send request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requestId) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'friend_requests', requestId));
      setRequestId(null);
      setStatus('none');
      toast("Request canceled", "info");
    } catch (e) {
      toast("Failed to cancel", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const acceptRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requestId || !user) return;
    setActionLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Delete the friend request
      const requestRef = doc(db, 'friend_requests', requestId);
      batch.delete(requestRef);

      // 2. Add targetUid to my friends list
      const myUserRef = doc(db, 'users', user.uid);
      batch.update(myUserRef, { friends: arrayUnion(targetUid) });

      // 3. Add my uid to target's friends list
      const theirUserRef = doc(db, 'users', targetUid);
      batch.update(theirUserRef, { friends: arrayUnion(user.uid) });

      // 4. Create Notification
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        recipientUid: targetUid,
        sender: {
          uid: user.uid,
          displayName: userProfile?.displayName || user.displayName || 'User',
          photoURL: userProfile?.photoURL || ''
        },
        type: 'friend_accept',
        read: false,
        timestamp: serverTimestamp()
      });

      await batch.commit();

      setStatus('friends');
      toast("You are now friends", "success");
      if (onStatusChange) onStatusChange();
    } catch (e) {
      console.error(e);
      toast("Failed to accept", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const unfriend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      
      const myUserRef = doc(db, 'users', user.uid);
      batch.update(myUserRef, { friends: arrayRemove(targetUid) });

      const theirUserRef = doc(db, 'users', targetUid);
      batch.update(theirUserRef, { friends: arrayRemove(user.uid) });

      await batch.commit();

      setStatus('none');
      toast("Friend removed", "info");
      if (onStatusChange) onStatusChange();
    } catch (e) {
      toast("Failed to unfriend", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Button 
        variant="ghost" 
        disabled 
        size={size} 
        className={cn("bg-slate-100 text-slate-400 animate-pulse", className)}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  // --- CONNECTED STATE ---
  if (status === 'friends') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size={size} 
            className={cn(
                "gap-2 font-bold transition-all duration-300", 
                "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border border-emerald-200 shadow-sm",
                className
            )} 
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            {size !== 'icon' && "Connected"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-emerald-100 bg-white/95 backdrop-blur-md">
           <div className="px-2 py-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Friends since 2026
           </div>
           <DropdownMenuSeparator className="bg-slate-100" />
           <DropdownMenuItem className="p-2.5 rounded-xl cursor-pointer hover:bg-red-50 focus:bg-red-50 group" onClick={unfriend}>
             <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors mr-3">
                 <UserMinus className="w-4 h-4 text-red-600" /> 
             </div>
             <div className="flex flex-col">
                <span className="font-semibold text-red-700">Unfriend</span>
                <span className="text-xs text-red-400">Remove from your circle</span>
             </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // --- REQUEST SENT STATE ---
  if (status === 'pending_sent') {
    return (
      <Button 
        variant="ghost" 
        size={size}
        onClick={cancelRequest} 
        isLoading={actionLoading}
        className={cn(
            "gap-2 font-medium transition-all duration-300",
            "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100",
            className
        )}
      >
        {!actionLoading && (
            <span className="flex items-center gap-2 group">
                <Clock className="w-4 h-4 group-hover:hidden" />
                <X className="w-4 h-4 hidden group-hover:block" />
                {size !== 'icon' && <span className="group-hover:hidden">Requested</span>}
                {size !== 'icon' && <span className="hidden group-hover:inline">Cancel</span>}
            </span>
        )}
      </Button>
    );
  }

  // --- REQUEST RECEIVED STATE ---
  if (status === 'pending_received') {
    return (
      <div className={cn("flex gap-2 w-full animate-in fade-in slide-in-from-right-4 duration-300", className)}>
         <Button 
           size={size}
           onClick={acceptRequest} 
           disabled={actionLoading}
           className="flex-1 gap-1.5 font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md border-0"
         >
           {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
           Confirm
         </Button>
         <Button 
           size={size}
           onClick={cancelRequest} 
           disabled={actionLoading}
           className="flex-1 gap-1.5 font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 border-0"
         >
           Delete
         </Button>
      </div>
    );
  }

  // --- ADD FRIEND STATE (DEFAULT) ---
  return (
    <Button 
      size={size}
      onClick={sendRequest} 
      isLoading={actionLoading}
      className={cn(
        "gap-2 font-bold transition-all duration-300 transform active:scale-95",
        "bg-gradient-to-r from-synapse-600 to-indigo-600 hover:from-synapse-700 hover:to-indigo-700 text-white shadow-lg shadow-synapse-500/20 border-0",
        className
      )}
    >
      {!actionLoading && <UserPlus className="w-4 h-4" />}
      {size !== 'icon' && "Add Friend"}
    </Button>
  );
};
