import React, { useState } from 'react';
import { X, Download, AlertTriangle, BrainCircuit, Sparkles, CheckCircle2, MessageSquare } from 'lucide-react';
import { Note } from '../types';
import { Document, Page, pdfjs } from 'react-pdf';
import { useLanguage } from '../contexts/LanguageContext';
import { mockDb } from '../services/firebase';
import CommentSection from './CommentSection';

// Configure pdfjs worker for standard React usage
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PreviewModalProps {
  note: Note;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ note, onClose }) => {
  const { t } = useLanguage();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showComments, setShowComments] = useState(true);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleGenerateSummary = async () => {
    setAiLoading(true);
    try {
        const summary = await mockDb.generateAiSummary(note.id);
        setAiSummary(summary);
    } catch (e) {
        setAiSummary("Failed to generate summary. Please try again.");
    } finally {
        setAiLoading(false);
    }
  };

  const renderContent = () => {
    if (note.fileType === 'image') {
      return (
        <div 
          className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden min-h-[300px] overflow-y-auto"
          role="img"
          aria-label={`Preview of ${note.title}`}
          tabIndex={0}
        >
          <img src={note.fileUrl} alt={note.title} className="max-w-full max-h-[70vh] object-contain" />
        </div>
      );
    }

    if (note.fileType === 'pdf') {
      return (
        <div 
          className="bg-slate-100 dark:bg-slate-800 flex justify-center overflow-y-auto max-h-[70vh] p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          aria-label="PDF Document Preview"
          tabIndex={0}
        >
          <Document
            file={note.fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col gap-4"
            loading={<div className="p-10 text-center text-slate-500 dark:text-slate-400" aria-live="polite">Loading PDF...</div>}
            error={<div className="p-10 text-center text-red-500" role="alert">Failed to load PDF. Cross-origin issue or invalid file.</div>}
          >
            {/* Render first 3 pages max for preview */}
            {Array.from(new Array(Math.min(numPages || 0, 3)), (el, index) => (
              <Page 
                key={`page_${index + 1}`} 
                pageNumber={index + 1} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                width={500}
                className="shadow-md" 
              />
            ))}
            {numPages && numPages > 3 && (
                <div className="text-center text-slate-500 dark:text-slate-400 py-2">
                    + {numPages - 3} more pages. Download to view full.
                </div>
            )}
          </Document>
        </div>
      );
    }

    // Fallback for DOCX, PPT, etc using Google Docs Viewer
    return (
      <div className="w-full h-[60vh] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(note.fileUrl)}&embedded=true`}
          className="w-full h-full border-0"
          title={`Preview of ${note.title}`}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 max-h-[95vh]">
             {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate max-w-xs md:max-w-md">{note.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{note.program} • {note.course}</p>
                </div>
                <div className="flex gap-2">
                     {/* Toggle Comments Mobile */}
                     <button 
                        onClick={() => setShowComments(!showComments)}
                        className={`md:hidden p-2 rounded-full transition ${showComments ? 'bg-primary-50 text-primary-600' : 'hover:bg-slate-100 text-slate-500'}`}
                     >
                        <MessageSquare className="w-5 h-5" />
                     </button>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                        aria-label={t('modal_close')}
                    >
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                
                {/* AI Section */}
                <div className="px-6 pt-6 pb-2">
                    {!aiSummary && !aiLoading && (
                        <button 
                            onClick={handleGenerateSummary}
                            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2 transition-all group"
                        >
                            <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />
                            <span className="font-semibold">{t('btn_ai_summary')}</span>
                        </button>
                    )}

                    {aiLoading && (
                        <div className="w-full py-6 bg-white dark:bg-slate-900 border border-violet-100 dark:border-violet-900/30 rounded-xl flex flex-col items-center justify-center gap-3 animate-pulse">
                            <Sparkles className="w-6 h-6 text-violet-500 animate-spin" />
                            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Analyzing document structure...</span>
                        </div>
                    )}

                    {aiSummary && (
                        <div className="w-full p-5 bg-gradient-to-br from-white to-violet-50 dark:from-slate-900 dark:to-slate-800 border border-violet-100 dark:border-violet-900/30 rounded-xl relative overflow-hidden group">
                            <div className="flex items-center gap-2 mb-3 text-violet-700 dark:text-violet-300">
                                <Sparkles className="w-4 h-4" />
                                <h4 className="font-bold text-sm uppercase tracking-wider">{t('ai_summary_title')}</h4>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                                {aiSummary.split('\n').map((line, i) => (
                                    <p key={i} className="mb-1">{line}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* File Preview */}
                <div className="p-6">
                    {renderContent()}
                    <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">Description</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{note.description}</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-2 z-10">
                <a 
                    href={note.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-lg transition shadow-md"
                >
                    <Download className="w-4 h-4" />
                    {t('btn_download')}
                </a>
            </div>
        </div>

        {/* Sidebar (Comments) */}
        {showComments && (
            <div className="hidden md:block h-full border-l border-slate-200 dark:border-slate-800">
                <CommentSection noteId={note.id} />
            </div>
        )}
        
        {/* Mobile Comment Drawer Overlay */}
        {showComments && (
            <div className="md:hidden absolute inset-0 z-20 bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-right duration-200">
                 <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold">{t('comments_title')}</h3>
                    <button onClick={() => setShowComments(false)} className="p-2"><X className="w-5 h-5" /></button>
                 </div>
                 <CommentSection noteId={note.id} />
            </div>
        )}

      </div>
    </div>
  );
};

export default PreviewModal;
