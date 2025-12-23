import React, { useState } from 'react';
import { X, Download, BrainCircuit, Sparkles, MessageSquare, Stars, ChevronDown, Zap, CheckCircle2 } from 'lucide-react';
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
  const { t, dir } = useLanguage();
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
        setAiSummary("عذراً، حدث خطأ أثناء توليد الملخص. / Sorry, an error occurred while generating the summary.");
    } finally {
        setAiLoading(false);
    }
  };

  const renderContent = () => {
    if (note.fileType === 'image') {
      return (
        <div 
          className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden min-h-[300px] border border-slate-200 dark:border-slate-800"
          role="img"
          aria-label={`Preview of ${note.title}`}
        >
          <img src={note.fileUrl} alt={note.title} className="max-w-full max-h-[70vh] object-contain shadow-2xl" />
        </div>
      );
    }

    if (note.fileType === 'pdf') {
      return (
        <div 
          className="bg-slate-100 dark:bg-slate-800 flex justify-center overflow-y-auto max-h-[70vh] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner"
          aria-label="PDF Document Preview"
          role="region"
        >
          <Document
            file={note.fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col gap-6"
            loading={<div className="p-10 text-center text-slate-500 dark:text-slate-400 font-medium">Loading Document Preview...</div>}
            error={<div className="p-10 text-center text-red-500" role="alert">Failed to load PDF preview.</div>}
          >
            {Array.from(new Array(Math.min(numPages || 0, 3)), (el, index) => (
              <Page 
                key={`page_${index + 1}`} 
                pageNumber={index + 1} 
                renderTextLayer={false} 
                renderAnnotationLayer={false}
                width={window.innerWidth < 640 ? 320 : 550}
                className="shadow-xl rounded-sm overflow-hidden" 
              />
            ))}
            {numPages && numPages > 3 && (
                <div className="text-center text-slate-500 dark:text-slate-400 py-4 bg-white/50 dark:bg-slate-900/50 rounded-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 italic">
                    + {numPages - 3} {t('more_pages_text') || 'more pages. Download to view full document.'}
                </div>
            )}
          </Document>
        </div>
      );
    }

    return (
      <div className="w-full h-[60vh] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(note.fileUrl)}&embedded=true`}
          className="w-full h-full border-0"
          title={`Preview of ${note.title}`}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col md:flex-row overflow-hidden border border-white/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
        dir={dir}
      >
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 max-h-[95vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:px-8 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400" aria-hidden="true">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div className="min-w-0">
                        <h3 id="preview-modal-title" className="font-bold text-xl text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-md">{note.title}</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{note.major}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowComments(!showComments)}
                        className={`p-2.5 rounded-xl transition-all ${showComments ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        aria-label={showComments ? "Hide comments" : "Show comments"}
                        aria-expanded={showComments}
                        aria-controls="comments-sidebar"
                     >
                        <MessageSquare className="w-5 h-5" />
                     </button>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors group"
                        aria-label={t('modal_close')}
                    >
                        <X className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 p-6 md:px-8 space-y-10">
                
                {/* AI SUMMARY WRAPPER */}
                <section aria-label="AI Summary Section" className="relative group">
                    {!aiSummary && !aiLoading && (
                        <button 
                            onClick={handleGenerateSummary}
                            className="w-full py-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-primary-600 hover:from-violet-700 hover:via-indigo-700 hover:to-primary-700 text-white rounded-[1.5rem] shadow-xl shadow-violet-500/20 flex items-center justify-center gap-4 transition-all scale-100 hover:scale-[1.01] active:scale-95 border border-white/10"
                            aria-label={t('btn_ai_summary')}
                        >
                            <BrainCircuit className="w-6 h-6 animate-pulse" aria-hidden="true" />
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-lg tracking-wide leading-none">{t('btn_ai_summary')}</span>
                              <span className="text-[10px] opacity-70 mt-1 uppercase tracking-tighter">English & Arabic Analysis</span>
                            </div>
                            <Stars className="w-5 h-5 opacity-70" aria-hidden="true" />
                        </button>
                    )}

                    {aiLoading && (
                        <div role="status" className="w-full py-16 bg-white dark:bg-slate-900 border-2 border-dashed border-violet-200 dark:border-violet-900/50 rounded-[1.5rem] flex flex-col items-center justify-center gap-6 shadow-inner">
                            <div className="relative">
                                <div className="absolute inset-0 bg-violet-500 blur-2xl opacity-10 animate-pulse"></div>
                                <Sparkles className="w-12 h-12 text-violet-500 animate-spin-slow" />
                            </div>
                            <div className="text-center">
                                <span className="text-lg font-bold text-violet-700 dark:text-violet-300 block">Gemini is processing bilingual insights...</span>
                                <span className="text-sm text-slate-400 mt-2 block font-medium">Reading internal content in EN & AR</span>
                            </div>
                        </div>
                    )}

                    {aiSummary && (
                        <div className="relative p-[2px] bg-gradient-to-br from-violet-400 via-primary-500 to-indigo-600 rounded-[2.2rem] shadow-2xl shadow-violet-500/20 animate-in zoom-in-95 duration-500">
                          <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.1rem] overflow-hidden">
                              {/* AI Header Strip */}
                              <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-violet-100 dark:border-violet-800/30 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-violet-600 rounded-xl shadow-lg shadow-violet-500/30">
                                          <BrainCircuit className="w-4 h-4 text-white" aria-hidden="true" />
                                      </div>
                                      <div className="flex flex-col">
                                        <h4 className="font-black text-violet-700 dark:text-violet-300 text-[10px] uppercase tracking-[0.25em]">{t('ai_summary_title')}</h4>
                                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Bilingual Analysis (EN/AR)</span>
                                      </div>
                                  </div>
                                  <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" aria-hidden="true" />
                              </div>

                              {/* Content Body */}
                              <div className="p-8 md:p-10">
                                  {/* Using unicode-bidi and direction auto for better mixed content handling */}
                                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 font-medium leading-loose" style={{ unicodeBidi: 'plaintext' }}>
                                      {aiSummary.split('\n').map((line, i) => {
                                          const trimmedLine = line.trim();
                                          if (!trimmedLine) return <div key={i} className="h-4" />;
                                          
                                          const isHeader = trimmedLine.match(/^\d\./) || trimmedLine.startsWith('**');
                                          const isBullet = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*');
                                          
                                          // Simple check for Arabic text to adjust alignment if needed
                                          const containsArabic = /[\u0600-\u06FF]/.test(trimmedLine);
                                          
                                          return (
                                              <p 
                                                  key={i} 
                                                  dir={containsArabic ? 'rtl' : 'ltr'}
                                                  className={`
                                                    ${isHeader ? 'font-extrabold text-slate-900 dark:text-white text-lg mt-8 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2' : 'mb-3'}
                                                    ${isBullet ? 'list-item list-disc ml-6 marker:text-violet-500' : ''}
                                                    ${containsArabic ? 'text-right' : 'text-left'}
                                                  `}
                                                  dangerouslySetInnerHTML={{ 
                                                      __html: trimmedLine.replace(/\*\*(.*?)\*\*/g, '<b class="text-violet-700 dark:text-violet-400 font-bold">$1</b>') 
                                                  }}
                                              />
                                          );
                                      })}
                                  </div>

                                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-violet-100 dark:border-violet-800/30 pt-6">
                                      <span className="text-[10px] font-bold text-violet-400 dark:text-violet-500 uppercase tracking-widest flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
                                          Deep File Analysis - Gemini 3.0
                                      </span>
                                      <button 
                                          onClick={handleGenerateSummary}
                                          className="text-[10px] font-black text-slate-400 hover:text-violet-600 transition-colors uppercase tracking-[0.1em] flex items-center gap-2"
                                          aria-label="Rerun Bilingual Analysis"
                                      >
                                          <ChevronDown className="w-3 h-3" />
                                          Rerun Bilingual Analysis
                                      </button>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Decorative Background Element */}
                          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>
                        </div>
                    )}
                </section>

                {/* FILE PREVIEW */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-1 h-6 bg-slate-200 dark:bg-slate-700 rounded-full" aria-hidden="true"></div>
                        <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest">{t('file_preview_title') || 'Original Document Preview'}</h4>
                    </div>
                    {renderContent()}
                </div>

                {/* DESCRIPTION */}
                <div className="p-8 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 text-primary-500" aria-hidden="true" />
                       {t('form_desc')}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{note.description}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 md:px-8 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 border border-slate-200 dark:border-slate-700">
                        {note.uploaderName.charAt(0)}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{t('table_uploader')}</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{note.uploaderName}</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <a 
                        href={note.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-xl transition shadow-xl shadow-slate-900/10 active:scale-95"
                        aria-label={`${t('btn_download')} - ${note.title}`}
                    >
                        <Download className="w-4 h-4" />
                        {t('btn_download')}
                    </a>
                </div>
            </div>
        </div>

        {/* Sidebar (Comments) */}
        {showComments && (
            <div id="comments-sidebar" className="hidden lg:block h-full border-l border-slate-100 dark:border-slate-800 w-[400px]">
                <CommentSection noteId={note.id} />
            </div>
        )}
        
        {/* Mobile Comment Drawer Overlay */}
        {showComments && (
            <div className="lg:hidden absolute inset-0 z-20 bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-right duration-300" role="dialog" aria-label="Comments" aria-modal="false">
                 <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-lg">{t('comments_title')}</h3>
                    <button onClick={() => setShowComments(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" aria-label="Close comments"><X className="w-6 h-6" /></button>
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <CommentSection noteId={note.id} />
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default PreviewModal;