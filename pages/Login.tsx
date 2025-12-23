import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { Mail, Lock, User, ArrowRight, Loader2, Moon, Sun, Globe, CheckCircle2, BookOpen } from 'lucide-react';

const Login: React.FC = () => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'register') {
        const result = await register(name, email, password, 'student');
        if (result.success) {
            if (result.emailConfirmationRequired) {
                // If email verification is required, alert user and switch to login
                addToast(t('register_verification_sent'), 'success');
                setView('login');
                setPassword(''); // Clear password for security
            } else {
                addToast(`${t('toast_welcome')}, ${name}!`, 'success');
                navigate('/');
            }
        } else {
            addToast(result.message || 'Registration failed', 'error');
        }
      } 
      else {
        // Standard Login
        const result = await login(email, password);
        if (result.success) {
          addToast(t('toast_welcome'), 'success');
          navigate('/');
        } else {
          // Check for specific Supabase error about unverified email
          const msg = result.message?.toLowerCase() || '';
          if (msg.includes('email not confirmed')) {
             addToast(t('login_error_verify'), 'error');
          } else {
             addToast(result.message || t('login_error'), 'error');
          }
        }
      }
    } catch (error) {
      addToast('An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex relative overflow-hidden transition-colors duration-300">
      
      {/* LEFT SIDE - BRANDING (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
         {/* Abstract BG */}
         <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-slate-900 to-black opacity-90"></div>
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30"></div>
         
         <div className="relative z-10 p-12 text-white max-w-xl">
             <div className="mb-8 p-3 bg-primary-500/20 backdrop-blur-md w-fit rounded-xl border border-primary-500/30">
                <BookOpen className="w-8 h-8 text-primary-400" />
             </div>
             <h1 className="text-5xl font-extrabold mb-6 tracking-tight leading-tight">Share Knowledge,<br/>Grow Together.</h1>
             <p className="text-xl text-slate-300 leading-relaxed mb-8">Join the premier academic community. Access verified notes, share your insights, and elevate your learning journey.</p>
             
             <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    <span className="font-medium">Verified Content</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    <span className="font-medium">Secure Platform</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    <span className="font-medium">Community Driven</span>
                </div>
             </div>
         </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12 relative">
          
        {/* Utility Controls */}
        <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
            <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800 transition-colors"
            >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 transition text-xs"
            >
                <Globe className="w-4 h-4" />
                <span>{language.toUpperCase()}</span>
            </button>
        </div>

        <div className="w-full max-w-md" dir={dir}>
            <div className="text-center mb-10 lg:text-left">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                    {view === 'register' ? t('btn_register') : t('login_title')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {view === 'register' ? t('register_subtitle') : t('login_subtitle')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* LOGIN / REGISTER FIELDS */}
                {view === 'register' && (
                <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">{t('name_label')}</label>
                    <div className="relative group">
                    <User className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition font-medium ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                        placeholder="John Doe"
                    />
                    </div>
                </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">{t('email_label')}</label>
                    <div className="relative group">
                        <Mail className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
                        <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition font-medium ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} disabled:opacity-50`}
                        placeholder="student@university.edu"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">{t('password_label')}</label>
                    <div className="relative group">
                        <Lock className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
                        <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition font-medium ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                        placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-500/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
                >
                    {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                    <>
                        {view === 'register' ? t('btn_register') : t('btn_login')}
                        <ArrowRight className="w-5 h-5" />
                    </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center space-y-4">
                <button 
                    onClick={() => setView(view === 'login' ? 'register' : 'login')}
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-semibold transition"
                >
                    {view === 'register' ? t('toggle_login') : t('toggle_register')}
                </button>
            </div>

            {/* Simple footer for login view */}
            {view === 'login' && (
                 <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-center gap-6 text-slate-400 text-sm">
                        <span>&copy; 2026 UniShare</span>
                        <a href="#" className="hover:text-primary-500 transition">Privacy</a>
                        <a href="#" className="hover:text-primary-500 transition">Terms</a>
                    </div>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;