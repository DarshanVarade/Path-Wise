import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isNewUser: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setIsNewUser: (value: boolean) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to format Supabase errors into user-friendly messages
const formatAuthError = (error: any): string => {
  if (!error) return 'An unexpected error occurred';

  const errorMessage = error.message || '';
  const errorCode = error.code || '';

  // Handle specific error codes and messages
  switch (errorCode) {
    case 'invalid_credentials':
      return 'Invalid email or password. Please check your credentials and try again.';
    
    case 'user_already_exists':
    case 'email_address_already_exists':
      return 'An account with this email already exists. Please sign in instead or use a different email.';
    
    case 'weak_password':
      return 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
    
    case 'invalid_email':
      return 'Please enter a valid email address.';
    
    case 'email_not_confirmed':
      return 'Please check your email and click the confirmation link before signing in.';
    
    case 'too_many_requests':
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    
    case 'signup_disabled':
      return 'New user registration is currently disabled. Please contact support.';
    
    case 'email_address_invalid':
      return 'The email address format is invalid. Please enter a valid email.';
    
    case 'password_too_short':
      return 'Password must be at least 6 characters long.';
    
    case 'user_not_found':
      return 'No account found with this email address. Please sign up first.';
    
    case 'session_not_found':
      return 'Your session has expired. Please sign in again.';
    
    case 'refresh_token_not_found':
      return 'Authentication expired. Please sign in again.';
    
    case 'invalid_request':
      return 'Invalid request. Please check your information and try again.';
    
    case 'network_error':
      return 'Network connection error. Please check your internet connection and try again.';
    
    default:
      // Handle common error message patterns
      if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        return 'Invalid email or password. Please check your credentials and try again.';
      }
      
      if (errorMessage.toLowerCase().includes('user already registered')) {
        return 'An account with this email already exists. Please sign in instead.';
      }
      
      if (errorMessage.toLowerCase().includes('email not confirmed')) {
        return 'Please check your email and click the confirmation link before signing in.';
      }
      
      if (errorMessage.toLowerCase().includes('weak password')) {
        return 'Password is too weak. Please use at least 6 characters.';
      }
      
      if (errorMessage.toLowerCase().includes('invalid email')) {
        return 'Please enter a valid email address.';
      }
      
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('network')) {
        return 'Connection timeout. Please check your internet connection and try again.';
      }
      
      if (errorMessage.toLowerCase().includes('rate limit')) {
        return 'Too many attempts. Please wait a few minutes before trying again.';
      }
      
      if (errorMessage.toLowerCase().includes('database')) {
        return 'Database connection error. Please try again in a moment.';
      }
      
      // Return the original message if it's user-friendly, otherwise a generic message
      if (errorMessage && errorMessage.length < 100 && !errorMessage.includes('Error:')) {
        return errorMessage;
      }
      
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        setError(null);
        
        // Get initial session with increased timeout (45 seconds)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout. Please check your internet connection and try refreshing the page.')), 45000)
        );

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setError(formatAuthError(error));
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          console.log('Session found:', !!session?.user);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Fetch profile immediately after setting user
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setError(formatAuthError(error));
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.email);
      
      try {
        setError(null);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only set isNewUser flag for SIGNED_UP event
          if (event === 'SIGNED_UP') {
            setIsNewUser(true);
          }
          // Fetch profile immediately when user signs in
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setIsNewUser(false);
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('Auth state change error:', error);
        setError(formatAuthError(error));
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Use increased timeout (45 seconds) and maybeSingle() to handle missing profiles
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout. Please try refreshing the page.')), 45000)
      );

      const { data, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Error fetching profile:', error);
        setError(formatAuthError(error));
        setProfile(null);
      } else if (data) {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
        setError(null);
      } else {
        console.log('No profile found for user, this is normal for new users');
        setProfile(null);
      }
    } catch (error: any) {
      console.error('Profile fetch failed:', error);
      setError(formatAuthError(error));
      setProfile(null);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      setError(null);
      setIsNewUser(true); // Set flag for new user
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        throw error;
      }
      
      // Check if user was created successfully
      if (!data.user) {
        throw new Error('Failed to create user account. Please try again.');
      }
      
    } catch (error: any) {
      setIsNewUser(false);
      console.error('Sign up error:', error);
      setError(formatAuthError(error));
      throw new Error(formatAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      setIsNewUser(false); // Clear flag for existing user
      console.log('Signing in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.user) {
        throw new Error('Sign in failed. Please try again.');
      }
      
      console.log('Sign in successful, user:', data.user?.email);
      
      // Wait a moment for the auth state change to trigger
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      setLoading(false);
      console.error('Sign in error:', error);
      setError(formatAuthError(error));
      throw new Error(formatAuthError(error));
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setIsNewUser(false);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(formatAuthError(error));
      throw new Error(formatAuthError(error));
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      setError(null);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }
      
      // Refresh profile
      await fetchProfile(user.id);
    } catch (error: any) {
      console.error('Update profile error:', error);
      setError(formatAuthError(error));
      throw new Error(formatAuthError(error));
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    profile,
    loading,
    isNewUser,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    setIsNewUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};