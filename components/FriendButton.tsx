
import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserMinus, Loader2, X } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { 
  collection, query, where, getDocs, addDoc, deleteDoc, 
  updateDoc, doc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useToast } from '../context/ToastContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/DropdownMenu';

interface FriendButtonProps {
  targetUid: string;
  className?: string;
  onStatusChange?: () => void;
}

export const FriendButton: React.FC<FriendButtonProps> = ({ targetUid, className, onStatusChange }) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user || !targetUid) return;

    // Check if already friends via userProfile.friends array (faster than query)
    if (userProfile?.friends?.includes(targetUid)) {
      setStatus('friends');
      setLoading(false);
    }

    // Listener for Friend Requests
    // We check both: Sent by Me (pending) OR Sent to Me (pending)
    const q1 = query(
      collection(db, 'friend_requests'),
      where('senderId', '==', user.uid),
      where('receiverId', '==', targetUid)
    );

    const q2 = query(
      collection(db, 'friend_requests'),
      where('senderId', '==', targetUid),
      where('receiverId', '==', user.uid)
    );

    // Combine listeners (Manual implementation since Firestore OR queries are limited here)
    const unsub1 = onSnapshot(q1, (snap) => {
      if (!snap.empty) {
        setStatus('pending_sent');
        setRequestId(snap.docs[0].id);
      } else if (status === 'pending_sent') {
        // If it was sent but now gone, revert to none (unless strictly friended)
        if (!userProfile?.friends?.includes(targetUid)) setStatus('none');
      }
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      if (!snap.empty) {
        setStatus('pending_received');
        setRequestId(snap.docs[0].id);
      } else if (status === 'pending_received') {
        if (!userProfile?.friends?.includes(targetUid)) setStatus('none');
      }
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, [user, targetUid, userProfile?.friends]);

  const sendRequest = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'friend_requests'), {
        senderId: user.uid,
        receiverId: targetUid,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // Notification
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
      console.error(e);
      toast("Failed to send request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRequest = async () => {
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

  const acceptRequest = async () => {
    if (!requestId || !user) return;
    setActionLoading(true);
    try {
      // 1. Delete request
      await deleteDoc(doc(db, 'friend_requests', requestId));

      // 2. Add to both users' friend lists
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(targetUid)
      });
      await updateDoc(doc(db, 'users', targetUid), {
        friends: arrayUnion(user.uid)
      });

      // 3. Notify sender
      await addDoc(collection(db, 'notifications'), {
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

  const unfriend = async () => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    if (!user) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayRemove(targetUid)
      });
      await updateDoc(doc(db, 'users', targetUid), {
        friends: arrayRemove(user.uid)
      });
      setStatus('none');
      toast("Friend removed", "info");
      if (onStatusChange) onStatusChange();
    } catch (e) {
      toast("Failed to unfriend", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Button variant="secondary" disabled size="sm" className={className}><Loader2 className="w-4 h-4 animate-spin" /></Button>;

  if (status === 'friends') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className={`gap-2 bg-slate-200 text-slate-900 hover:bg-slate-300 ${className}`} disabled={actionLoading}>
            <UserCheck className="w-4 h-4" />
            Friends
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={unfriend}>
             <UserMinus className="w-4 h-4 mr-2" /> Unfriend
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (status === 'pending_sent') {
    return (
      <Button 
        variant="secondary" 
        onClick={cancelRequest} 
        disabled={actionLoading}
        className={`gap-2 bg-slate-200 text-slate-700 hover:bg-slate-300 ${className}`}
      >
        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        Cancel Request
      </Button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex gap-2">
         <Button 
           onClick={acceptRequest} 
           disabled={actionLoading}
           className={`gap-2 bg-synapse-600 text-white hover:bg-synapse-700 ${className}`}
         >
           {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
           Confirm
         </Button>
         <Button 
           variant="secondary"
           onClick={cancelRequest} 
           disabled={actionLoading}
           className="bg-slate-200 text-slate-700 hover:bg-slate-300"
         >
           Delete
         </Button>
      </div>
    );
  }

  return (
    <Button 
      onClick={sendRequest} 
      disabled={actionLoading}
      className={`gap-2 bg-synapse-600 text-white hover:bg-synapse-700 ${className}`}
    >
      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
      Add Friend
    </Button>
  );
};
