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
  verifyEmail: (email: string, token: string) => Promise<{ success: boolean; message?: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user profile details after auth state changes
  const fetchProfile = async (userId: string, email: string, createdAt?: string) => {
    try {
      let joinedAt = createdAt;
      
      // If we don't have createdAt passed in, fetch it from auth API
      if (!joinedAt) {
          const { data: { user } } = await supabase.auth.getUser();
          joinedAt = user?.created_at;
      }

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
          avatar: data.avatar_url || '',
          joinedAt: joinedAt
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
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${metaName.replace(' ', '')}`,
            joinedAt: joinedAt
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
        fetchProfile(session.user.id, session.user.email!, session.user.created_at);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!, session.user.created_at);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass.trim(),
    });
    
    if (error) {
        console.error("Login failed:", error.message);
        // Supabase returns "Email not confirmed" if verification is pending
        return { success: false, message: error.message };
    }
    
    return { success: true };
  };

  const register = async (name: string, email: string, pass: string, role: UserRole): Promise<RegisterResult> => {
    try {
        // 1. Sign up auth user with metadata
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass.trim(),
          options: {
            data: {
              name: name.trim(),
              role: role,
              avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${name.replace(' ', '')}`
            }
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
                message: "Registration successful. Please check your email for the OTP code." 
            };
        }

        // If auto-confirmed (Email confirmation disabled in Supabase)
        if (data.user && data.session) {
            setUser({
                id: data.user.id,
                name,
                role,
                avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${name.replace(' ', '')}`,
                joinedAt: data.user.created_at
            });
            return { success: true, emailConfirmationRequired: false };
        }
        
        return { success: false, message: "Unknown error: User data not returned." };
    } catch (err: any) {
        return { success: false, message: err.message || "An unexpected error occurred." };
    }
  };

  const verifyEmail = async (email: string, token: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup'
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user && data.session) {
         await fetchProfile(data.user.id, data.user.email!, data.user.created_at);
         return { success: true };
      }

      return { success: false, message: "Verification failed. Please try again." };

    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const resendOtp = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: "Code resent successfully" };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, resendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within a AuthProvider');
  return context;
};