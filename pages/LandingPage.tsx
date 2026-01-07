import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, getDocs, limit, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, User as UserIcon, ArrowRight, Activity, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Default Assets
const DEFAULT_COVER_URL = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop";

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
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'site');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSignupEnabled(settingsSnap.data().signupEnabled);
        }
      } catch (err) {
        console.log("Settings not found, assuming defaults.");
      }
    };
    checkSettings();
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
        await refreshProfile(); // Ensure profile is loaded immediately
      } else {
        if (!signupEnabled) {
          throw new Error("Signups are currently closed by the administrator.");
        }

        // Create Authentication User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Generate Default Avatar based on name
        const photoURL = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

        // Check for existing users to determine role (First user is admin)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(1));
        const snapshot = await getDocs(q);
        const role = snapshot.empty ? 'admin' : 'user';

        // Create User Document in Firestore with Defaults
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
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Brand / Visual */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-synapse-950 text-white items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-synapse-900/90 via-synapse-800/80 to-purple-900/90"></div>
        
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">
              <Activity className="text-synapse-400 w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white">Synapse</h1>
          </div>
          <h2 className="text-4xl font-semibold mb-6 leading-tight">
            Connect at the speed of thought.
          </h2>
          <p className="text-lg text-synapse-100 leading-relaxed mb-8">
            Experience the next evolution of social networking. A professional, clutter-free space designed for everyone to connect, share, and grow together.
          </p>
          
          <div className="flex gap-4 items-center text-sm font-medium text-synapse-200">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <img key={i} className="w-10 h-10 rounded-full border-2 border-synapse-900" src={`https://picsum.photos/seed/${i * 123}/100/100`} alt="User" />
              ))}
            </div>
            <span>Become a founding member</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute top-0 right-0 p-8">
          <p className="text-sm text-slate-500">
            {isReset ? (
              <button 
                onClick={toggleMode}
                className="flex items-center font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign in
              </button>
            ) : (
              <>
                {isLogin ? "New to Synapse?" : "Already have an account?"}
                <button 
                  onClick={toggleMode}
                  className="ml-2 font-semibold text-synapse-600 hover:text-synapse-700 transition-colors"
                >
                  {isLogin ? "Create account" : "Sign in"}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
               <div className="bg-synapse-600 p-3 rounded-2xl shadow-lg">
                <Activity className="text-white w-8 h-8" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              {isReset 
                ? "Reset Password" 
                : (isLogin ? "Welcome back" : "Create your account")
              }
            </h2>
            <p className="mt-2 text-slate-500">
              {isReset
                ? "Enter your email address and we'll send you a link to reset your password."
                : (isLogin ? "Enter your credentials to access your workspace." : "Start your journey with Synapse today.")
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && !isReset && (
              <Input
                label="Full Name"
                icon={UserIcon}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!isReset && (
              <div>
                <Input
                  label="Password"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {isLogin && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => { setIsReset(true); setError(''); setSuccess(''); }}
                      className="text-sm font-medium text-synapse-600 hover:text-synapse-700 hover:underline transition-all"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isLogin && !signupEnabled && !isReset && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 text-amber-800 text-sm">
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />
                 <div>
                   <p className="font-semibold">Signups Closed</p>
                   <p className="mt-1">New registrations are currently disabled by the administrator.</p>
                 </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-600 text-sm">
                {success}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              isLoading={loading}
              disabled={!isLogin && !signupEnabled && !isReset}
            >
              {isReset 
                ? "Send Reset Link" 
                : (isLogin ? "Sign In" : "Create Account")
              }
              {!loading && !isReset && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-50 text-slate-400">Secure 2026 Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};