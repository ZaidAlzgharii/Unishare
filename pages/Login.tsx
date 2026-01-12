import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { mockDb } from '../services/firebase';
import { Mail, Lock, User, ArrowRight, Loader2, Moon, Sun, Globe, CheckCircle2, KeyRound, RefreshCw, Users, MailWarning } from 'lucide-react';

const Login: React.FC = () => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { login, register, verifyEmail, resendOtp } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState<'login' | 'register' | 'verify'>('login');
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState<number>(0);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  // Resend Timer State
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
      // Fetch user count for social proof
      const fetchStats = async () => {
          const count = await mockDb.getUserCount();
          setUserCount(count);
      };
      fetchStats();
  }, []);

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
        const result = await resendOtp(pendingEmail);
        if (result.success) {
            addToast('Confirmation link/code resent! Check your inbox.', 'success');
            setResendTimer(60); // 60 second cooldown
        } else {
            addToast(result.message || 'Failed to resend code', 'error');
        }
    } catch (e) {
        addToast('Error resending code', 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'register') {
        const result = await register(name.trim(), email.trim(), password.trim(), 'student');
        if (result.success) {
            if (result.emailConfirmationRequired) {
                // If email verification is required, switch to verify view
                addToast(t('register_verification_sent'), 'success');
                setPendingEmail(email.trim());
                setView('verify');
                setResendTimer(60); // Start timer immediately on success
            } else {
                addToast(`${t('toast_welcome')}, ${name}!`, 'success');
                navigate('/');
            }
        } else {
            addToast(result.message || 'Registration failed', 'error');
        }
      } 
      else if (view === 'verify') {
        // Verify OTP (Only if user has a code. Link clicks handled by AuthContext auto-detect)
        const result = await verifyEmail(pendingEmail.trim(), otp.trim());
        if (result.success) {
            addToast(t('toast_welcome'), 'success');
            navigate('/');
        } else {
            addToast(result.message || 'Verification failed', 'error');
        }
      }
      else {
        // Standard Login
        const result = await login(email.trim(), password.trim());
        if (result.success) {
          addToast(t('toast_welcome'), 'success');
          navigate('/');
        } else {
          // Check for specific Supabase error about unverified email
          const msg = result.message?.toLowerCase() || '';
          if (msg.includes('email not confirmed')) {
             addToast("Please verify your email address.", 'info');
             setPendingEmail(email.trim());
             setView('verify');
             setResendTimer(0); // Allow immediate resend
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
             <div className="mb-8 p-3 bg-white/10 backdrop-blur-md w-fit rounded-2xl border border-white/20 shadow-xl">
                <img src="https://cdn-icons-png.flaticon.com/512/3413/3413535.png" alt="UniShare" className="w-12 h-12 object-contain" />
             </div>

             {/* User Count Badge */}
             {userCount > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-sm font-medium text-slate-200 mb-6 animate-in fade-in slide-in-from-bottom-3">
                    <Users className="w-4 h-4 text-primary-400" />
                    <span>Join <span className="text-white font-bold">{userCount.toLocaleString()}+</span> students</span>
                </div>
             )}

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
            {/* Social Proof (Mobile Only) */}
            {userCount > 0 && (
                <div className="lg:hidden flex justify-center mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 text-xs font-medium text-primary-700 dark:text-primary-300">
                        <Users className="w-3.5 h-3.5" />
                        <span>Join <span className="font-bold">{userCount.toLocaleString()}+</span> students</span>
                    </div>
                </div>
            )}

            <div className="text-center mb-10 lg:text-left">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                    {view === 'register' ? t('btn_register') : view === 'verify' ? 'Confirm Email' : t('login_title')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {view === 'register' ? t('register_subtitle') : view === 'verify' ? `Verify account for ${pendingEmail}` : t('login_subtitle')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* VERIFICATION VIEW */}
                {view === 'verify' && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300 space-y-5">
                         
                         {/* Info Box */}
                         <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 flex items-start gap-3">
                            <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800 dark:text-amber-200">
                                <p className="font-semibold mb-1">Check your email</p>
                                <p className="opacity-90 mb-2">We sent a confirmation link to <strong>{pendingEmail}</strong>. Please click the link to activate your account.</p>
                                <p className="opacity-75 text-xs">If you received a 6-digit code instead, enter it below.</p>
                            </div>
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1">Verification Code (Optional)</label>
                            <div className="relative group">
                                <KeyRound className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition font-medium tracking-widest text-lg ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
                                    placeholder="123456"
                                    maxLength={6}
                                />
                            </div>
                         </div>

                        <div className="flex items-center justify-between text-xs">
                             <p className="text-slate-400 ml-1">Check spam folder if needed.</p>
                             <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendTimer > 0 || loading}
                                className={`font-bold flex items-center gap-1.5 transition ${resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700'}`}
                             >
                                <RefreshCw className={`w-3 h-3 ${loading && resendTimer === 0 ? 'animate-spin' : ''}`} />
                                {resendTimer > 0 ? `Resend link in ${resendTimer}s` : 'Resend Link'}
                             </button>
                        </div>
                    </div>
                )}

                {/* REGISTER FIELDS */}
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

                {/* COMMON FIELDS (Hidden in Verify mode) */}
                {view !== 'verify' && (
                    <>
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
                    </>
                )}
                
                <div className="space-y-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-500/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
                    >
                        {loading && view !== 'verify' ? ( 
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                        <>
                            {view === 'register' ? t('btn_register') : view === 'verify' ? 'Confirm Code' : t('btn_login')}
                            <ArrowRight className="w-5 h-5" />
                        </>
                        )}
                    </button>
                    
                    {view === 'verify' && (
                        <button
                            type="button"
                            onClick={() => setView('login')}
                            className="w-full py-2 text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-200"
                        >
                            Back to Login
                        </button>
                    )}
                </div>
            </form>

            <div className="mt-8 text-center space-y-4">
                {view !== 'verify' && (
                    <button 
                        onClick={() => setView(view === 'login' ? 'register' : 'login')}
                        className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-semibold transition"
                    >
                        {view === 'register' ? t('toggle_login') : t('toggle_register')}
                    </button>
                )}
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