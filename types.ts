
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
