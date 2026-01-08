import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { uploadToCloudinary } from '../utils/upload';
import { Loader2, Save, User, Briefcase, MapPin, Heart, Info, Image as ImageIcon } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabKey = 'images' | 'bio' | 'work_edu' | 'places' | 'contact_basic' | 'relationships';

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('images');
  
  // Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    work: userProfile?.work || '',
    position: userProfile?.position || '',
    education: userProfile?.education || '',
    highSchool: userProfile?.highSchool || '',
    location: userProfile?.location || '',
    hometown: userProfile?.hometown || '',
    website: userProfile?.website || '',
    relationshipStatus: userProfile?.relationshipStatus || 'Single',
    birthDate: userProfile?.birthDate || '',
    gender: userProfile?.gender || '',
    languages: userProfile?.languages || ''
  });
  
  // Image State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(userProfile?.photoURL || '');
  const [coverPreview, setCoverPreview] = useState(userProfile?.coverURL || '');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setCoverFile(e.target.files[0]);
      setCoverPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let newPhotoURL = userProfile?.photoURL;
      let newCoverURL = userProfile?.coverURL;

      // Upload Images if changed
      if (avatarFile) {
        newPhotoURL = await uploadToCloudinary(avatarFile);
      }
      if (coverFile) {
        newCoverURL = await uploadToCloudinary(coverFile);
      }

      const updates: Partial<UserProfile> = {
        ...formData,
        photoURL: newPhotoURL,
        coverURL: newCoverURL
      };

      await updateDoc(doc(db, 'users', user.uid), updates);
      await refreshProfile();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'images', label: 'Profile Images', icon: ImageIcon },
    { id: 'bio', label: 'Bio & Intro', icon: User },
    { id: 'work_edu', label: 'Work & Education', icon: Briefcase },
    { id: 'places', label: 'Places Lived', icon: MapPin },
    { id: 'contact_basic', label: 'Contact & Basic Info', icon: Info },
    { id: 'relationships', label: 'Family & Relationships', icon: Heart },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-center">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
           {/* Sidebar */}
           <div className="w-1/3 border-r border-slate-100 bg-slate-50 overflow-y-auto p-2">
              <h3 className="font-bold text-lg px-4 py-2 text-slate-900">Settings</h3>
              <div className="space-y-1">
                 {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabKey)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                        activeTab === tab.id 
                          ? "bg-synapse-100 text-synapse-700" 
                          : "text-slate-600 hover:bg-slate-200/50"
                      )}
                    >
                       <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-synapse-600" : "text-slate-400")} />
                       {tab.label}
                    </button>
                 ))}
              </div>
           </div>

           {/* Content Area */}
           <div className="flex-1 overflow-y-auto p-6 bg-white">
              
              {activeTab === 'images' && (
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-slate-900 mb-4">Profile Images</h3>
                   
                   {/* Profile Picture */}
                   <div className="flex items-center gap-6">
                      <div className="relative">
                         <Avatar className="w-24 h-24 border-2 border-slate-100">
                            <AvatarImage src={avatarPreview} />
                            <AvatarFallback>ME</AvatarFallback>
                         </Avatar>
                      </div>
                      <div className="flex-1">
                         <h4 className="font-semibold text-slate-900">Profile Picture</h4>
                         <p className="text-sm text-slate-500 mb-2">Visible to everyone.</p>
                         <div className="flex gap-2">
                             <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                             <Button size="sm" variant="secondary" onClick={() => avatarInputRef.current?.click()}>Upload New</Button>
                         </div>
                      </div>
                   </div>

                   {/* Cover Photo */}
                   <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Cover Photo</h4>
                      <div className="w-full h-48 bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200 mb-3">
                         {coverPreview ? (
                            <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
                         ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">No cover photo</div>
                         )}
                      </div>
                      <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
                      <Button size="sm" variant="secondary" onClick={() => coverInputRef.current?.click()}>Upload Cover</Button>
                   </div>
                </div>
              )}

              {activeTab === 'bio' && (
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-slate-900 mb-4">Bio & Intro</h3>
                   
                   <Input 
                      label="Display Name" 
                      value={formData.displayName || ''} 
                      onChange={(e) => handleChange('displayName', e.target.value)} 
                      placeholder="Your full name"
                   />

                   <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Bio</label>
                      <textarea 
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
                        value={formData.bio || ''}
                        onChange={(e) => handleChange('bio', e.target.value)}
                        placeholder="Describe yourself..."
                      />
                      <p className="text-xs text-slate-500 text-right">{formData.bio?.length || 0}/101</p>
                   </div>
                </div>
              )}

              {activeTab === 'work_edu' && (
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-slate-900 mb-4">Work & Education</h3>
                   
                   <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900 border-b pb-2">Work</h4>
                      <Input 
                        label="Company" 
                        placeholder="e.g. Synapse Inc."
                        value={formData.work || ''} 
                        onChange={(e) => handleChange('work', e.target.value)} 
                      />
                      <Input 
                        label="Position" 
                        placeholder="e.g. Senior Developer"
                        value={formData.position || ''} 
                        onChange={(e) => handleChange('position', e.target.value)} 
                      />
                   </div>

                   <div className="space-y-4 pt-4">
                      <h4 className="font-semibold text-slate-900 border-b pb-2">Education</h4>
                      <Input 
                        label="College / University" 
                        placeholder="e.g. Stanford University"
                        value={formData.education || ''} 
                        onChange={(e) => handleChange('education', e.target.value)} 
                      />
                      <Input 
                        label="High School" 
                        placeholder="e.g. Lincoln High School"
                        value={formData.highSchool || ''} 
                        onChange={(e) => handleChange('highSchool', e.target.value)} 
                      />
                   </div>
                </div>
              )}

              {activeTab === 'places' && (
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-slate-900 mb-4">Places Lived</h3>
                   <Input 
                      label="Current City" 
                      placeholder="e.g. San Francisco, California"
                      value={formData.location || ''} 
                      onChange={(e) => handleChange('location', e.target.value)} 
                      icon={MapPin}
                   />
                   <Input 
                      label="Hometown" 
                      placeholder="e.g. Austin, Texas"
                      value={formData.hometown || ''} 
                      onChange={(e) => handleChange('hometown', e.target.value)} 
                      icon={MapPin}
                   />
                </div>
              )}

              {activeTab === 'contact_basic' && (
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-slate-900 mb-4">Contact & Basic Info</h3>
                   
                   <div className="space-y-4">
                      <h4 className="font-semibold text-slate-900 border-b pb-2">Contact Info</h4>
                      <Input 
                        label="Website" 
                        placeholder="https://yourwebsite.com"
                        value={formData.website || ''} 
                        onChange={(e) => handleChange('website', e.target.value)} 
                      />
                      <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
                         Email: <span className="font-semibold text-slate-700">{user?.email}</span> (Managed in Account Settings)
                      </div>
                   </div>

                   <div className="space-y-4 pt-4">
                      <h4 className="font-semibold text-slate-900 border-b pb-2">Basic Info</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <Input 
                            label="Birth Date"
                            type="date"
                            value={formData.birthDate || ''}
                            onChange={(e) => handleChange('birthDate', e.target.value)}
                          />
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Gender</label>
                            <select 
                              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={formData.gender || ''}
                              onChange={(e) => handleChange('gender', e.target.value)}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Custom">Custom</option>
                              <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                          </div>
                      </div>

                      <Input 
                        label="Languages" 
                        placeholder="e.g. English, Spanish, French"
                        value={formData.languages || ''} 
                        onChange={(e) => handleChange('languages', e.target.value)} 
                      />
                   </div>
                </div>
              )}

              {activeTab === 'relationships' && (
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-slate-900 mb-4">Family & Relationships</h3>
                   <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Relationship Status</label>
                      <select 
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.relationshipStatus || 'Single'}
                        onChange={(e) => handleChange('relationshipStatus', e.target.value)}
                      >
                        <option value="Single">Single</option>
                        <option value="In a relationship">In a relationship</option>
                        <option value="Married">Married</option>
                        <option value="Complicated">It's complicated</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="p-4 bg-slate-50 text-slate-500 text-sm rounded-lg text-center">
                       Family member linking coming soon.
                    </div>
                </div>
              )}

           </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 flex-shrink-0 bg-white">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto px-8">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};