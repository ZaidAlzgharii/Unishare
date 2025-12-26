import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { mockDb } from '../services/firebase';
import { Comment } from '../types';
import { Send, MessageSquare } from 'lucide-react';

interface CommentSectionProps {
  noteId: string;
  className?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ noteId, className = '' }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [noteId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await mockDb.getComments(noteId);
      setComments(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await mockDb.addComment(noteId, newComment, user);
      setNewComment('');
      await fetchComments();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-colors ${className}`}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <MessageSquare className="w-5 h-5 text-primary-500" />
        <h3 className="font-bold text-slate-900 dark:text-white">{t('comments_title')} <span className="text-sm font-normal text-slate-500">({comments.length})</span></h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
           <div className="flex justify-center py-4"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div></div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm">
            {t('comments_empty')}
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex-shrink-0">
                 {comment.userAvatar ? (
                    <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 rounded-full bg-slate-200 object-cover" />
                 ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                        {comment.userName.charAt(0)}
                    </div>
                 )}
              </div>
              <div className="flex-1">
                 <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{comment.userName}</span>
                        <span className="text-[10px] text-slate-400">{new Date(comment.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 break-words">{comment.text}</p>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
        {user ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('comments_placeholder')}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
            />
            <button 
                type="submit" 
                disabled={submitting || !newComment.trim()}
                className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full shadow-md transition-all"
            >
                <Send className="w-4 h-4" />
            </button>
            </form>
        ) : (
            <div className="text-center text-xs text-slate-500 p-2">Login to discussion</div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;