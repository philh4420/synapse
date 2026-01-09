
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { 
  Settings, Shield, Lock, Bell, Globe, User, 
  ChevronRight, Key, Mail, Eye, EyeOff, Loader2,
  Trash2, Save, LogOut, AlertTriangle
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Separator } from './ui/Separator';
import { cn } from '../lib/utils';
import { UserSettings } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/Dialog';

type SettingsSection = 'account' | 'security' | 'privacy' | 'notifications' | 'language';

export const SettingsPage: React.FC = () => {
  const { user, userProfile, refreshProfile, logout } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [loading, setLoading] = useState(false);

  // --- State for Forms ---
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState(''); // Password required to change email
  
  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Settings Object (Synced with UserProfile)
  const [settings, setSettings] = useState<UserSettings>({
    privacy: {
      defaultPostAudience: 'public',
      friendRequests: 'everyone',
      searchEngineIndexing: true
    },
    notifications: {
      email: true,
      push: true,
      comments: true,
      friendRequests: true,
      tags: true
    },
    loginAlerts: true,
    language: 'English (US)'
  });

  // Account Deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Initialize state from profile
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setEmail(userProfile.email || user?.email || '');
      
      // Merge defaults with existing settings to prevent undefined errors
      setSettings(prev => ({
        ...prev,
        ...userProfile.settings,
        privacy: { ...prev.privacy, ...userProfile.settings?.privacy },
        notifications: { ...prev.notifications, ...userProfile.settings?.notifications }
      }));
    }
  }, [userProfile, user]);

  // --- Generic Update Helper ---
  const saveSettingsToFirestore = async (newSettings: UserSettings) => {
    if (!user) return;
    // Optimistic Update
    setSettings(newSettings);
    try {
      await updateDoc(doc(db, 'users', user.uid), { settings: newSettings });
    } catch (e) {
      console.error(e);
      toast("Failed to save setting", "error");
    }
  };

  const updateNestedSetting = (section: keyof UserSettings, key: string, value: any) => {
    const sectionData = settings[section] as any || {};
    const updatedSection = { ...sectionData, [key]: value };
    const newSettings = { ...settings, [section]: updatedSection };
    saveSettingsToFirestore(newSettings);
  };

  const updateRootSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettingsToFirestore(newSettings);
  };

  // --- Action Handlers ---

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 1. Update Display Name in Firestore
      if (displayName !== userProfile?.displayName) {
        await updateDoc(doc(db, 'users', user.uid), { displayName });
      }

      // 2. Update Email (requires Re-auth)
      if (email !== user.email) {
        if (!emailPassword) {
          toast("Please enter your current password to change email.", "error");
          setLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, emailPassword);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, email);
        await updateDoc(doc(db, 'users', user.uid), { email });
        setEmailPassword(''); // Clear sensitive data
      }

      await refreshProfile();
      toast("Account details updated successfully", "success");
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/wrong-password') {
        toast("Incorrect password provided.", "error");
      } else if (e.code === 'auth/email-already-in-use') {
        toast("Email is already in use by another account.", "error");
      } else if (e.code === 'auth/requires-recent-login') {
         toast("For security, please log out and log in again before changing email.", "error");
      } else {
        toast("Failed to update account. " + e.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !newPassword || !currentPassword) return;
    if (newPassword !== confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast("Password updated successfully", "success");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      if (e.code === 'auth/wrong-password') {
        toast("Incorrect current password", "error");
      } else {
        toast("Failed to update password: " + e.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
     if (!user || !deletePassword) return;
     if (deleteConfirmationText !== 'DELETE') {
        toast("Please type DELETE to confirm.", "error");
        return;
     }

     setLoading(true);
     try {
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
        
        // Delete Firestore Data
        await deleteDoc(doc(db, 'users', user.uid));
        // Delete Auth User
        await deleteUser(user);
        
        // We use 'info' or 'success' type for toast. Since user is being logged out/deleted,
        // the toast needs to appear in the context of the App which persists.
        toast("Account permanently deleted. Goodbye.", "info");
        // Auth state listener in App.tsx will handle redirect to Landing
     } catch (e: any) {
        console.error(e);
        if (e.code === 'auth/wrong-password') {
           toast("Incorrect password. Cannot delete account.", "error");
        } else {
           toast("Failed to delete account: " + e.message, "error");
        }
        setLoading(false);
     }
  };

  const openDeleteDialog = () => {
     setDeletePassword('');
     setDeleteConfirmationText('');
     setDeleteDialogOpen(true);
  };

  // --- UI Components ---
  const SidebarItem = ({ id, icon: Icon, label }: { id: SettingsSection, icon: any, label: string }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-300 text-left",
        activeSection === id 
          ? "bg-white text-synapse-700 shadow-sm ring-1 ring-synapse-100" 
          : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        activeSection === id ? "bg-synapse-50 text-synapse-600" : "bg-transparent text-slate-400"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="flex-1">{label}</span>
      {activeSection === id && <ChevronRight className="w-4 h-4 text-synapse-400" />}
    </button>
  );

  const Toggle = ({ checked, onChange, label, desc }: { checked: boolean, onChange: (v: boolean) => void, label: string, desc?: string }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
       <div className="pr-4">
          <p className="font-semibold text-slate-900">{label}</p>
          {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
       </div>
       <button 
         onClick={() => onChange(!checked)}
         className={cn(
            "relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-synapse-500",
            checked ? "bg-synapse-600" : "bg-slate-300"
         )}
       >
          <span className={cn(
             "absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300",
             checked ? "translate-x-6" : "translate-x-0"
          )} />
       </button>
    </div>
  );

  return (
    <div className="max-w-[1100px] mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-8">
         <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
         <p className="text-slate-500 mt-1">Manage your account preferences and security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
         <div className="space-y-1">
            <SidebarItem id="account" icon={User} label="Account" />
            <SidebarItem id="security" icon={Shield} label="Security" />
            <SidebarItem id="privacy" icon={Lock} label="Privacy" />
            <SidebarItem id="notifications" icon={Bell} label="Notifications" />
            <SidebarItem id="language" icon={Globe} label="Language" />
         </div>

         <Card className="min-h-[500px] bg-white/80 backdrop-blur-xl border-white/60 p-6 lg:p-8 shadow-sm">
            
            {/* --- ACCOUNT SETTINGS --- */}
            {activeSection === 'account' && (
               <div className="space-y-8">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-6">Account Details</h2>
                     <div className="space-y-6">
                        <Input 
                           label="Display Name" 
                           value={displayName}
                           onChange={(e) => setDisplayName(e.target.value)}
                        />
                        
                        <div className="space-y-2">
                           <Input 
                              label="Email Address" 
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                           />
                           {email !== user?.email && (
                              <div className="animate-in fade-in slide-in-from-top-2">
                                 <Input 
                                    type="password"
                                    label="Confirm Password to Change Email"
                                    placeholder="Enter current password"
                                    value={emailPassword}
                                    onChange={(e) => setEmailPassword(e.target.value)}
                                    className="bg-yellow-50 border-yellow-200"
                                 />
                              </div>
                           )}
                        </div>

                        <div className="flex justify-end pt-4">
                           <Button onClick={handleUpdateProfile} disabled={loading} className="bg-synapse-600 text-white px-8 rounded-xl font-bold">
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                           </Button>
                        </div>
                     </div>
                  </div>

                  <Separator />

                  <div>
                     <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                     <p className="text-sm text-slate-500 mb-4">Permanently delete your account and all of your content.</p>
                     <Button variant="destructive" onClick={openDeleteDialog} className="rounded-xl">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                     </Button>
                  </div>
               </div>
            )}

            {/* --- SECURITY SETTINGS --- */}
            {activeSection === 'security' && (
               <div className="space-y-8">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-2">Password & Security</h2>
                     <p className="text-slate-500 text-sm mb-6">Manage your password and login alerts.</p>

                     <div className="space-y-6">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Key className="w-4 h-4" /> Change Password</h3>
                           <div className="max-w-md space-y-4">
                              <Input 
                                 type={showPassword ? "text" : "password"} 
                                 placeholder="Current Password" 
                                 value={currentPassword}
                                 onChange={(e) => setCurrentPassword(e.target.value)}
                              />
                              <Input 
                                 type={showPassword ? "text" : "password"} 
                                 placeholder="New Password" 
                                 value={newPassword}
                                 onChange={(e) => setNewPassword(e.target.value)}
                              />
                              <Input 
                                 type={showPassword ? "text" : "password"} 
                                 placeholder="Confirm New Password" 
                                 value={confirmPassword}
                                 onChange={(e) => setConfirmPassword(e.target.value)}
                              />
                              <div className="flex justify-between items-center pt-2">
                                 <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-sm text-synapse-600 font-bold hover:underline flex items-center gap-1"
                                 >
                                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} 
                                    {showPassword ? "Hide" : "Show"}
                                 </button>
                                 <Button onClick={handleChangePassword} disabled={loading} className="bg-synapse-600 text-white rounded-xl font-bold">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                                 </Button>
                              </div>
                           </div>
                        </div>

                        <Separator />

                        <div>
                           <h3 className="font-bold text-slate-800 mb-4">Extra Security</h3>
                           <Toggle 
                              label="Login Alerts" 
                              desc="Get notified if you log in from an unknown device."
                              checked={settings.loginAlerts || false}
                              onChange={(v) => updateRootSetting('loginAlerts', v)} 
                           />
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* --- PRIVACY SETTINGS --- */}
            {activeSection === 'privacy' && (
               <div className="space-y-8">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-2">Privacy Settings</h2>
                     <p className="text-slate-500 text-sm mb-6">Control who sees your content and how people find you.</p>

                     <div className="space-y-4">
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                           <h3 className="font-bold text-slate-900 mb-4">Your Activity</h3>
                           <div className="flex items-center justify-between py-3">
                              <div>
                                 <p className="font-medium text-slate-900">Default Post Audience</p>
                                 <p className="text-xs text-slate-500 mt-1">Who can see your future posts?</p>
                              </div>
                              <select 
                                 className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-synapse-500/50"
                                 value={settings.privacy?.defaultPostAudience || 'public'}
                                 onChange={(e) => updateNestedSetting('privacy', 'defaultPostAudience', e.target.value)}
                              >
                                 <option value="public">Public</option>
                                 <option value="friends">Friends</option>
                                 <option value="only_me">Only Me</option>
                              </select>
                           </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                           <h3 className="font-bold text-slate-900 mb-4">Connections</h3>
                           
                           <div className="flex items-center justify-between py-3 border-b border-slate-200/60">
                              <div>
                                 <p className="font-medium text-slate-900">Who can send you friend requests?</p>
                              </div>
                              <select 
                                 className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-synapse-500/50"
                                 value={settings.privacy?.friendRequests || 'everyone'}
                                 onChange={(e) => updateNestedSetting('privacy', 'friendRequests', e.target.value)}
                              >
                                 <option value="everyone">Everyone</option>
                                 <option value="friends_of_friends">Friends of Friends</option>
                              </select>
                           </div>

                           <div className="flex items-center justify-between py-3">
                              <div>
                                 <p className="font-medium text-slate-900">Search Engine Indexing</p>
                                 <p className="text-xs text-slate-500 mt-1">Allow search engines to link to your profile?</p>
                              </div>
                              <button 
                                 onClick={() => updateNestedSetting('privacy', 'searchEngineIndexing', !settings.privacy?.searchEngineIndexing)}
                                 className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors",
                                    settings.privacy?.searchEngineIndexing ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"
                                 )}
                              >
                                 {settings.privacy?.searchEngineIndexing ? "Enabled" : "Disabled"}
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* --- NOTIFICATIONS --- */}
            {activeSection === 'notifications' && (
               <div className="space-y-8">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-2">Notification Preferences</h2>
                     <p className="text-slate-500 text-sm mb-6">Choose what you get notified about.</p>

                     <div className="space-y-2">
                        <Toggle 
                           label="Comments" 
                           desc="When someone comments on your posts"
                           checked={settings.notifications?.comments ?? true}
                           onChange={(v) => updateNestedSetting('notifications', 'comments', v)}
                        />
                        <Toggle 
                           label="Tags" 
                           desc="When someone tags you in a post"
                           checked={settings.notifications?.tags ?? true}
                           onChange={(v) => updateNestedSetting('notifications', 'tags', v)}
                        />
                        <Toggle 
                           label="Friend Requests" 
                           desc="New friend requests"
                           checked={settings.notifications?.friendRequests ?? true}
                           onChange={(v) => updateNestedSetting('notifications', 'friendRequests', v)}
                        />
                        <Separator className="my-4" />
                        <h3 className="font-bold text-slate-800 pt-2">Channels</h3>
                        <Toggle 
                           label="Email Notifications" 
                           checked={settings.notifications?.email ?? true}
                           onChange={(v) => updateNestedSetting('notifications', 'email', v)}
                        />
                        <Toggle 
                           label="Push Notifications" 
                           checked={settings.notifications?.push ?? true}
                           onChange={(v) => updateNestedSetting('notifications', 'push', v)}
                        />
                     </div>
                  </div>
               </div>
            )}

            {/* --- LANGUAGE --- */}
            {activeSection === 'language' && (
               <div className="space-y-8">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-2">Language and Region</h2>
                     <p className="text-slate-500 text-sm mb-6">Manage regional settings.</p>

                     <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="font-medium text-slate-900">Display Language</p>
                              <p className="text-xs text-slate-500">Buttons, titles, and other text.</p>
                           </div>
                           <select 
                              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700"
                              value={settings.language || 'English (US)'}
                              onChange={(e) => updateRootSetting('language', e.target.value)}
                           >
                              <option>English (US)</option>
                              <option>Español</option>
                              <option>Français</option>
                              <option>Deutsch</option>
                              <option>中文 (Simplified)</option>
                           </select>
                        </div>
                     </div>
                  </div>
               </div>
            )}

         </Card>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Delete Account
               </DialogTitle>
               <DialogDescription>
                  This action is permanent and cannot be undone. To prevent accidental deletion, you must type <span className="font-bold text-slate-900">DELETE</span> below.
               </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <Input 
                  placeholder="Type DELETE"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className={cn("font-bold tracking-wider", deleteConfirmationText === 'DELETE' ? "border-red-500 focus:ring-red-500 text-red-600" : "")}
               />
               <Input 
                  type="password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
               />
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
               <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount} 
                  disabled={loading || !deletePassword || deleteConfirmationText !== 'DELETE'}
               >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Permanently"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
};
