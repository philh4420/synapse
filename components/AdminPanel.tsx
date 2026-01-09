
import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, Unlock, Save, AlertTriangle, 
  Activity, Users, CheckCircle2, Globe, FileText, BarChart3, 
  AlertOctagon, UserX, Check, LayoutDashboard, Flag, Settings, 
  ScrollText, Search, MoreHorizontal, Ban, Crown, Trash2, Megaphone
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';
import { 
  doc, getDoc, setDoc, collection, getCountFromServer, query, where, 
  onSnapshot, updateDoc, getDocs, addDoc, serverTimestamp, limit, orderBy 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { Report, UserProfile, AdminLog, SiteSettings } from '../types';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow, format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/DropdownMenu";

// --- Sub-Components ---

const StatCard: React.FC<{ 
  icon: any, 
  label: string, 
  value: string, 
  subtext: string, 
  color: string, 
  bgColor: string 
}> = ({ icon: Icon, label, value, subtext, color, bgColor }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all">
      <div>
         <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{label}</p>
         <h3 className="text-3xl font-black text-slate-900 mt-2">{value}</h3>
         <p className="text-slate-400 text-xs mt-1 font-medium">{subtext}</p>
      </div>
      <div className={cn("p-3 rounded-xl", bgColor)}>
          <Icon className={cn("w-6 h-6", color)} />
      </div>
  </div>
);

// --- Main Admin Panel ---

export const AdminPanel: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'moderation' | 'settings' | 'logs'>('dashboard');
  
  // Data States
  const [stats, setStats] = useState({ userCount: 0, postCount: 0, postsToday: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ signupEnabled: true });
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'error'>('info');

  // --- Log Action Helper ---
  const logAction = async (action: string, target: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'admin_logs'), {
        adminId: user.uid,
        adminName: userProfile?.displayName || 'Admin',
        action,
        target,
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error("Failed to log", e); }
  };

  // --- Initial Data Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Stats
        const usersColl = collection(db, 'users');
        const userSnapshot = await getCountFromServer(usersColl);
        const postsColl = collection(db, 'posts');
        const postSnapshot = await getCountFromServer(postsColl);
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayQuery = query(postsColl, where('timestamp', '>=', startOfDay));
        const todaySnapshot = await getCountFromServer(todayQuery);

        setStats({
          userCount: userSnapshot.data().count,
          postCount: postSnapshot.data().count,
          postsToday: todaySnapshot.data().count
        });

        // Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'site'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data() as SiteSettings;
          setSettings(data);
          if (data.announcement) {
             setAnnouncementText(data.announcement.message);
             setAnnouncementType(data.announcement.type);
          }
        }

      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Real-time Listeners based on Tab ---
  useEffect(() => {
    // 1. Reports Listener
    const qReports = query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const unsubReports = onSnapshot(qReports, async (snapshot) => {
        const reportsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Report[];
        // Hydrate
        const hydrated = await Promise.all(reportsData.map(async (r) => {
            const rptSnap = await getDoc(doc(db, 'users', r.reporterId));
            const rpdSnap = await getDoc(doc(db, 'users', r.reportedId));
            return {
                ...r,
                reporter: rptSnap.exists() ? rptSnap.data() as UserProfile : undefined,
                reported: rpdSnap.exists() ? rpdSnap.data() as UserProfile : undefined
            };
        }));
        setReports(hydrated);
    });

    // 2. Users Listener (Limited to 50 for performance in this demo)
    const qUsers = query(collection(db, 'users'), limit(50)); 
    // In production, implement real pagination or search-based fetching
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setUsersList(snapshot.docs.map(d => d.data() as UserProfile));
    });

    // 3. Logs Listener
    const qLogs = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(20));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdminLog)));
    });

    return () => { unsubReports(); unsubUsers(); unsubLogs(); };
  }, []);

  // --- Actions ---

  const handleToggleSignup = async () => {
    const newState = !settings.signupEnabled;
    setSettings(prev => ({ ...prev, signupEnabled: newState }));
    await setDoc(doc(db, 'settings', 'site'), { signupEnabled: newState }, { merge: true });
    await logAction('Toggle Signup', newState ? 'Enabled' : 'Disabled');
    toast(`Signups ${newState ? 'Enabled' : 'Disabled'}`, "success");
  };

  const handleAnnouncementSave = async () => {
     const announcement = announcementText ? {
        enabled: true,
        message: announcementText,
        type: announcementType
     } : { enabled: false, message: '', type: 'info' };
     
     await setDoc(doc(db, 'settings', 'site'), { announcement }, { merge: true });
     await logAction('Update Announcement', announcementText ? 'Set Banner' : 'Cleared Banner');
     toast("Announcement updated", "success");
  };

  const handleBanUser = async (targetUid: string, currentStatus: boolean | undefined) => {
     if (!targetUid) return;
     const newStatus = !currentStatus;
     try {
        await updateDoc(doc(db, 'users', targetUid), { isBanned: newStatus });
        await logAction(newStatus ? 'Ban User' : 'Unban User', targetUid);
        toast(`User ${newStatus ? 'Banned' : 'Unbanned'}`, "success");
     } catch (e) { toast("Action failed", "error"); }
  };

  const handleRoleChange = async (targetUid: string, currentRole: string | undefined) => {
     if (targetUid === user?.uid) {
        toast("You cannot change your own role.", "error");
        return;
     }
     const newRole = currentRole === 'admin' ? 'user' : 'admin';
     if (confirm(`Change role to ${newRole}?`)) {
        try {
           await updateDoc(doc(db, 'users', targetUid), { role: newRole });
           await logAction('Change Role', `${targetUid} -> ${newRole}`);
           toast("Role updated", "success");
        } catch (e) { toast("Failed to change role", "error"); }
     }
  };

  const resolveReport = async (reportId: string, action: 'resolve' | 'dismiss') => {
     try {
        await updateDoc(doc(db, 'reports', reportId), { status: action === 'resolve' ? 'resolved' : 'dismissed' });
        await logAction('Resolve Report', `${reportId} (${action})`);
        toast(`Report ${action}d`, "success");
     } catch (e) { toast("Error updating report", "error"); }
  };

  // Filter Users
  const filteredUsers = usersList.filter(u => 
     u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (userProfile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <Shield className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label }: any) => (
     <button
        onClick={() => setActiveTab(id)}
        className={cn(
           "flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold transition-all text-sm mb-1",
           activeTab === id 
             ? "bg-synapse-600 text-white shadow-md shadow-synapse-500/30" 
             : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        )}
     >
        <Icon className="w-5 h-5" />
        {label}
     </button>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-slate-50/50 rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
       
       {/* Sidebar */}
       <div className="w-full lg:w-64 bg-white border-r border-slate-200 p-4 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-3 px-2 mb-8 mt-2">
             <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="text-white w-5 h-5" />
             </div>
             <span className="font-black text-slate-900 text-lg tracking-tight">Admin Suite</span>
          </div>
          
          <div className="space-y-1 flex-1">
             <NavItem id="dashboard" icon={LayoutDashboard} label="Overview" />
             <NavItem id="users" icon={Users} label="User Management" />
             <NavItem id="moderation" icon={Flag} label="Moderation" />
             <NavItem id="settings" icon={Settings} label="System Settings" />
             <NavItem id="logs" icon={ScrollText} label="Audit Logs" />
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100">
             <div className="flex items-center gap-3 px-3">
                <Avatar className="h-9 w-9">
                   <AvatarImage src={userProfile?.photoURL || ''} />
                   <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div className="flex-col flex">
                   <span className="text-sm font-bold text-slate-900 line-clamp-1">{userProfile?.displayName}</span>
                   <span className="text-[10px] uppercase font-bold text-indigo-600">Super Admin</span>
                </div>
             </div>
          </div>
       </div>

       {/* Content Area */}
       <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50">
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div>
                   <h2 className="text-2xl font-black text-slate-900">Dashboard</h2>
                   <p className="text-slate-500">Platform overview and health status.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <StatCard icon={Users} label="Total Users" value={stats.userCount.toLocaleString()} subtext="Active Accounts" color="text-blue-600" bgColor="bg-blue-100" />
                   <StatCard icon={FileText} label="Total Content" value={stats.postCount.toLocaleString()} subtext="Posts Published" color="text-purple-600" bgColor="bg-purple-100" />
                   <StatCard icon={BarChart3} label="Daily Activity" value={stats.postsToday.toLocaleString()} subtext="Posts Today" color="text-emerald-600" bgColor="bg-emerald-100" />
                   <StatCard icon={AlertOctagon} label="Reports" value={reports.length.toString()} subtext="Pending Review" color="text-rose-600" bgColor="bg-rose-100" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <Card className="p-6 border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> System Health</h3>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center p-3 bg-green-50 border border-green-100 rounded-xl">
                            <span className="text-sm font-medium text-green-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Database Connection</span>
                            <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-1 rounded">Healthy</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-green-50 border border-green-100 rounded-xl">
                            <span className="text-sm font-medium text-green-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Auth Services</span>
                            <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-1 rounded">Operational</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Globe className="w-4 h-4" /> Client Version</span>
                            <span className="text-xs font-bold text-slate-500">v2.0.26</span>
                         </div>
                      </div>
                   </Card>

                   <Card className="p-6 border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><ScrollText className="w-5 h-5 text-indigo-500" /> Recent Logs</h3>
                      <div className="space-y-2">
                         {logs.slice(0, 5).map(log => (
                            <div key={log.id} className="text-sm flex justify-between py-2 border-b border-slate-100 last:border-0">
                               <div>
                                  <span className="font-bold text-slate-800">{log.action}</span>
                                  <span className="text-slate-500 mx-1">by</span>
                                  <span className="text-indigo-600">{log.adminName}</span>
                               </div>
                               <span className="text-xs text-slate-400">{formatDistanceToNow(log.timestamp?.toDate ? log.timestamp.toDate() : new Date())} ago</span>
                            </div>
                         ))}
                         {logs.length === 0 && <p className="text-sm text-slate-400 italic">No logs yet.</p>}
                      </div>
                   </Card>
                </div>
             </div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div>
                      <h2 className="text-2xl font-black text-slate-900">User Management</h2>
                      <p className="text-slate-500">Manage accounts, roles, and bans.</p>
                   </div>
                   <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <Input 
                         placeholder="Search users..." 
                         value={userSearch}
                         onChange={(e) => setUserSearch(e.target.value)}
                         className="pl-9 bg-white"
                      />
                   </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                         <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                               <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                               <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(u => (
                               <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                           <AvatarImage src={u.photoURL || ''} />
                                           <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                           <div className="font-bold text-slate-900">{u.displayName}</div>
                                           <div className="text-xs text-slate-500">{u.email}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <span className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-bold border",
                                        u.role === 'admin' 
                                           ? "bg-purple-50 text-purple-700 border-purple-200" 
                                           : "bg-slate-100 text-slate-600 border-slate-200"
                                     )}>
                                        {u.role || 'user'}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4">
                                     {u.isBanned ? (
                                        <span className="flex items-center gap-1.5 text-red-600 font-bold text-xs"><Ban className="w-3 h-3" /> Banned</span>
                                     ) : (
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs"><Check className="w-3 h-3" /> Active</span>
                                     )}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-slate-500">
                                     {u.createdAt ? format(u.createdAt.toDate(), 'MMM d, yyyy') : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                           <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                           <DropdownMenuSeparator />
                                           <DropdownMenuItem onClick={() => handleRoleChange(u.uid, u.role)}>
                                              {u.role === 'admin' ? <><UserX className="w-4 h-4 mr-2" /> Demote to User</> : <><Crown className="w-4 h-4 mr-2" /> Promote to Admin</>}
                                           </DropdownMenuItem>
                                           <DropdownMenuItem onClick={() => handleBanUser(u.uid, u.isBanned)} className={u.isBanned ? "text-green-600" : "text-red-600"}>
                                              {u.isBanned ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Unban User</> : <><Ban className="w-4 h-4 mr-2" /> Ban User</>}
                                           </DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {/* MODERATION */}
          {activeTab === 'moderation' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div>
                   <h2 className="text-2xl font-black text-slate-900">Moderation Queue</h2>
                   <p className="text-slate-500">Review reported content and take action.</p>
                </div>

                {reports.length === 0 ? (
                   <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                         <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">All caught up!</h3>
                      <p className="text-slate-500 mt-2">No pending reports found.</p>
                   </div>
                ) : (
                   <div className="grid gap-4">
                      {reports.map(report => (
                         <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                               <div className="flex items-center gap-3">
                                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Report</span>
                                  <span className="text-sm text-slate-400">{formatDistanceToNow(report.timestamp?.toDate ? report.timestamp.toDate() : new Date())} ago</span>
                               </div>
                               
                               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                  <p className="text-sm font-bold text-slate-900 mb-1">Reason: <span className="text-red-600">{report.reason}</span></p>
                                  <div className="flex items-center gap-2 mt-3 text-sm">
                                     <span className="text-slate-500">Reporter:</span>
                                     <div className="flex items-center gap-1 font-medium text-slate-700">
                                        <Avatar className="h-5 w-5"><AvatarImage src={report.reporter?.photoURL || ''} /></Avatar>
                                        {report.reporter?.displayName || 'Unknown'}
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-sm">
                                     <span className="text-slate-500">Target User:</span>
                                     <div className="flex items-center gap-1 font-medium text-slate-700">
                                        <Avatar className="h-5 w-5"><AvatarImage src={report.reported?.photoURL || ''} /></Avatar>
                                        {report.reported?.displayName || 'Unknown'}
                                     </div>
                                  </div>
                               </div>
                            </div>
                            
                            <div className="flex flex-col justify-center gap-2 min-w-[140px]">
                               <Button variant="destructive" onClick={() => handleBanUser(report.reportedId, false)}>
                                  <Ban className="w-4 h-4 mr-2" /> Ban User
                               </Button>
                               <Button variant="outline" onClick={() => resolveReport(report.id, 'resolve')}>
                                  <Check className="w-4 h-4 mr-2" /> Resolve
                               </Button>
                               <Button variant="ghost" onClick={() => resolveReport(report.id, 'dismiss')}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Dismiss
                               </Button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div>
                   <h2 className="text-2xl font-black text-slate-900">System Settings</h2>
                   <p className="text-slate-500">Global configuration for Synapse.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 max-w-3xl">
                   <Card className="p-6 border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                         <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-500" /> Access Control</h3>
                            <p className="text-sm text-slate-500">Manage user registration.</p>
                         </div>
                         <button 
                            onClick={handleToggleSignup}
                            className={cn(
                               "relative w-14 h-7 rounded-full transition-colors duration-300",
                               settings.signupEnabled ? "bg-emerald-500" : "bg-slate-300"
                            )}
                         >
                            <span className={cn("absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300", settings.signupEnabled ? "translate-x-7" : "translate-x-0")} />
                         </button>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl text-sm border border-slate-100">
                         Status: <span className={cn("font-bold", settings.signupEnabled ? "text-emerald-600" : "text-red-600")}>{settings.signupEnabled ? "Registrations Open" : "Registrations Closed"}</span>
                      </div>
                   </Card>

                   <Card className="p-6 border-slate-200">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4"><Megaphone className="w-5 h-5 text-indigo-500" /> Global Announcement</h3>
                      <div className="space-y-4">
                         <div>
                            <label className="text-sm font-bold text-slate-700 mb-1 block">Banner Message</label>
                            <Input 
                               placeholder="e.g. Scheduled maintenance at midnight..." 
                               value={announcementText}
                               onChange={(e) => setAnnouncementText(e.target.value)}
                            />
                         </div>
                         <div>
                            <label className="text-sm font-bold text-slate-700 mb-1 block">Type</label>
                            <div className="flex gap-2">
                               {['info', 'warning', 'error'].map(t => (
                                  <button
                                     key={t}
                                     onClick={() => setAnnouncementType(t as any)}
                                     className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-bold capitalize border",
                                        announcementType === t 
                                           ? "bg-slate-900 text-white border-slate-900" 
                                           : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                     )}
                                  >
                                     {t}
                                  </button>
                               ))}
                            </div>
                         </div>
                         <div className="flex justify-end pt-2">
                            <Button onClick={handleAnnouncementSave}>Save Banner</Button>
                         </div>
                      </div>
                   </Card>
                </div>
             </div>
          )}

          {/* LOGS */}
          {activeTab === 'logs' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div>
                   <h2 className="text-2xl font-black text-slate-900">Audit Logs</h2>
                   <p className="text-slate-500">Record of administrative actions.</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                         <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                               <td className="px-6 py-3 font-bold text-slate-900">{log.adminName}</td>
                               <td className="px-6 py-3 text-sm font-medium text-indigo-600">{log.action}</td>
                               <td className="px-6 py-3 text-sm text-slate-600 font-mono">{log.target}</td>
                               <td className="px-6 py-3 text-sm text-slate-500">{format(log.timestamp?.toDate ? log.timestamp.toDate() : new Date(), 'MMM d, h:mm a')}</td>
                            </tr>
                         ))}
                         {logs.length === 0 && (
                            <tr>
                               <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No logs recorded yet.</td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

       </div>
    </div>
  );
};
