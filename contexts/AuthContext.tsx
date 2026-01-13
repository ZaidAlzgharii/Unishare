import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

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
    if (!isSupabaseConfigured) return; // Skip if mocking

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
          name: data.name || email.split('@')[0],
          role: (data.role as UserRole) || 'student',
          avatar: '', // Generic icon used in UI
          joinedAt: joinedAt || new Date().toISOString(),
          trustPoints: data.trust_points || 0
        });
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const metaName = authUser?.user_metadata?.name || email.split('@')[0];
        const metaRole = authUser?.user_metadata?.role || 'student';
        
        setUser({
            id: userId,
            name: metaName,
            role: metaRole,
            avatar: '', // Generic icon used in UI
            joinedAt: joinedAt || new Date().toISOString(),
            trustPoints: 0
        });
      }
    } catch (e) {
      console.error("Error fetching profile", e);
      setUser({
          id: userId,
          name: email.split('@')[0],
          role: 'student',
          avatar: '',
          joinedAt: createdAt || new Date().toISOString(),
          trustPoints: 0
      });
    }
  };

  useEffect(() => {
    // MOCK AUTH CHECK
    if (!isSupabaseConfigured) {
        const savedUser = localStorage.getItem('unishare_mock_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
        return;
    }

    // REAL SUPABASE AUTH CHECK
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!, session.user.created_at);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (!user || user.id !== session.user.id) {
            fetchProfile(session.user.id, session.user.email!, session.user.created_at);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    // MOCK LOGIN
    if (!isSupabaseConfigured) {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));
        
        // Simple mock validation (accept any non-empty input for demo)
        const mockUser: User = {
            id: 'mock-user-123',
            name: email.split('@')[0],
            role: email.includes('admin') ? 'admin' : 'student',
            avatar: '',
            joinedAt: new Date().toISOString(),
            trustPoints: 50
        };
        
        localStorage.setItem('unishare_mock_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return { success: true };
    }

    // REAL LOGIN
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass.trim(),
    });
    
    if (error) {
        console.error("Login failed:", error.message);
        return { success: false, message: error.message };
    }
    
    return { success: true };
  };

  const register = async (name: string, email: string, pass: string, role: UserRole): Promise<RegisterResult> => {
    // MOCK REGISTER
    if (!isSupabaseConfigured) {
        await new Promise(r => setTimeout(r, 800));
        const mockUser: User = {
            id: `mock-${Date.now()}`,
            name: name,
            role: role,
            avatar: '',
            joinedAt: new Date().toISOString(),
            trustPoints: 0
        };
        localStorage.setItem('unishare_mock_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return { success: true, emailConfirmationRequired: false };
    }

    // REAL REGISTER
    try {
        const cleanName = name.trim();

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass.trim(),
          options: {
            data: {
              name: cleanName,
              role: role,
              avatar_url: ''
            }
          }
        });

        if (error) {
            console.error("Registration error:", error.message);
            return { success: false, message: error.message };
        }
        
        if (data.user && !data.session) {
            return { 
                success: true,
                emailConfirmationRequired: true, 
                message: "Registration successful. Please check your email for the OTP code." 
            };
        }

        if (data.user && data.session) {
            setUser({
                id: data.user.id,
                name: cleanName,
                role,
                avatar: '',
                joinedAt: data.user.created_at || new Date().toISOString(),
                trustPoints: 0
            });
            return { success: true, emailConfirmationRequired: false };
        }
        
        return { success: false, message: "Unknown error: User data not returned." };
    } catch (err: any) {
        return { success: false, message: err.message || "An unexpected error occurred." };
    }
  };

  const verifyEmail = async (email: string, token: string): Promise<{ success: boolean; message?: string }> => {
    if (!isSupabaseConfigured) return { success: true };

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
    if (!isSupabaseConfigured) return { success: true };

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
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    } else {
        localStorage.removeItem('unishare_mock_user');
    }
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