
export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  coverURL?: string | null;
  role?: 'admin' | 'user';
  bio?: string;
  followers?: string[];
  following?: string[];
  friends?: string[]; // Array of UIDs
  birthDate?: string; // ISO Date string YYYY-MM-DD
  
  // Extended Details
  work?: string; // Company
  position?: string; // Job Title
  education?: string; // College/University
  highSchool?: string;
  location?: string; // Current City
  hometown?: string;
  relationshipStatus?: 'Single' | 'In a relationship' | 'Married' | 'Complicated' | 'Divorced' | 'Widowed';
  website?: string;
  gender?: string;
  languages?: string;
}

export interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    handle: string;
    uid: string;
  };
  content: string;
  timestamp: Date;
  likes: number; // Legacy count
  comments: number;
  shares: number;
  image?: string; // Legacy support
  images?: string[]; // Multiple images
  likedByUsers: string[]; // Legacy array
  
  // New Features
  reactions?: Record<string, ReactionType>; // Map of UID -> Reaction
  privacy?: 'public' | 'friends' | 'only_me'; // Privacy setting
  background?: string; // CSS gradient class
  feeling?: string; // e.g., "😊 feeling happy"
  location?: string; // e.g., "at New York City"
  taggedUsers?: string[]; // Array of display names
  gif?: string; // GIF URL
}

export interface Comment {
  id: string;
  text: string;
  image?: string; // Image in comment
  gif?: string; // GIF in comment
  author: {
    uid: string;
    name: string;
    avatar: string;
  };
  timestamp: any;
}

export interface Story {
  id: string;
  uid: string;
  displayName: string;
  avatar: string;
  image: string;
  timestamp: Date;
}

export interface NavItem {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

export interface SiteSettings {
  signupEnabled: boolean;
}

export interface Trend {
  id: string;
  tag: string;
  posts: string;
  count?: number;
}

export interface SponsoredAd {
  id: string;
  title: string;
  site: string;
  image: string;
  link: string;
}

export interface Notification {
  id: string;
  recipientUid: string;
  sender: {
    uid: string;
    displayName: string;
    photoURL: string;
  };
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'friend_accept';
  postId?: string; // ID of the post interacted with
  previewText?: string; // Snippet of comment or post
  read: boolean;
  timestamp: any;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: any;
  sender?: UserProfile; // Joined data
}
