
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  serverTimestamp, 
  getDocs, 
  query, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Button } from '../components/ui/Button';
import { Mail, Lock, User as UserIcon, ArrowRight, Activity, ArrowLeft, AlertCircle, Info, Megaphone, AlertTriangle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SiteSettings } from '../types';
import { cn } from '../lib/utils';

// Default Assets
const DEFAULT_COVER_URL = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop";

// --- CONFIGURATION ---
const EARLY_ADOPTERS_COUNT = 1; 

const DEMO_AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Mark",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Sophie"
];

export const LandingPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [announcement, setAnnouncement] = useState<SiteSettings['announcement']>(undefined);
  
  const { refreshProfile } = useAuth();

  useEffect(() => {
    // Settings Listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteSettings;
        setSignupEnabled(data.signupEnabled);
        setAnnouncement(data.announcement);
      }
    }, (err) => {
      console.warn("Settings listener warning:", err.code);
    });

    return () => {
      unsubSettings();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isReset) {
        if (!email) throw new Error("Please enter your email address.");
        await sendPasswordResetEmail(auth, email);
        setSuccess("Password reset email sent. Please check your inbox.");
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        await refreshProfile(); 
      } else {
        if (!signupEnabled) {
          throw new Error("Signups are currently closed by the administrator.");
        }

        // Create Authentication User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user) throw new Error("Failed to create user");

        // Generate Default Avatar
        const photoURL = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

        // Role Determination
        const q = query(collection(db, 'users'), limit(1));
        const snapshot = await getDocs(q);
        const role = snapshot.empty ? 'admin' : 'user';

        // Create User Profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          photoURL: photoURL,
          coverURL: DEFAULT_COVER_URL,
          role: role,
          createdAt: serverTimestamp()
        });

        // Update Auth Profile
        await updateProfile(user, {
          displayName: name,
          photoURL: photoURL
        });
        
        await refreshProfile();
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (isReset) {
      setIsReset(false);
      setIsLogin(true);
    } else {
      setIsLogin(!isLogin);
    }
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-hidden font-sans selection:bg-synapse-200 selection:text-synapse-900">
      
      {/* Global Announcement Banner */}
      {announcement?.enabled && (
        <div className="absolute top-0 left-0 right-0 z-[60] flex justify-center p-4 pointer-events-none">
            <div className={cn(
              "pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20 text-white max-w-xl w-full animate-in slide-in-from-top-4 duration-700 ease-out ring-1 ring-black/5",
              announcement.type === 'error' ? "bg-rose-600/90" : 
              announcement.type === 'warning' ? "bg-amber-500/90" : 
              "bg-synapse-600/90"
            )}>
              <div className="bg-white/20 p-1.5 rounded-full shrink-0 shadow-inner">
                  {announcement.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : 
                  announcement.type === 'warning' ? <Megaphone className="w-4 h-4" /> : 
                  <Info className="w-4 h-4" />}
              </div>
              <p className="font-medium text-sm flex-1 tracking-wide">{announcement.message}</p>
            </div>
        </div>
      )}

      {/* --- LOGO (Top Left) --- */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-1000">
         <div className="w-12 h-12 bg-synapse-600 rounded-full flex items-center justify-center shadow-lg shadow-synapse-500/40 hover:scale-105 transition-transform">
            <Activity className="text-white w-7 h-7 stroke-[3px]" />
         </div>
         <span className="text-2xl font-black text-white lg:text-slate-900 tracking-tight drop-shadow-md lg:drop-shadow-none hidden sm:block">Synapse</span>
      </div>

      {/* Left Side - Brand / Visual */}
      <div className="hidden lg:flex w-7/12 relative overflow-hidden bg-[#020617] text-white items-center justify-center p-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-synapse-900 via-[#0a0a0a] to-[#0a0a0a] z-0"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-synapse-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 max-w-2xl animate-in slide-in-from-bottom-10 fade-in duration-1000 fill-mode-both">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-bold text-synapse-300 uppercase tracking-widest mb-8 shadow-2xl">
             <Sparkles className="w-3 h-3" /> The Future of Social
          </div>
          
          <h1 className="text-6xl xl:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1] drop-shadow-2xl">
            Connect at the <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-synapse-400 via-indigo-400 to-purple-400 animate-gradient-x">speed of thought.</span>
          </h1>
          
          <p className="text-xl text-slate-400 leading-relaxed mb-10 max-w-lg font-light">
            A next-generation platform where professional networking meets social intuition. Built for the creators, thinkers, and builders of 2026.
          </p>
          
          {/* Social Proof / Stats */}
          <div className="flex items-center gap-8 pt-8 border-t border-white/10">
             <div>
                <p className="text-3xl font-bold text-white">
                  {EARLY_ADOPTERS_COUNT.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Early Adopters</p>
             </div>
             <div className="h-10 w-px bg-white/10" />
             <div>
                <p className="text-3xl font-bold text-white">100%</p>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Secure</p>
             </div>
             <div className="h-10 w-px bg-white/10" />
             <div className="flex -space-x-4">
                {DEMO_AVATARS.map((url, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0a0a] bg-slate-800 overflow-hidden shadow-lg transform hover:scale-110 transition-transform cursor-pointer">
                     <img src={url} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-6 lg:p-12 relative bg-white lg:bg-transparent">
        {/* Mobile Background */}
        <div className="absolute inset-0 bg-[#020617] lg:hidden -z-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-synapse-900/20 to-transparent lg:hidden -z-10" />
        
        {/* Desktop Glass Background for Form Area */}
        <div className="hidden lg:block absolute inset-0 bg-white/95 backdrop-blur-3xl -z-10" />

        <div className="absolute top-6 right-6 lg:top-8 lg:right-8 z-40">
          <p className="text-sm text-slate-300 lg:text-slate-500 font-medium">
            {isReset ? (
              <button onClick={toggleMode} className="flex items-center font-bold text-white lg:text-slate-700 hover:text-synapse-400 lg:hover:text-slate-900 transition-colors group">
                <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" /> Back to Sign in
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-white/10 lg:bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white/10 lg:border-slate-100">
                <span className="hidden sm:inline text-white lg:text-slate-600">{isLogin ? "New to Synapse?" : "Already have an account?"}</span>
                <button onClick={toggleMode} className="font-bold text-white lg:text-synapse-600 hover:text-synapse-300 lg:hover:text-synapse-700 transition-colors">
                  {isLogin ? "Create account" : "Sign in"}
                </button>
              </div>
            )}
          </p>
        </div>

        <div className="w-full max-w-[420px] space-y-8 z-10 animate-in slide-in-from-right-8 fade-in duration-700 fill-mode-both">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-8">
               <div className="w-16 h-16 bg-synapse-600 rounded-full flex items-center justify-center shadow-lg shadow-synapse-500/40">
                <Activity className="text-white w-9 h-9 stroke-[3px]" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white lg:text-slate-900 tracking-tight">
              {isReset ? "Reset Password" : (isLogin ? "Welcome back" : "Create your account")}
            </h2>
            <p className="mt-3 text-slate-300 lg:text-slate-500 text-lg">
              {isReset ? "Enter your email address and we'll send you a link to reset your password." : (isLogin ? "Enter your credentials to access your workspace." : "Start your journey with Synapse today.")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mt-8">
            {!isLogin && !isReset && (
              <div className="space-y-1.5">
                 <label className="text-sm font-bold text-slate-300 lg:text-slate-700 ml-1">Full Name</label>
                 <div className="relative">
                    <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-synapse-500/50 focus:border-synapse-500 transition-all shadow-sm" />
                 </div>
              </div>
            )}
            
            <div className="space-y-1.5">
               <label className="text-sm font-bold text-slate-300 lg:text-slate-700 ml-1">Email Address</label>
               <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-synapse-500/50 focus:border-synapse-500 transition-all shadow-sm" />
               </div>
            </div>

            {!isReset && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-300 lg:text-slate-700 ml-1">Password</label>
                <div className="relative">
                   <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                   <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-synapse-500/50 focus:border-synapse-500 transition-all shadow-sm" />
                </div>
                {isLogin && (
                  <div className="flex justify-end pt-1">
                    <button type="button" onClick={() => { setIsReset(true); setError(''); setSuccess(''); }} className="text-sm font-semibold text-white/80 lg:text-synapse-600 hover:text-white lg:hover:text-synapse-700 hover:underline transition-all">Forgot Password?</button>
                  </div>
                )}
              </div>
            )}

            {!isLogin && !signupEnabled && !isReset && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 text-amber-800 text-sm shadow-sm">
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />
                 <div>
                   <p className="font-bold">Signups Closed</p>
                   <p className="mt-1 opacity-90">New registrations are currently disabled by the administrator.</p>
                 </div>
              </div>
            )}

            {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in slide-in-from-top-1 flex items-start gap-2"><AlertTriangle className="w-5 h-5 shrink-0" /> {error}</div>}
            {success && <div className="p-4 rounded-2xl bg-green-50 border border-green-100 text-green-700 text-sm font-medium animate-in slide-in-from-top-1 flex items-start gap-2"><Info className="w-5 h-5 shrink-0" /> {success}</div>}

            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-synapse-500/25 bg-gradient-to-r from-synapse-600 to-indigo-600 hover:from-synapse-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]" isLoading={loading} disabled={!isLogin && !signupEnabled && !isReset}>
              {isReset ? "Send Reset Link" : (isLogin ? "Sign In" : "Create Account")}
              {!loading && !isReset && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20 lg:border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="px-4 bg-[#020617] lg:bg-white text-slate-500 lg:text-slate-400 rounded-full">Secure Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
