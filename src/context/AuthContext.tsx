import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch profile data with retry logic
  const fetchProfile = async (session: Session | null, retryCount = 0) => {
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        // If profile not found and we haven't retried too many times, wait and retry
        // This handles the race condition where the DB trigger hasn't finished creating the profile yet
        if (retryCount < 3) {
          console.log(`Profile not found, retrying (${retryCount + 1}/3)...`);
          setTimeout(() => fetchProfile(session, retryCount + 1), 1000);
          return;
        }
        
        console.error('Error fetching profile after retries:', error);
        // Fallback only if absolutely necessary
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'Utilisateur',
          role: 'WRITER', // Default fallback
        });
      } else {
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          avatar: profile.avatar_url,
        });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      // Only set loading to false if we are done retrying or if we have a result
      if (retryCount === 3 || (session?.user)) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Reset loading state on auth change to ensure UI updates correctly
      if (_event === 'SIGNED_IN') setLoading(true);
      fetchProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
