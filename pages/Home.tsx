import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { mockDb } from '../services/firebase';
import { Note } from '../types';
import Navbar from '../components/Navbar';
import NoteCard from '../components/NoteCard';
import NoteCardSkeleton from '../components/NoteCardSkeleton';
import UploadModal from '../components/UploadModal';
import { Search, Plus, Filter, ArrowUpDown, SearchX, Sparkles, Mail, Heart, Shield, HelpCircle, FileText, AlertCircle } from 'lucide-react';

const Home: React.FC = () => {
  const { t, dir } = useLanguage();
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize state from local storage if available
  const [search, setSearch] = useState(() => {
    try {
      const saved = localStorage.getItem('uniShare_home_session');
      return saved ? JSON.parse(saved).search || '' : '';
    } catch { return ''; }
  });

  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular' | 'title'>(() => {
    try {
      const saved = localStorage.getItem('uniShare_home_session');
      return saved ? JSON.parse(saved).sortBy || 'newest' : 'newest';
    } catch { return 'newest'; }
  });

  const [activeTab, setActiveTab] = useState<'all' | 'saved'>(() => {
    try {
      const saved = localStorage.getItem('uniShare_home_session');
      return saved ? JSON.parse(saved).activeTab || 'all' : 'all';
    } catch { return 'all'; }
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('uniShare_saved');
    return saved ? JSON.parse(saved) : [];
  });

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await mockDb.getNotes();
      setNotes(data); 
    } catch (e) {
      addToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSaveSession = () => {
    const sessionData = {
      search,
      sortBy,
      activeTab
    };
    try {
      localStorage.setItem('uniShare_home_session', JSON.stringify(sessionData));
      addToast(t('toast_session_saved'), 'success');
    } catch (e) {
      addToast('Failed to save session', 'error');
    }
  };

  const handleUploadClick = () => {
    if (!user) {
        addToast(t('login_required'), 'info');
        navigate('/login');
        return;
    }
    setIsUploadOpen(true);
  };

  const toggleSave = (id: string) => {
    const newSaved = savedNoteIds.includes(id)
      ? savedNoteIds.filter(nid => nid !== id)
      : [...savedNoteIds, id];
    
    setSavedNoteIds(newSaved);
    localStorage.setItem('uniShare_saved', JSON.stringify(newSaved));
    addToast(savedNoteIds.includes(id) ? t('toast_removed') : t('toast_saved'), 'info');
  };

  const handleResetFilters = () => {
    setSearch('');
    setSortBy('newest');
    setActiveTab('all');
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBrowseNotes = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => searchInputRef.current?.focus(), 500);
  };

  // Base filtering for global controls (Search)
  const baseNotes = notes.filter(note => {
    if (!note.isApproved) return false;
    // Search now checks Title AND Major AND Description
    if (search) {
       const q = search.toLowerCase();
       return note.title.toLowerCase().includes(q) || 
              note.major.toLowerCase().includes(q) ||
              note.description.toLowerCase().includes(q);
    }
    return true;
  });

  const allNotesCount = baseNotes.length;
  const savedNotesCount = baseNotes.filter(n => savedNoteIds.includes(n.id)).length;

  // Final filtering based on active tab
  const displayNotes = baseNotes.filter(note => {
    if (activeTab === 'saved' && !savedNoteIds.includes(note.id)) return false;
    return true;
  });

  const sortedNotes = [...displayNotes].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'popular':
        return b.upvotes - a.upvotes;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <Navbar onSaveSession={handleSaveSession} />
      
      {/* Modern Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[30%] -right-[10%] w-[600px] h-[600px] rounded-full bg-primary-200/20 dark:bg-primary-500/10 blur-3xl"></div>
            <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] rounded-full bg-blue-200/20 dark:bg-blue-600/10 blur-3xl"></div>
            <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800/[0.1] bg-[center_top_-1px] [mask-image:linear-gradient(to_bottom,white,transparent)] dark:[mask-image:linear-gradient(to_bottom,black,transparent)]"></div>
        </div>

        <div className="relative container mx-auto max-w-5xl text-center py-20 px-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 text-xs font-semibold tracking-wider text-primary-700 dark:text-primary-300 uppercase bg-primary-50 dark:bg-primary-900/40 rounded-full border border-primary-100 dark:border-primary-800/50">
            <Sparkles className="w-3 h-3" />
            <span>UniShare Platform 2.0</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
            {t('hero_title')}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-500 dark:from-primary-400 dark:to-blue-400">
              {t('hero_highlight')}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero_subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1 group">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder={t('search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg shadow-slate-200/50 dark:shadow-none text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
              />
            </div>
            
            <button 
              onClick={handleUploadClick}
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="whitespace-nowrap">{t('btn_upload')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl mt-8 flex-1">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          
          {/* Tabs */}
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'all' 
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('tab_all')}
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-700 dark:text-primary-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {allNotesCount}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'saved' 
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('tab_saved')}
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'saved' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-700 dark:text-primary-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {savedNotesCount}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent block py-2.5 ${dir === 'rtl' ? 'pr-9 pl-8' : 'pl-9 pr-8'} shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors`}
              >
                <option value="newest">{t('sort_date_newest')}</option>
                <option value="oldest">{t('sort_date_oldest')}</option>
                <option value="popular">{t('sort_popular')}</option>
                <option value="title">{t('sort_title')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             Array.from({ length: 6 }).map((_, i) => <NoteCardSkeleton key={i} />)
          ) : sortedNotes.length > 0 ? (
            sortedNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onUpdate={fetchNotes} 
                isSaved={savedNoteIds.includes(note.id)}
                onToggleSave={toggleSave}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50 dark:ring-slate-800">
                <SearchX className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('no_notes')}</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8">{t('no_notes_desc')}</p>
              
              <button 
                onClick={handleResetFilters}
                className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                {t('btn_reset_filters')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Improved Footer Contact Section */}
      <footer className="relative bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent opacity-50"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-6 py-16 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                
                {/* Brand Column */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
                           <img src="https://cdn-icons-png.flaticon.com/512/3413/3413535.png" alt="UniShare" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">UniShare</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">
                        Empowering students worldwide to share knowledge, access study materials, and succeed together in their academic journey.
                    </p>
                    <div className="flex items-center gap-3 mt-auto">
                        {/* Twitter / X */}
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all hover:-translate-y-1" aria-label="Twitter">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                        </a>
                        {/* Discord */}
                        <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-[#5865F2] hover:text-white transition-all hover:-translate-y-1" aria-label="Discord">
                           <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c.63-15.79-4.16-34.69-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
                        </a>
                    </div>
                </div>
                
                {/* Platform Links */}
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-wider">Platform</h4>
                    <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        <li><button onClick={handleScrollTop} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Features</button></li>
                        <li><button onClick={handleBrowseNotes} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Browse Notes</button></li>
                        <li><button onClick={handleUploadClick} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Upload</button></li>
                    </ul>
                </div>

                {/* Support Links */}
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-wider">Resources</h4>
                    <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        <li><button onClick={() => addToast('Help Center coming soon!', 'info')} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"><HelpCircle className="w-3.5 h-3.5" /> Help Center</button></li>
                        <li><button onClick={() => addToast('Community Guidelines: Be respectful and helpful.', 'info')} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Guidelines</button></li>
                        <li><button onClick={() => addToast('Blog coming soon!', 'info')} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Blog</button></li>
                    </ul>
                </div>

                {/* Contact Column */}
                <div>
                     <h4 className="font-bold text-slate-900 dark:text-white mb-6 text-sm uppercase tracking-wider">Contact Us</h4>
                     <div className="space-y-4">
                        {/* Notice Card */}
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Mail className="w-12 h-12 text-amber-900 dark:text-amber-100" />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Notice</span>
                                </div>
                                
                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed font-medium">
                                    Email support isn't working right now. Please contact us via Twitter! :)
                                </p>
                                
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                                    <span className="text-sm font-bold">Message on X</span>
                                </a>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <p className="text-xs text-slate-400 font-medium">
                    &copy; {new Date().getFullYear()} UniShare Inc. All rights reserved.
                </p>
                <div className="flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <button onClick={() => addToast('Privacy Policy: We value your data.', 'info')} className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</button>
                    <button onClick={() => addToast('Terms: Be nice.', 'info')} className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</button>
                    <button onClick={() => addToast('Cookies helps us improve.', 'info')} className="hover:text-slate-900 dark:hover:text-white transition-colors">Cookie Settings</button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                    <span>Made with</span>
                    <Heart className="w-3 h-3 text-red-500 fill-current animate-pulse" />
                    <span>for students</span>
                </div>
            </div>
        </div>
      </footer>

      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={fetchNotes}
        />
      )}
    </div>
  );
};

export default Home;