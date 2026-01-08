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
  birthDate?: string; // ISO Date string YYYY-MM-DD
  
  // Extended Details
  work?: string;
  education?: string;
  location?: string;
  relationshipStatus?: 'Single' | 'In a relationship' | 'Married' | 'Complicated';
  website?: string;
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