import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { mockDb } from '../services/firebase';
import { Note } from '../types';
import { PROGRAMS } from '../constants';
import Navbar from '../components/Navbar';
import NoteCard from '../components/NoteCard';
import NoteCardSkeleton from '../components/NoteCardSkeleton';
import UploadModal from '../components/UploadModal';
import { Search, Plus, Filter, ArrowUpDown, SearchX, Sparkles } from 'lucide-react';

const Home: React.FC = () => {
  const { t, dir } = useLanguage();
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Initialize state from local storage if available
  const [search, setSearch] = useState(() => {
    try {
      const saved = localStorage.getItem('uniShare_home_session');
      return saved ? JSON.parse(saved).search || '' : '';
    } catch { return ''; }
  });

  const [programFilter, setProgramFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('uniShare_home_session');
      return saved ? JSON.parse(saved).programFilter || '' : '';
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
      programFilter,
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
    setProgramFilter('');
    setSortBy('newest');
    setActiveTab('all');
  };

  // Base filtering for global controls (Search & Program)
  const baseNotes = notes.filter(note => {
    if (!note.isApproved) return false;
    if (programFilter && note.program !== programFilter) return false;
    if (search && !note.title.toLowerCase().includes(search.toLowerCase()) && !note.course.toLowerCase().includes(search.toLowerCase())) return false;
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
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
              Faster than ever.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero_subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1 group">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
              <input 
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

      <div className="container mx-auto px-4 max-w-6xl mt-8">
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

            {/* Filter */}
            <div className="relative">
              <Filter className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <select 
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className={`appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent block py-2.5 ${dir === 'rtl' ? 'pr-9 pl-8' : 'pl-9 pr-8'} shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors`}
              >
                <option value="">{t('filter_program')} (All)</option>
                {PROGRAMS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
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