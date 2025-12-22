import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { mockDb } from '../services/firebase';
import { Note } from '../types';
import Navbar from '../components/Navbar';
import { Check, X, Trash2, ArrowUpRight, ArrowUpDown, FileText, Clock, CheckCircle2, ThumbsUp } from 'lucide-react';
import PreviewModal from '../components/PreviewModal';

const AdminPanel: React.FC = () => {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [sortBy, setSortBy] = useState<'date_newest' | 'date_oldest' | 'title' | 'uploader'>('date_newest');
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  // Protected Route Check
  useEffect(() => {
    if (user && user.role === 'student') {
      navigate('/');
      addToast('Access denied', 'error');
    }
  }, [user, navigate, addToast]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await mockDb.getNotes();
      setNotes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleAction = async (action: 'approve' | 'reject' | 'delete', id: string) => {
    try {
      if (action === 'approve') await mockDb.approveNote(id);
      if (action === 'reject') await mockDb.rejectNote(id);
      if (action === 'delete') await mockDb.deleteNote(id);
      
      addToast(action === 'delete' ? t('toast_delete_success') : t('toast_approve_success'), 'success');
      fetchNotes();
    } catch (e) {
      addToast('Operation failed', 'error');
    }
  };

  const filteredNotes = notes.filter(n => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return !n.isApproved;
    if (statusFilter === 'approved') return n.isApproved;
    return true;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case 'date_newest':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date_oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'uploader':
        return a.uploaderName.localeCompare(b.uploaderName);
      default:
        return 0;
    }
  });

  const stats = {
    total: notes.length,
    pending: notes.filter(n => !n.isApproved).length,
    approved: notes.filter(n => n.isApproved).length,
    upvotes: notes.reduce((acc, curr) => acc + curr.upvotes, 0)
  };

  if (!user || user.role === 'student') return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-8">{t('admin_dashboard')}</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{t('admin_stats_total')}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{t('admin_stats_pending')}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-green-300 dark:hover:border-green-700 transition-colors">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{t('admin_stats_approved')}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.approved}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{t('admin_stats_upvotes')}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.upvotes}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <ThumbsUp className="w-6 h-6" />
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
             {/* Sort Dropdown */}
            <div className="relative">
              <ArrowUpDown className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`w-full sm:w-auto appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent block py-2 ${dir === 'rtl' ? 'pr-9 pl-8' : 'pl-9 pr-8'} shadow-sm`}
              >
                <option value="date_newest">{t('sort_date_newest')}</option>
                <option value="date_oldest">{t('sort_date_oldest')}</option>
                <option value="title">{t('sort_title')}</option>
                <option value="uploader">{t('sort_uploader')}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-1 shadow-sm w-fit overflow-x-auto">
              <button onClick={() => setStatusFilter('all')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${statusFilter === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>{t('tab_all')}</button>
              <button onClick={() => setStatusFilter('pending')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${statusFilter === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>{t('status_pending')}</button>
              <button onClick={() => setStatusFilter('approved')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${statusFilter === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>{t('status_approved')}</button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className={`px-6 py-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('form_title')}</th>
                  <th className={`px-6 py-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('table_uploader')}</th>
                  <th className={`px-6 py-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('table_date')}</th>
                  <th className={`px-6 py-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('table_status')}</th>
                  <th className={`px-6 py-4 text-center`}>{t('table_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                   <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">{t('loading')}</td></tr>
                ) : sortedNotes.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">{t('no_notes')}</td></tr>
                ) : (
                  sortedNotes.map(note => (
                    <tr key={note.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition bg-white dark:bg-slate-900">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="font-semibold">{note.title}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{note.major}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{note.uploaderName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">{new Date(note.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${note.isApproved ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                          {note.isApproved ? t('status_approved') : t('status_pending')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                           <button 
                             onClick={() => setPreviewNote(note)}
                             className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition" 
                             title="View"
                           >
                             <ArrowUpRight className="w-4 h-4" />
                           </button>
                           
                           {!note.isApproved && (
                             <>
                               <button 
                                 onClick={() => handleAction('approve', note.id)} 
                                 className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                                 title="Approve"
                               >
                                 <Check className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => handleAction('reject', note.id)}
                                 className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                 title="Reject"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                             </>
                           )}

                           {/* Admins AND Owners can now delete any note */}
                           {(user.role === 'owner' || user.role === 'admin') && (
                             <button 
                               onClick={() => handleAction('delete', note.id)}
                               className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                               title="Delete"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {previewNote && (
        <PreviewModal note={previewNote} onClose={() => setPreviewNote(null)} />
      )}
    </div>
  );
};

export default AdminPanel;