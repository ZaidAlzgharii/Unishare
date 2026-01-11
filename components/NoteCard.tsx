import React, { useState } from 'react';
import { Note } from '../types';
import { FileText, Image as ImageIcon, File, Eye, Download, Bookmark, ThumbsUp, Check, X as XIcon, ShieldCheck, Flag, AlertTriangle, Share2, Sparkles, Loader2, RefreshCw } from 'lucide-react';
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
  const { t, dir, language } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInitialTask, setPreviewInitialTask] = useState<'SUMMARY' | 'QUIZ' | 'ROADMAP' | 'TAGS' | 'EXPLAIN' | undefined>(undefined);

  const [loadingAction, setLoadingAction] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(note.upvotes);
  
  // Tag Generation State
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagError, setTagError] = useState(false);
  
  // Report State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or Misleading');
  const [reporting, setReporting] = useState(false);

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

  const handleOpenPreview = (task?: 'SUMMARY' | 'QUIZ' | 'ROADMAP' | 'TAGS' | 'EXPLAIN') => {
      setPreviewInitialTask(task);
      setIsPreviewOpen(true);
  }

  const handleGenerateTags = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Allow retry if it failed previously
    if (generatedTags.length > 0 && !tagError) return;

    setLoadingTags(true);
    setTagError(false);
    try {
        const result = await mockDb.generateAiContent(note.id, 'TAGS', undefined, language);
        // Simple validation to ensure we got something meaningful
        if (!result || result.includes("Error")) throw new Error("AI Generation Failed");
        
        const tags = result.split(/[,،]+/).map(t => t.trim()).filter(t => t && t.length > 0 && t.length < 20);
        
        if (tags.length === 0) throw new Error("No tags generated");
        
        setGeneratedTags(tags);
    } catch (e) {
        setTagError(true);
        addToast('Failed to generate tags. Click to retry.', 'error');
    } finally {
        setLoadingTags(false);
    }
  };

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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        if (navigator.share) {
            await navigator.share({
                title: note.title,
                text: note.description,
                url: note.fileUrl
            });
        } else {
            await navigator.clipboard.writeText(note.fileUrl);
            addToast('Link copied to clipboard', 'success');
        }
    } catch (err) {
        console.error('Share failed:', err);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setReporting(true);
    
    // Map full text to simple codes for database consistency
    const reasonCode = {
        'Spam or Misleading': 'spam',
        'Inappropriate Content': 'inappropriate',
        'Wrong Category/Major': 'wrong_category',
        'Other': 'other'
    }[reportReason] || 'other';

    try {
        await mockDb.reportNote(note.id, user.id, reasonCode);
        addToast(t('toast_report_success'), 'success');
        setIsReportOpen(false);
    } catch (error: any) {
        console.error("Report submission failed:", error);
        // Ensure we pass a string to addToast, preventing [object Object] errors
        const msg = error?.message || (typeof error === 'string' ? error : 'Failed to submit report');
        addToast(msg, 'error');
    } finally {
        setReporting(false);
    }
  };

  const showAdminControls = (user?.role === 'admin' || user?.role === 'owner') && !note.isApproved;
  
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
        
          {/* Generated Tags Display */}
          {generatedTags.length > 0 && !tagError && (
            <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                {generatedTags.slice(0, 5).map((tag, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50">
                        #{tag}
                    </span>
                ))}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <button 
                onClick={() => handleOpenPreview()}
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
                onClick={handleShare}
                className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 transition p-2 rounded-lg"
                title={t('btn_share')}
            >
              <Share2 className="w-4 h-4" />
            </button>
            {/* AI Tags Button (Inline Generation) */}
            <button 
                onClick={handleGenerateTags}
                disabled={loadingTags || (generatedTags.length > 0 && !tagError)}
                className={`transition p-2 rounded-lg flex items-center justify-center ${generatedTags.length > 0 && !tagError ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' : tagError ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-700'}`}
                title={tagError ? "Retry Generation" : t('btn_ai_tags')}
            >
              {loadingTags ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              ) : tagError ? (
                  <RefreshCw className="w-4 h-4" />
              ) : (
                  <Sparkles className={`w-4 h-4 ${generatedTags.length > 0 ? 'fill-current' : ''}`} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
                onClick={handleUpvote}
                className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-slate-700 transition p-2 rounded-lg flex items-center gap-1.5"
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs font-bold">{localUpvotes}</span>
            </button>

             {/* Report Button */}
             {user && (
                <button 
                    onClick={() => setIsReportOpen(true)}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition p-2 rounded-lg"
                    title={t('btn_report')}
                >
                    <Flag className="w-4 h-4" />
                </button>
            )}
          </div>
        </div>

        {/* Admin Footer */}
        {showAdminControls && (
            <div className="absolute top-4 right-4 z-20 flex gap-1">
                <button
                onClick={(e) => { e.stopPropagation(); handleApprove(); }}
                disabled={loadingAction}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition shadow-sm"
                >
                {loadingAction ? '...' : <Check className="w-3 h-3" />}
                </button>
            </div>
        )}
      </div>

      {isPreviewOpen && (
        <PreviewModal 
            note={note} 
            onClose={() => setIsPreviewOpen(false)} 
            initialAiTask={previewInitialTask}
        />
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 p-6" dir={dir}>
                <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('report_modal_title')}</h3>
                </div>
                
                <form onSubmit={handleReport}>
                    <div className="space-y-3 mb-6">
                        {['Spam or Misleading', 'Inappropriate Content', 'Wrong Category/Major', 'Other'].map((reason) => {
                             // Simple mapper for translation keys
                             const keyMap: {[key: string]: string} = {
                                 'Spam or Misleading': 'report_reason_spam',
                                 'Inappropriate Content': 'report_reason_inappropriate',
                                 'Wrong Category/Major': 'report_reason_wrong_category',
                                 'Other': 'report_reason_other'
                             };
                             return (
                                <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                    <input 
                                        type="radio" 
                                        name="reportReason" 
                                        value={reason} 
                                        checked={reportReason === reason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t(keyMap[reason])}</span>
                                </label>
                             );
                        })}
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsReportOpen(false)}
                            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                            {t('modal_close')}
                        </button>
                        <button 
                            type="submit" 
                            disabled={reporting}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition disabled:opacity-70"
                        >
                            {reporting ? '...' : t('btn_submit_report')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </>
  );
};

export default NoteCard;