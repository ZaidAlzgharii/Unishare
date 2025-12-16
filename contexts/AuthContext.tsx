import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded valid users for the demo
const MOCK_DB = [
  { 
    email: 'student@unishare.com', 
    pass: 'student123', 
    user: { id: 'std_1', name: 'AQB Student', role: 'student', avatar: '' } as User 
  },
  { 
    email: 'admin@unishare.com', 
    pass: 'admin123', 
    user: { id: 'adm_1', name: 'Admin', role: 'admin', avatar: '' } as User 
  },
  { 
    email: 'owner@unishare.com', 
    pass: 'owner123', 
    user: { id: 'own_1', name: 'Admin', role: 'owner', avatar: '' } as User 
  },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem('unishare_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('unishare_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    await delay(1000); // Simulate network
    const account = MOCK_DB.find(u => u.email === email && u.pass === pass);
    if (account) {
      setUser(account.user);
      localStorage.setItem('unishare_user', JSON.stringify(account.user));
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, pass: string, role: UserRole): Promise<boolean> => {
    await delay(1500); // Simulate network
    // Allow any registration in demo
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      name,
      role,
      avatar: name === 'AQB Student' ? '' : `https://api.dicebear.com/9.x/avataaars/svg?seed=${name.replace(' ', '')}`
    };
    setUser(newUser);
    localStorage.setItem('unishare_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unishare_user');
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
