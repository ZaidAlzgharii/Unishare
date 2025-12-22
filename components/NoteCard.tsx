import React, { useState } from 'react';
import { Note } from '../types';
import { FileText, Image as ImageIcon, File, Eye, Download, Bookmark, ThumbsUp, Check, X as XIcon, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { mockDb } from '../services/firebase';
import { useToast } from '../contexts/ToastContext';
import PreviewModal from './PreviewModal';

interface NoteCardProps {
  note: Note;
  onUpdate?: () => void;
  isSaved?: boolean;
  onToggleSave: (noteId: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onUpdate, isSaved, onToggleSave }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(note.upvotes);

  const getIcon = () => {
    switch (note.fileType) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'image': return <ImageIcon className="w-6 h-6 text-blue-500" />;
      case 'docx': return <File className="w-6 h-6 text-blue-700 dark:text-blue-400" />;
      default: return <File className="w-6 h-6 text-slate-500" />;
    }
  };

  const getBadgeColor = () => {
      switch(note.fileType) {
          case 'pdf': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
          case 'image': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
          default: return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      }
  }

  const handleApprove = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) return;
    setLoadingAction(true);
    try {
      await mockDb.approveNote(note.id);
      addToast(t('toast_approve_success'), 'success');
      onUpdate?.();
    } catch (error) {
        addToast('Error approving note', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCount = await mockDb.toggleUpvote(note.id);
    setLocalUpvotes(newCount);
  };

  const showAdminControls = (user?.role === 'admin' || user?.role === 'owner') && !note.isApproved;
  const isVerifiedUploader = note.upvotes > 20 || note.uploaderName.includes('Sarah'); // Mock logic

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 overflow-hidden flex flex-col h-full group relative hover:-translate-y-1">
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary-500/10 dark:group-hover:border-primary-400/20 rounded-2xl pointer-events-none transition-colors"></div>

        <div className="p-5 flex-1 z-10">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-lg border ${getBadgeColor()} transition-colors`}>
              {getIcon()}
            </div>
            {!note.isApproved ? (
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800">
                {t('status_pending')}
              </span>
            ) : (
                <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{note.fileType}</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {note.category}
                    </span>
                </div>
            )}
          </div>

          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {note.title}
          </h3>
          
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{note.major}</span>
            </div>
            <p>{new Date(note.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{note.description}</p>
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsPreviewOpen(true)}
                className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 transition p-2 rounded-lg" 
                title={t('btn_preview')}
            >
              <Eye className="w-4 h-4" />
            </button>
            <a 
                href={note.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 transition p-2 rounded-lg"
                title={t('btn_download')}
                onClick={(e) => e.stopPropagation()}
            >
                <Download className="w-4 h-4" />
            </a>
            <button 
                onClick={() => onToggleSave(note.id)}
                className={`${isSaved ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700'} transition p-2 rounded-lg`}
                title="Save"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button 
                onClick={handleUpvote}
                className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 transition p-2 rounded-lg flex items-center gap-1.5"
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs font-bold">{localUpvotes}</span>
            </button>
          </div>

          {showAdminControls ? (
            <div className="flex gap-1">
                <button
                onClick={handleApprove}
                disabled={loadingAction}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition shadow-sm"
                >
                {loadingAction ? '...' : <><Check className="w-3 h-3" /> {t('btn_approve')}</>}
                </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="relative">
                     <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900">
                        {note.uploaderName.charAt(0)}
                    </span>
                    {isVerifiedUploader && (
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-[1px]">
                            <ShieldCheck className="w-3 h-3 text-blue-500 fill-blue-500/20" />
                        </div>
                    )}
                </div>
                <span className="truncate max-w-[80px] font-medium">{note.uploaderName.split(' ')[0]}</span>
            </div>
          )}
        </div>
      </div>

      {isPreviewOpen && (
        <PreviewModal note={note} onClose={() => setIsPreviewOpen(false)} />
      )}
    </>
  );
};

export default NoteCard;