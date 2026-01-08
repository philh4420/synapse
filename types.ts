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
  likes: number;
  comments: number;
  shares: number;
  image?: string;
  likedByUsers: string[];
}

export interface Story {
  id: string;
  user: string;
  avatar: string;
  image: string;
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
  posts: string; // e.g. "54k" or just a number converted to string
  count?: number; // numeric value for sorting
}