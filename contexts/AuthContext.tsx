import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface RegisterResult {
  success: boolean;
  message?: string;
  emailConfirmationRequired?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, pass: string, role: UserRole) => Promise<RegisterResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user profile details after auth state changes
  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUser({
          id: userId,
          name: data.name,
          role: data.role as UserRole,
          avatar: data.avatar_url || ''
        });
      } else {
        // Fallback: If profile row is missing (trigger delay), check Auth Metadata
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const metaName = authUser?.user_metadata?.name || email.split('@')[0];
        const metaRole = authUser?.user_metadata?.role || 'student';
        
        setUser({
            id: userId,
            name: metaName,
            role: metaRole,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${metaName.replace(' ', '')}`
        });
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
        console.error("Login failed:", error.message);
        return { success: false, message: error.message };
    }
    return { success: true };
  };

  const register = async (name: string, email: string, pass: string, role: UserRole): Promise<RegisterResult> => {
    try {
        // 1. Sign up auth user with metadata
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              name: name,
              role: role,
              avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${name.replace(' ', '')}`
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (error) {
            console.error("Registration error:", error.message);
            return { success: false, message: error.message };
        }
        
        // If user object exists but session is null, it means Email Confirmation is ON
        if (data.user && !data.session) {
            return { 
                success: true,
                emailConfirmationRequired: true, 
                message: "Registration successful. Please check your email to verify your account." 
            };
        }

        // If auto-confirmed (Email confirmation disabled in Supabase)
        if (data.user && data.session) {
            setUser({
                id: data.user.id,
                name,
                role,
                avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${name.replace(' ', '')}`
            });
            return { success: true, emailConfirmationRequired: false };
        }
        
        return { success: false, message: "Unknown error: User data not returned." };
    } catch (err: any) {
        return { success: false, message: err.message || "An unexpected error occurred." };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within a AuthProvider');
  return context;
};