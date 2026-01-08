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
import { Loader2, Save } from 'lucide-react';
import { UserProfile } from '../types';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ open, onOpenChange }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [work, setWork] = useState(userProfile?.work || '');
  const [education, setEducation] = useState(userProfile?.education || '');
  const [website, setWebsite] = useState(userProfile?.website || '');
  const [relationshipStatus, setRelationshipStatus] = useState(userProfile?.relationshipStatus || 'Single');
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || '');
  
  // Image State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(userProfile?.photoURL || '');
  const [coverPreview, setCoverPreview] = useState(userProfile?.coverURL || '');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        displayName,
        bio,
        location,
        work,
        education,
        website,
        relationshipStatus: relationshipStatus as any,
        birthDate,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center border-b border-slate-100 pb-4">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          
          {/* Cover Photo Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Cover Photo</h3>
              <Button 
                variant="ghost" 
                className="text-synapse-600 hover:bg-synapse-50"
                onClick={() => coverInputRef.current?.click()}
              >
                Edit
              </Button>
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
            </div>
            <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-100 border border-slate-200">
               {coverPreview ? (
                 <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400">No Cover Photo</div>
               )}
            </div>
          </div>

          {/* Profile Picture Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Profile Picture</h3>
              <Button 
                variant="ghost" 
                className="text-synapse-600 hover:bg-synapse-50"
                onClick={() => avatarInputRef.current?.click()}
              >
                Edit
              </Button>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100">
                  <img src={avatarPreview || `https://ui-avatars.com/api/?name=${displayName}`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Customize your Intro</h3>
            
            <Input 
              label="Full Name" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
            />
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Bio</label>
              <textarea 
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe yourself..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Input 
                label="Workplace" 
                placeholder="e.g. Software Engineer"
                value={work} 
                onChange={(e) => setWork(e.target.value)} 
              />
              
              <Input 
                label="Education" 
                placeholder="e.g. Harvard University"
                value={education} 
                onChange={(e) => setEducation(e.target.value)} 
              />
            </div>

            <Input 
              label="Current City" 
              placeholder="e.g. San Francisco, CA"
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
            />
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Relationship Status</label>
              <select 
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value as "Single" | "In a relationship" | "Married" | "Complicated")}
              >
                <option value="Single">Single</option>
                <option value="In a relationship">In a relationship</option>
                <option value="Married">Married</option>
                <option value="Complicated">It's complicated</option>
              </select>
            </div>

            <Input 
              label="Birth Date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />

            <Input 
              label="Website" 
              placeholder="https://yourwebsite.com"
              value={website} 
              onChange={(e) => setWebsite(e.target.value)} 
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};