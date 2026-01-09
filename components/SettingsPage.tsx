import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { 
  Settings, Shield, Lock, Bell, Globe, User, 
  Smartphone, Monitor, Moon, Save, ChevronRight, AlertTriangle, CheckCircle2,
  Key, Mail, Eye, EyeOff, Loader2
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Separator } from './ui/Separator';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { UserSettings } from '../types';

// Types
type SettingsSection = 'general' | 'security' | 'privacy' | 'notifications' | 'language';

export const SettingsPage: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [loading, setLoading] = useState(false);

  // General State
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  
  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Settings Object State (Optimistic UI)
  const [settings, setSettings] = useState<UserSettings>(userProfile?.settings || {
    privacyDefault: 'public',
    notifications: {
      email: true,
      push: true,
      comments: true,
      friendRequests: true,
      tags: true
    },
    loginAlerts: true,
    twoFactor: false,
    language: 'English (US)'
  });

  // --- Handlers ---

  const handleGeneralSave = async () => {
    if (!user || !displayName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName
      });
      await refreshProfile();
      toast("Profile updated successfully", "success");
    } catch (e) {
      toast("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
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
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      toast("Password updated successfully", "success");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/wrong-password') {
        toast("Incorrect current password", "error");
      } else {
        toast("Failed to update password. Try logging in again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any, nestedKey?: string) => {
    if (!user) return;
    
    // Optimistic Update
    const newSettings = { ...settings };
    if (nestedKey) {
      // @ts-ignore
      newSettings[key] = { ...newSettings[key], [nestedKey]: value };
    } else {
      // @ts-ignore
      newSettings[key] = value;
    }
    setSettings(newSettings);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        settings: newSettings
      });
    } catch (e) {
      toast("Failed to save setting", "error");
      // Revert would go here
    }
  };

  // --- Components ---

  const SidebarItem = ({ id, icon: Icon, label }: { id: SettingsSection, icon: any, label: string }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-300 text-left relative",
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
      
      {/* Header */}
      <div className="mb-8">
         <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Privacy</h1>
         <p className="text-slate-500 mt-1">Manage your account preferences and security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
         
         {/* Sidebar */}
         <div className="space-y-1">
            <SidebarItem id="general" icon={Settings} label="General" />
            <SidebarItem id="security" icon={Shield} label="Security and Login" />
            <SidebarItem id="privacy" icon={Lock} label="Privacy" />
            <SidebarItem id="notifications" icon={Bell} label="Notifications" />
            <SidebarItem id="language" icon={Globe} label="Language and Region" />
         </div>

         {/* Content Area */}
         <Card className="min-h-[500px] bg-white/80 backdrop-blur-xl border-white/60 p-6 lg:p-8 shadow-sm">
            
            {/* --- GENERAL SETTINGS --- */}
            {activeSection === 'general' && (
               <div className="space-y-8">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-6">General Account Settings</h2>
                     
                     <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center pb-6 border-b border-slate-100">
                           <div className="w-32 font-bold text-slate-500">Name</div>
                           <div className="flex-1">
                              <Input 
                                 value={displayName}
                                 onChange={(e) => setDisplayName(e.target.value)}
                                 className="max-w-md font-semibold text-slate-900"
                              />
                           </div>
                           <Button variant="ghost" onClick={handleGeneralSave} disabled={loading} className="text-synapse-600 font-bold">
                              Edit
                           </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center pb-6 border-b border-slate-100">
                           <div className="w-32 font-bold text-slate-500">Contact</div>
                           <div className="flex-1 flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-900">{user?.email}</span>
                              <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">Primary</span>
                           </div>
                           <Button variant="ghost" disabled className="text-slate-400">Manage</Button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center pb-6 border-b border-slate-100">
                           <div className="w-32 font-bold text-slate-500">Identity Confirmation</div>
                           <div className="flex-1">
                              <p className="text-sm text-slate-600">Confirm your identity to do things like run ads about social issues, elections or politics.</p>
                           </div>
                           <Button variant="outline" className="text-slate-700">View</Button>
                        </div>

                        <div className="flex justify-end pt-4">
                           <Button onClick={handleGeneralSave} disabled={loading} className="bg-synapse-600 text-white px-8 rounded-xl font-bold shadow-lg shadow-synapse-500/20">
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                           </Button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* --- SECURITY SETTINGS --- */}
            {activeSection === 'security' && (
               <div className="space-y-8">
                  <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-2">Security and Login</h2>
                     <p className="text-slate-500 text-sm mb-6">Manage how you log in and protect your account.</p>

                     <div className="space-y-6">
                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex items-start gap-3">
                           <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                           <div>
                              <h4 className="font-bold text-yellow-800">Check your important security settings</h4>
                              <p className="text-sm text-yellow-700 mt-1">We'll take you through some steps to help protect your account.</p>
                           </div>
                           <Button size="sm" variant="outline" className="ml-auto bg-white border-yellow-200 text-yellow-700 hover:bg-yellow-100">Checkup</Button>
                        </div>

                        <div className="pt-4">
                           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Key className="w-4 h-4" /> Change Password</h3>
                           <div className="max-w-md space-y-4">
                              <div className="relative">
                                 <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Current" 
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                 />
                              </div>
                              <div className="relative">
                                 <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="New" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                 />
                              </div>
                              <div className="relative">
                                 <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Retype new" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                 />
                              </div>
                              <div className="flex justify-between items-center">
                                 <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-sm text-synapse-600 font-bold hover:underline flex items-center gap-1"
                                 >
                                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} 
                                    {showPassword ? "Hide passwords" : "Show passwords"}
                                 </button>
                                 <Button onClick={handlePasswordChange} disabled={loading} className="bg-synapse-600 text-white rounded-xl font-bold">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Password"}
                                 </Button>
                              </div>
                           </div>
                        </div>

                        <Separator />

                        <div>
                           <h3 className="font-bold text-slate-800 mb-4">Two-Factor Authentication</h3>
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="font-medium text-slate-900">Use two-factor authentication</p>
                                 <p className="text-sm text-slate-500">We'll ask for a login code if we notice an attempted login from an unrecognized device or browser.</p>
                              </div>
                              <Toggle 
                                 label="" 
                                 checked={settings.twoFactor || false} 
                                 onChange={(v) => updateSetting('twoFactor', v)} 
                              />
                           </div>
                        </div>

                        <Separator />

                        <div>
                           <h3 className="font-bold text-slate-800 mb-4">Setting Up Extra Security</h3>
                           <Toggle 
                              label="Get alerts about unrecognized logins" 
                              desc="We'll let you know if anyone logs in from a device or browser you don't usually use."
                              checked={settings.loginAlerts || false}
                              onChange={(v) => updateSetting('loginAlerts', v)} 
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
                     <h2 className="text-xl font-bold text-slate-900 mb-2">Privacy Settings and Tools</h2>
                     <p className="text-slate-500 text-sm mb-6">Control who sees your content and how people find you.</p>

                     <div className="space-y-4">
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                           <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                              <Monitor className="w-5 h-5 text-synapse-600" /> Your Activity
                           </h3>
                           
                           <div className="flex items-center justify-between py-3 border-b border-slate-200/60">
                              <div>
                                 <p className="font-medium text-slate-900">Who can see your future posts?</p>
                                 <p className="text-xs text-slate-500 mt-1">This sets the default audience for content you share.</p>
                              </div>
                              <select 
                                 className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-synapse-500/50"
                                 value={settings.privacyDefault || 'public'}
                                 onChange={(e) => updateSetting('privacyDefault', e.target.value)}
                              >
                                 <option value="public">Public</option>
                                 <option value="friends">Friends</option>
                                 <option value="only_me">Only Me</option>
                              </select>
                           </div>

                           <div className="flex items-center justify-between py-3">
                              <div>
                                 <p className="font-medium text-slate-900">Review all your posts and things you're tagged in</p>
                              </div>
                              <Button variant="ghost" size="sm" className="bg-white border border-slate-200">Use Activity Log</Button>
                           </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                           <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                              <User className="w-5 h-5 text-synapse-600" /> How People Find and Contact You
                           </h3>
                           
                           <div className="flex items-center justify-between py-3 border-b border-slate-200/60">
                              <div>
                                 <p className="font-medium text-slate-900">Who can send you friend requests?</p>
                              </div>
                              <span className="text-sm font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">Everyone</span>
                           </div>

                           <div className="flex items-center justify-between py-3 border-b border-slate-200/60">
                              <div>
                                 <p className="font-medium text-slate-900">Who can look you up using the email address you provided?</p>
                              </div>
                              <span className="text-sm font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">Everyone</span>
                           </div>

                           <div className="flex items-center justify-between py-3">
                              <div>
                                 <p className="font-medium text-slate-900">Do you want search engines outside of Synapse to link to your profile?</p>
                              </div>
                              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">Yes</span>
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
                     <h2 className="text-xl font-bold text-slate-900 mb-2">Notification Settings</h2>
                     <p className="text-slate-500 text-sm mb-6">Choose how you receive notifications and what you get notified about.</p>

                     <div className="space-y-2">
                        <Toggle 
                           label="Comments" 
                           desc="Notify me when someone comments on my posts"
                           checked={settings.notifications?.comments ?? true}
                           onChange={(v) => updateSetting('notifications', v, 'comments')}
                        />
                        <Toggle 
                           label="Tags" 
                           desc="Notify me when someone tags me in a post"
                           checked={settings.notifications?.tags ?? true}
                           onChange={(v) => updateSetting('notifications', v, 'tags')}
                        />
                        <Toggle 
                           label="Friend Requests" 
                           desc="Notify me when I receive a friend request"
                           checked={settings.notifications?.friendRequests ?? true}
                           onChange={(v) => updateSetting('notifications', v, 'friendRequests')}
                        />
                        <Separator className="my-4" />
                        <h3 className="font-bold text-slate-800 pt-2">Delivery Methods</h3>
                        <Toggle 
                           label="Email Notifications" 
                           desc="Receive important updates via email"
                           checked={settings.notifications?.email ?? true}
                           onChange={(v) => updateSetting('notifications', v, 'email')}
                        />
                        <Toggle 
                           label="Push Notifications" 
                           desc="Receive notifications on your device"
                           checked={settings.notifications?.push ?? true}
                           onChange={(v) => updateSetting('notifications', v, 'push')}
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
                     <p className="text-slate-500 text-sm mb-6">Manage language settings for the Synapse interface.</p>

                     <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                           <div>
                              <p className="font-medium text-slate-900">Synapse Language</p>
                              <p className="text-xs text-slate-500">The language buttons, titles, and other text appear in.</p>
                           </div>
                           <Button variant="ghost" className="text-synapse-600 font-bold">Edit</Button>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                           <div>
                              <p className="font-medium text-slate-900">Language for translations</p>
                              <p className="text-xs text-slate-500">The language we translate posts into.</p>
                           </div>
                           <select 
                              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700"
                              value={settings.language || 'English (US)'}
                              onChange={(e) => updateSetting('language', e.target.value)}
                           >
                              <option>English (US)</option>
                              <option>Español</option>
                              <option>Français</option>
                              <option>Deutsch</option>
                           </select>
                        </div>
                     </div>
                  </div>
               </div>
            )}

         </Card>
      </div>
    </div>
  );
};