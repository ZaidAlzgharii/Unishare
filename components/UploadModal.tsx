import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { mockDb } from '../services/firebase';
import { PROGRAMS, NOTE_CATEGORIES } from '../constants';
import { X, UploadCloud, Loader2 } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSuccess }) => {
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    program: PROGRAMS[0].name,
    course: PROGRAMS[0].courses[0],
    category: NOTE_CATEGORIES[0],
    uploaderName: user?.name || '',
    file: null as File | null
  });

  const availableCourses = PROGRAMS.find(p => p.name === formData.program)?.courses || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !user) return;

    setLoading(true);
    try {
      await mockDb.addNote({
        title: formData.title,
        description: formData.description,
        program: formData.program,
        course: formData.course,
        category: formData.category,
        uploaderId: user.id,
        uploaderName: formData.uploaderName || user.name,
        fileUrl: URL.createObjectURL(formData.file), // Mock URL
        fileType: formData.file.type.includes('image') ? 'image' : formData.file.type.includes('pdf') ? 'pdf' : 'docx'
      });
      addToast(t('toast_upload_success'), 'success');
      onSuccess();
      onClose();
    } catch (error) {
      addToast('Upload failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto" dir={dir}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('upload_title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('form_title')}</label>
            <input
              required
              type="text"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-slate-900 dark:text-white transition"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('name_label')}</label>
             <input
               required
               type="text"
               className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-slate-900 dark:text-white transition"
               value={formData.uploaderName}
               onChange={(e) => setFormData({...formData, uploaderName: e.target.value})}
               placeholder={user?.name}
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('form_program')}</label>
              <select
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white"
                value={formData.program}
                onChange={(e) => setFormData({...formData, program: e.target.value, course: PROGRAMS.find(p => p.name === e.target.value)?.courses[0] || ''})}
              >
                {PROGRAMS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('form_course')}</label>
              <select
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white"
                value={formData.course}
                onChange={(e) => setFormData({...formData, course: e.target.value})}
              >
                {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('form_category')}</label>
             <select
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('form_desc')}</label>
            <textarea
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none h-24 resize-none text-slate-900 dark:text-white"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary-400 dark:hover:border-primary-600 transition cursor-pointer relative group">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              required
              onChange={(e) => setFormData({...formData, file: e.target.files ? e.target.files[0] : null})}
            />
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6 text-primary-500" />
            </div>
            <span className="text-sm font-medium text-center">
              {formData.file ? (
                  <span className="text-primary-600 dark:text-primary-400 font-semibold">{formData.file.name}</span>
              ) : t('form_file')}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed sticky bottom-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('btn_upload')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;