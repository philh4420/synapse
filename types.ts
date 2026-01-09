
export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  privacy?: {
    defaultPostAudience?: 'public' | 'friends' | 'only_me';
    friendRequests?: 'everyone' | 'friends_of_friends';
    searchEngineIndexing?: boolean;
  };
  notifications?: {
    email?: boolean;
    push?: boolean;
    comments?: boolean;
    friendRequests?: boolean;
    tags?: boolean;
  };
  accessibility?: {
    compactMode?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    reduceMotion?: boolean;
    highContrast?: boolean;
  };
  loginAlerts?: boolean;
}

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
  savedPosts?: string[]; // Array of Post IDs
  birthDate?: string; // ISO Date string YYYY-MM-DD
  
  // Real-time Status & Privacy
  isOnline?: boolean;
  lastSeen?: any;
  blockedUsers?: string[]; // Array of UIDs blocked by this user
  isBanned?: boolean; // Admin ban status

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
  
  // Settings
  settings?: UserSettings;
  createdAt?: any;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  timestamp: any;
  reporter?: UserProfile; // For UI
  reported?: UserProfile; // For UI
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  timestamp: any;
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
  video?: string; // Video URL
  likedByUsers: string[]; // Legacy array
  
  // New Features
  reactions?: Record<string, ReactionType>; // Map of UID -> Reaction
  privacy?: 'public' | 'friends' | 'only_me'; // Privacy setting
  background?: string; // CSS gradient class
  feeling?: string; // e.g., "😊 feeling happy"
  location?: string; // e.g., "at New York City"
  taggedUsers?: string[]; // Array of display names
  gif?: string; // GIF URL
  
  // Sharing
  sharedPost?: {
    id: string;
    author: {
      name: string;
      avatar: string;
      uid: string;
    };
    content: string;
    image?: string;
    video?: string;
    timestamp: any;
  };
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
  likes?: number; // Like count for comments
  likedByUsers?: string[]; // Users who liked this comment
}

export interface Story {
  id: string;
  uid: string;
  displayName: string;
  avatar: string;
  image: string;
  timestamp: Date;
}

export interface Page {
  id: string;
  name: string;
  handle: string;
  category: string;
  description: string;
  coverURL: string;
  photoURL: string;
  ownerId: string;
  followers: number;
  verified: boolean;
  timestamp: any;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO String
  time: string;
  location: string;
  category: string;
  coverURL: string;
  host: {
    uid: string;
    name: string;
    avatar: string;
    attendees: string[]; // Array of UIDs
    interested: string[]; // Array of UIDs
  };
  attendees: string[];
  interested: string[];
  timestamp: any;
}

export interface NavItem {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

export interface SiteSettings {
  signupEnabled: boolean;
  announcement?: {
    enabled: boolean;
    message: string;
    type: 'info' | 'warning' | 'error';
  }
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
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'friend_accept' | 'page_invite' | 'event_invite';
  postId?: string; // ID of the post interacted with
  pageId?: string; // ID of page created
  eventId?: string; // ID of event created
  previewText?: string; // Snippet of comment, post, page name, or event name
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

export interface Chat {
  id: string;
  participants: string[]; // Array of UIDs
  participantData: Record<string, { displayName: string; photoURL: string }>; // Cached minimal profile data
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    read: boolean;
  };
  updatedAt: any;
  theme?: string;
  emoji?: string;
  nicknames?: Record<string, string>;
  typing?: Record<string, boolean>;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  image?: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    displayName?: string;
  };
  reactions?: Record<string, string>; // uid -> emoji
}
