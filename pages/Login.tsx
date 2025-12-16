import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Mail, Lock, User, Briefcase, ArrowRight, Loader2, Info, Moon, Sun, Globe } from 'lucide-react';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password, role);
        addToast(`${t('toast_welcome')}, ${name}!`, 'success');
        navigate('/');
      } else {
        const success = await login(email, password);
        if (success) {
          addToast(t('toast_welcome'), 'success');
          navigate('/');
        } else {
          addToast(t('login_error'), 'error');
        }
      }
    } catch (error) {
      addToast('An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Utility Controls (Theme/Language) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-colors backdrop-blur-sm shadow-sm"
          title="Toggle Dark Mode"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium px-3 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition backdrop-blur-sm shadow-sm text-sm"
          >
            <Globe className="w-4 h-4" />
            <span>{language.toUpperCase()}</span>
          </button>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {isRegister ? t('btn_register') : t('login_title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {isRegister ? t('register_subtitle') || t('login_subtitle') : t('login_subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5 ml-1">{t('name_label')}</label>
                <div className="relative">
                  <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    required={isRegister}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    placeholder="AQB Student"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5 ml-1">{t('email_label')}</label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5 ml-1">{t('password_label')}</label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5 ml-1">{t('role_label')}</label>
                <div className="relative">
                  <Briefcase className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className={`w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2 mt-6 transform hover:-translate-y-0.5"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRegister ? t('btn_register') : t('btn_login')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition"
            >
              {isRegister ? t('toggle_login') : t('toggle_register')}
            </button>
          </div>
        </div>
        
        {/* Demo Credentials Footer */}
        {!isRegister && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2 font-semibold">
                    <Info className="w-3 h-3" />
                    {t('demo_credentials')}
                </div>
                <div className="grid grid-cols-1 gap-1 text-slate-600 dark:text-slate-300 font-mono">
                    <div className="flex justify-between">
                        <span>student@unishare.com</span>
                        <span className="text-slate-400">student123</span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Login;