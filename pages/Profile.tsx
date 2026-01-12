import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Navbar from '../components/Navbar';
import { mockDb } from '../services/firebase';
import { Note } from '../types';
import NoteCard from '../components/NoteCard';
import NoteCardSkeleton from '../components/NoteCardSkeleton';
import { User, Calendar, Award, BookOpen, Trash2, Search, ShieldCheck, Edit, X, Upload, Loader2, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabaseClient';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const { addToast } = useToast();
  
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    oldPassword: '',
    newPassword: '',
    file: null as File | null
  });

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
    if (user) {
        setFormData(prev => ({ ...prev, name: user.name }));
    }
  }, [user]);

  const handleDelete = async (id: string) => {
     if(confirm("Are you sure you want to delete this note?")) {
        await mockDb.deleteNote(id);
        addToast("Note deleted", "success");
        fetchMyNotes();
     }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      setEditLoading(true);
      try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser || !authUser.email) throw new Error("Authentication error");

          await mockDb.updateUserProfile(user.id, authUser.email, {
              name: formData.name,
              oldPassword: formData.oldPassword,
              newPassword: formData.newPassword,
              file: formData.file
          });
          
          addToast(t('toast_profile_updated'), 'success');
          setIsEditing(false);
          // Force a reload to update context or refetch profile
          window.location.reload(); 
      } catch (e: any) {
          console.error(e);
          const msg = e.message === "Incorrect old password." ? t('error_old_password') : (e.message || "Update failed");
          addToast(msg, 'error');
      } finally {
          setEditLoading(false);
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
               <div className="w-32 h-32 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center relative group">
                  {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                      <span className="text-4xl font-bold text-slate-500 dark:text-slate-400">{user.name.charAt(0)}</span>
                  )}
               </div>
               
               {/* User Info */}
               <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
                    >
                        <Edit className="w-3.5 h-3.5" />
                        {t('edit_profile_btn')}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-600 dark:text-slate-400 mb-6">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium capitalize">
                          <User className="w-4 h-4" />
                          {user.role}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                          <Calendar className="w-4 h-4" />
                          {t('profile_member_since')} {user.joinedAt ? new Date(user.joinedAt).getFullYear() : new Date().getFullYear()}
                      </span>
                      {user.role === 'student' && (
                         <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${user.trustPoints >= 5 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                            <ShieldCheck className="w-4 h-4" />
                            Trust Points: {user.trustPoints}
                         </span>
                      )}
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

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]" dir={dir}>
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('edit_profile_title')}</h2>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleEditSubmit} className="space-y-5">
                        
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('name_label')}</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white"
                            />
                        </div>

                        {/* Avatar Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('label_avatar')}</label>
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary-400 transition cursor-pointer relative">
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => setFormData({...formData, file: e.target.files ? e.target.files[0] : null})}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                <span className="text-xs font-medium text-center truncate w-full px-2">
                                    {formData.file ? formData.file.name : t('form_file')}
                                </span>
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                        
                        {/* Change Password Section */}
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-4">
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-500">Change Password (Optional)</h3>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{t('label_new_password')}</label>
                                <input
                                    type="password"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>

                            {formData.newPassword && (
                                <div className="animate-in fade-in slide-in-from-top-1">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{t('label_old_password')}</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.oldPassword}
                                        onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
                                        placeholder="••••••••"
                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={editLoading}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {editLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {t('btn_save_changes')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Profile;