
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Get current session
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        toast({
          title: 'Error fetching session',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    
    getSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };
  
  const signup = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Account created successfully',
        description: 'Please check your email to verify your account.',
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Logout successful',
        description: 'You have been logged out',
      });
    } catch (error: any) {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  return {
    user,
    session,
    loading,
    login,
    signup,
    logout,
  };
}

// Route guard hook
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location]);
  
  return { user, loading };
}
