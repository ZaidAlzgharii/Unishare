import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, Shield, Moon, Sun, Save, LogOut, User as UserIcon, LogIn } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface NavbarProps {
  onSaveSession?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSaveSession }) => {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    addToast(t('toast_logged_out'), 'info');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
            <BookOpen className="w-5 h-5 text-primary-700 dark:text-primary-400" />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">{t('nav_brand')}</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Save Session Button (Home only) */}
          {onSaveSession && (
            <button
              onClick={onSaveSession}
              className="p-2 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block"
              title={t('tooltip_save_session')}
            >
              <Save className="w-5 h-5" />
            </button>
          )}

          {/* Admin Link */}
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <Link 
              to="/admin" 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                location.pathname === '/admin' 
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav_admin')}</span>
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Dark Mode"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Language Toggle - Segmented Control */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700" dir="ltr">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${
                language === 'en' 
                  ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${
                language === 'ar' 
                  ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              ع
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          {/* User Section */}
          {user ? (
            <div className="flex items-center gap-3">
               <Link to="/profile" className="hidden md:flex flex-col items-end hover:opacity-80 transition">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{user.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</span>
               </Link>
               <div className="relative group">
                  <Link to="/profile" className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                    )}
                  </Link>
                  {/* Logout Tooltip/Button */}
                  <div className="absolute top-full right-0 mt-2 w-40 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50 flex flex-col">
                     <Link to="/profile" className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                         <UserIcon className="w-4 h-4" />
                         {t('nav_profile')}
                     </Link>
                     <button 
                       onClick={handleLogout}
                       className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                     >
                       <LogOut className="w-4 h-4" />
                       {t('nav_logout')}
                     </button>
                  </div>
               </div>
            </div>
          ) : (
            <Link 
              to="/login"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition shadow-sm shadow-primary-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav_login')}</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;