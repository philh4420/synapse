import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Save, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

export const AdminPanel: React.FC = () => {
  const { userProfile } = useAuth();
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'site');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSignupEnabled(settingsSnap.data().signupEnabled);
        } else {
          // If document doesn't exist, assume enabled and create it
          await setDoc(settingsRef, { signupEnabled: true });
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        signupEnabled: signupEnabled
      }, { merge: true });
      setMessage({ type: 'success', text: 'Settings updated successfully.' });
    } catch (err) {
      console.error("Error saving settings:", err);
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
        <Shield className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">You do not have permission to view this area.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <div className="bg-synapse-50 p-3 rounded-2xl">
            <Shield className="w-8 h-8 text-synapse-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Control Panel</h1>
            <p className="text-slate-500">Manage global settings for Synapse</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-100 rounded-xl"></div>
            <div className="h-12 bg-slate-100 rounded-xl"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {signupEnabled ? <Unlock className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-red-500" />}
                    User Registration
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md">
                    Control whether new users can sign up for Synapse. If disabled, the registration form on the landing page will be blocked.
                  </p>
                </div>
                
                <div 
                  onClick={() => setSignupEnabled(!signupEnabled)}
                  className={`
                    relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 
                    focus-visible:ring-synapse-500 focus-visible:ring-offset-2
                    ${signupEnabled ? 'bg-synapse-600' : 'bg-slate-200'}
                  `}
                >
                  <span
                    aria-hidden="true"
                    className={`
                      pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 
                      transition duration-200 ease-in-out
                      ${signupEnabled ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </div>
              </div>

              {!signupEnabled && (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Registration is currently <strong>CLOSED</strong>. No new users can join.</span>
                </div>
              )}
            </div>

            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} isLoading={saving} size="lg">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};