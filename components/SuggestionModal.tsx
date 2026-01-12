import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { mockDb } from '../services/firebase';
import { Lightbulb, X, Loader2 } from 'lucide-react';

interface SuggestionModalProps {
  onClose: () => void;
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({ onClose }) => {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await mockDb.addSuggestion(content.trim(), user);
      addToast(t('toast_suggestion_success'), 'success');
      onClose();
    } catch (e: any) {
      console.error("Suggestion Error:", e);
      // Extract a meaningful error message
      let msg = "An unexpected error occurred";
      if (typeof e === 'string') msg = e;
      else if (e instanceof Error) msg = e.message;
      else if (e?.message) msg = e.message;
      else if (e?.error_description) msg = e.error_description;
      
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 p-6" dir={dir}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-amber-500">
             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
               <Lightbulb className="w-6 h-6" />
             </div>
             <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('suggestion_modal_title')}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {t('suggestion_desc')}
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            required
            className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white resize-none mb-4"
            placeholder={t('suggestion_placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('btn_submit_suggestion')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuggestionModal;