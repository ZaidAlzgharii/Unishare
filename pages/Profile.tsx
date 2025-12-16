import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Navbar from '../components/Navbar';
import { mockDb } from '../services/firebase';
import { Note } from '../types';
import NoteCard from '../components/NoteCard';
import NoteCardSkeleton from '../components/NoteCardSkeleton';
import { User, Calendar, Award, BookOpen, Trash2, Search } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const { addToast } = useToast();
  
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');

  const fetchMyNotes = async () => {
    if(!user) return;
    setLoading(true);
    try {
        const notes = await mockDb.getMyNotes(user.id);
        setMyNotes(notes);
    } catch(e) {
        addToast("Failed to load profile data", "error");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyNotes();
  }, [user]);

  const handleDelete = async (id: string) => {
     if(confirm("Are you sure you want to delete this note?")) {
        await mockDb.deleteNote(id);
        addToast("Note deleted", "success");
        fetchMyNotes();
     }
  };

  if (!user) return null;

  // Filter notes based on local search if provided (useful for shared accounts)
  const filteredNotes = myNotes.filter(note => 
    note.uploaderName.toLowerCase().includes(nameFilter.toLowerCase()) || 
    note.title.toLowerCase().includes(nameFilter.toLowerCase())
  );

  const totalUpvotes = myNotes.reduce((acc, note) => acc + note.upvotes, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar />
      
      <div className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-12 pt-12">
         {/* Background Decoration */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-50">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        </div>

         <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
               {/* Avatar */}
               <div className="w-32 h-32 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                      <span className="text-4xl font-bold text-slate-500 dark:text-slate-400">{user.name.charAt(0)}</span>
                  )}
               </div>
               
               {/* User Info */}
               <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{user.name}</h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-600 dark:text-slate-400 mb-6">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium capitalize">
                          <User className="w-4 h-4" />
                          {user.role}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                          <Calendar className="w-4 h-4" />
                          {t('profile_member_since')} 2023
                      </span>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                              <Award className="w-5 h-5" />
                              <span className="text-xs font-bold uppercase tracking-wider">{t('profile_stats_upvotes')}</span>
                          </div>
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalUpvotes}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                              <BookOpen className="w-5 h-5" />
                              <span className="text-xs font-bold uppercase tracking-wider">{t('profile_stats_notes')}</span>
                          </div>
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">{myNotes.length}</span>
                      </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl py-12">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary-500" />
                  {t('profile_uploads')}
              </h2>
              
              {/* Search Filter for Shared Accounts */}
              <div className="relative w-full md:w-64">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${dir === 'rtl' ? 'left-3' : 'right-3'}`} />
                <input 
                    type="text" 
                    placeholder="Find by uploader name..." 
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {loading ? (
                 Array.from({ length: 3 }).map((_, i) => <NoteCardSkeleton key={i} />)
             ) : filteredNotes.length > 0 ? (
                 filteredNotes.map(note => (
                     <div key={note.id} className="relative group">
                         <NoteCard note={note} onToggleSave={() => {}} />
                         {/* Only Admins/Owners can delete. Shared accounts (students) cannot delete each other's notes. */}
                         {(user.role === 'admin' || user.role === 'owner') && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                className="absolute top-4 right-4 z-20 p-2 bg-white dark:bg-slate-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Note"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                         )}
                     </div>
                 ))
             ) : (
                 <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                     {nameFilter ? 'No notes found matching that name.' : "You haven't uploaded any notes yet."}
                 </div>
             )}
          </div>
      </div>
    </div>
  );
};

export default Profile;