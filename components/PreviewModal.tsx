import React, { useState, useRef, useEffect } from 'react';
import { X, Download, BrainCircuit, Sparkles, MessageSquare, Stars, ChevronDown, Zap, CheckCircle2, FileText, HelpCircle, Map, Tag, MessageCircleQuestion, Send, Bot, RotateCcw, User as UserIcon, PanelRightClose, PanelRightOpen, ArrowLeft, Check, AlertCircle } from 'lucide-react';
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
  initialAiTask?: 'SUMMARY' | 'QUIZ' | 'ROADMAP' | 'TAGS' | 'EXPLAIN';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const QuizView: React.FC<{ content: string }> = ({ content }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        try {
            // Sanitize content: remove markdown code blocks if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            if (Array.isArray(parsed)) {
                setQuestions(parsed);
            } else {
                console.error("Quiz data is not an array:", parsed);
                setError(true);
            }
        } catch (e) {
            console.error("Failed to parse Quiz JSON:", e);
            setError(true);
        }
    }, [content]);

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-sm">
                <p className="font-bold mb-1">Error loading quiz</p>
                <p>The AI response format was invalid. Please try generating the quiz again.</p>
            </div>
        );
    }

    if (questions.length === 0) return null;

    const handleSelect = (qIndex: number, optionIndex: number) => {
        if (showResults) return;
        setAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
    };

    const score = questions.reduce((acc, q, i) => {
        return acc + (answers[i] === q.correctAnswer ? 1 : 0);
    }, 0);

    return (
        <div className="space-y-6 w-full max-w-full">
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <span className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" /> Quiz
                </span>
                {showResults && (
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                        Score: {score} / {questions.length}
                    </span>
                )}
            </div>

            <div className="space-y-6">
                {questions.map((q, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-4 text-base">
                            <span className="text-violet-500 mr-2">Q{i + 1}.</span>
                            {q.question}
                        </p>
                        <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                                const isSelected = answers[i] === optIdx;
                                const isCorrect = q.correctAnswer === optIdx;
                                let btnClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700";
                                
                                if (showResults) {
                                    if (isCorrect) btnClass = "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200";
                                    else if (isSelected) btnClass = "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200";
                                    else btnClass = "opacity-50";
                                } else if (isSelected) {
                                    btnClass = "bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500";
                                }

                                return (
                                    <button
                                        key={optIdx}
                                        onClick={() => handleSelect(i, optIdx)}
                                        disabled={showResults}
                                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center justify-between ${btnClass}`}
                                    >
                                        <span>{opt}</span>
                                        {showResults && isCorrect && <Check className="w-4 h-4" />}
                                        {showResults && isSelected && !isCorrect && <X className="w-4 h-4" />}
                                    </button>
                                );
                            })}
                        </div>
                        {showResults && (
                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                                <strong className="text-slate-700 dark:text-slate-300">Explanation:</strong> {q.explanation}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!showResults && (
                <button
                    onClick={() => setShowResults(true)}
                    disabled={Object.keys(answers).length < questions.length}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl transition shadow-lg shadow-violet-500/20"
                >
                    Submit Quiz
                </button>
            )}
        </div>
    );
};

const PreviewModal: React.FC<PreviewModalProps> = ({ note, onClose, initialAiTask }) => {
  const { t, dir } = useLanguage();
  const [numPages, setNumPages] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  
  // Layout State
  const [activeTab, setActiveTab] = useState<'ai' | 'comments'>('ai');
  const [showSidebar, setShowSidebar] = useState(true);

  // AI State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
        const saved = localStorage.getItem(`unishare_chat_${note.id}`);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [aiLanguage, setAiLanguage] = useState<'ar' | 'en'>('ar');
  
  // Ref to track if initial task has run
  const hasRunInitialTask = useRef(false);

  useEffect(() => {
      return () => { isMounted.current = false; };
  }, []);

  // Persist chat history
  useEffect(() => {
    localStorage.setItem(`unishare_chat_${note.id}`, JSON.stringify(chatHistory));
  }, [chatHistory, note.id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const addMessage = (role: 'user' | 'model', content: string) => {
    if (!isMounted.current) return;
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      timestamp: Date.now()
    };
    setChatHistory(prev => [...prev, newMessage]);
  };

  const handleAiTask = async (task: 'SUMMARY' | 'QUIZ' | 'ROADMAP' | 'TAGS' | 'EXPLAIN', query?: string) => {
    setAiLoading(true);
    
    // Ensure AI tab is open
    setActiveTab('ai');
    setShowSidebar(true);
    
    // Add user message to UI for context
    let displayQuery = query;
    if (!displayQuery) {
        switch(task) {
            case 'SUMMARY': displayQuery = t('btn_ai_summary'); break;
            case 'QUIZ': displayQuery = t('btn_ai_quiz'); break;
            case 'ROADMAP': displayQuery = t('btn_ai_roadmap'); break;
            case 'TAGS': displayQuery = t('btn_ai_tags'); break;
            default: displayQuery = 'Analyze';
        }
    }
    
    addMessage('user', displayQuery);
    setUserQuery(''); // Clear input

    // Client-side greeting interception
    if (task === 'EXPLAIN' && query) {
        const lower = query.trim().toLowerCase();
        // Regex for common greetings (hi, hello, hey, etc.) with optional punctuation
        const greetingRegex = /^(hi|hello|hey|heya|howdy|greetings|salam|marhaba|hola|bonjour|good\s*morning|good\s*evening)[\s.!,]*$/i;
        
        if (greetingRegex.test(lower)) {
            // Simulate a brief delay for natural feel, then respond locally
            setTimeout(() => {
                if (isMounted.current) {
                    addMessage('model', t('ai_greeting'));
                    setAiLoading(false);
                }
            }, 600);
            return;
        }
    }

    try {
        const result = await mockDb.generateAiContent(note.id, task, query, aiLanguage);
        if (isMounted.current) {
            addMessage('model', result);
        }
    } catch (e) {
        if (isMounted.current) {
            addMessage('model', "Sorry, I encountered an error processing that request.");
        }
    } finally {
        if (isMounted.current) {
            setAiLoading(false);
        }
    }
  };

  const handleExplainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    handleAiTask('EXPLAIN', userQuery);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (resultRef.current) {
        resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [chatHistory, aiLoading, activeTab, showSidebar]);

  // Handle Initial Task
  useEffect(() => {
    if (initialAiTask && !hasRunInitialTask.current) {
        hasRunInitialTask.current = true;
        handleAiTask(initialAiTask);
    }
  }, [initialAiTask]);

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
          className="bg-slate-100 dark:bg-slate-800 flex justify-center p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner min-h-[500px]"
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

  // Helper to render markdown-like content safely
  const renderMessageContent = (content: string) => {
     const cleanContent = content.trim();

     // Check for JSON Quiz format (naive check)
     if ((cleanContent.startsWith('[') && cleanContent.includes('"question"')) || cleanContent.includes('```json')) {
         // Attempt to find the array part if mixed with text
         if (cleanContent.includes('"question"') && cleanContent.includes('"options"')) {
             return <QuizView content={cleanContent} />;
         }
     }

     return content.split('\n').map((line, i) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return <div key={i} className="h-2" />;
        
        const isHeader = trimmedLine.match(/^##+\s/) || trimmedLine.match(/^\d\./);
        const isBullet = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('* ');
        const containsArabic = /[\u0600-\u06FF]/.test(trimmedLine);
        
        return (
            <p 
                key={i} 
                dir={containsArabic ? 'rtl' : 'ltr'}
                className={`
                ${isHeader ? 'font-bold text-base mt-2 mb-1 text-slate-900 dark:text-slate-100' : 'mb-1 text-sm leading-relaxed'}
                ${isBullet ? 'list-item list-disc ml-4 rtl:mr-4 marker:text-slate-400' : ''}
                ${containsArabic ? 'text-right' : 'text-left'}
                `}
                dangerouslySetInnerHTML={{ 
                    __html: trimmedLine
                    .replace(/^##+\s*/, '')
                    .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-slate-900 dark:text-white">$1</span>')
                    .replace(/\*(.*?)\*/g, '<span class="italic">$1</span>')
                    .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono text-xs">$1</code>')
                }}
            />
        );
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-[1600px] h-[95vh] flex flex-col overflow-hidden border border-white/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
        dir={dir}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20">
            <div className="flex items-center gap-4 overflow-hidden">
                <div className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400" aria-hidden="true">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0">
                    <h3 id="preview-modal-title" className="font-bold text-xl text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-md">{note.title}</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{note.major}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 hidden md:flex">
                     <button 
                        onClick={() => { setActiveTab('ai'); setShowSidebar(true); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'ai' && showSidebar ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                     >
                        <Sparkles className="w-4 h-4" />
                        AI Assistant
                     </button>
                     <button 
                        onClick={() => { setActiveTab('comments'); setShowSidebar(true); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'comments' && showSidebar ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                     >
                        <MessageSquare className="w-4 h-4" />
                        Comments
                     </button>
                </div>

                <button 
                    onClick={() => setShowSidebar(!showSidebar)} 
                    className="md:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    aria-label="Toggle Sidebar"
                >
                    {showSidebar ? <PanelRightClose className="w-5 h-5 text-slate-500" /> : <PanelRightOpen className="w-5 h-5 text-slate-500" />}
                </button>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

                <button 
                    onClick={onClose} 
                    className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors group"
                    aria-label={t('modal_close')}
                >
                    <X className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                </button>
            </div>
        </div>

        {/* Split Body */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: File Preview (Always visible on desktop, hidden on mobile if sidebar is open) */}
            <div className={`flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-black/20 overflow-y-auto transition-all ${showSidebar ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-6 md:p-8 space-y-8 flex-1">
                     {/* Preview Container */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                                <h4 className="font-bold text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wide">{t('file_preview_title') || 'Document Preview'}</h4>
                            </div>
                        </div>
                        {renderContent()}
                    </div>

                    {/* Description */}
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            {t('form_desc')}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{note.description}</p>
                    </div>

                    {/* Footer in Left Pane */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-4 border-t border-slate-200 dark:border-slate-800/50">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                                {note.uploaderName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('table_uploader')}</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{note.uploaderName}</p>
                            </div>
                        </div>
                        <a 
                            href={note.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-xl transition shadow-xl shadow-slate-900/10 active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            {t('btn_download')}
                        </a>
                    </div>
                </div>
            </div>

            {/* RIGHT: Sidebar (AI / Comments) */}
            {showSidebar && (
                <div className="w-full lg:w-[450px] flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-10 shadow-2xl lg:shadow-none">
                    
                    {/* Mobile Sidebar Tab Switcher (Visible only on mobile) */}
                    <div className="lg:hidden flex border-b border-slate-100 dark:border-slate-800">
                        <button 
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500'}`}
                        >
                            <Sparkles className="w-4 h-4" /> AI
                        </button>
                        <button 
                            onClick={() => setActiveTab('comments')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'comments' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}
                        >
                            <MessageSquare className="w-4 h-4" /> Comments
                        </button>
                    </div>

                    {activeTab === 'ai' ? (
                        <div className="flex flex-col h-full">
                            {/* AI Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg shadow-lg shadow-violet-500/20">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-none">UniShare AI</h3>
                                        <span className="text-[10px] text-slate-400 font-medium">Powered by Gemini</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
                                        <button onClick={() => setAiLanguage('ar')} className={`px-2 py-1 text-[10px] font-bold rounded transition ${aiLanguage === 'ar' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-400'}`}>AR</button>
                                        <button onClick={() => setAiLanguage('en')} className={`px-2 py-1 text-[10px] font-bold rounded transition ${aiLanguage === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-400'}`}>EN</button>
                                    </div>
                                    {chatHistory.length > 0 && (
                                        <button onClick={() => setChatHistory([])} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" title="Clear">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div ref={resultRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-black/20 scroll-smooth">
                                {chatHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8 opacity-60">
                                        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-full flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-violet-500" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                            I can read this document for you.<br/>Ask me anything or pick a tool below!
                                        </p>
                                    </div>
                                ) : (
                                    chatHistory.map((msg) => (
                                        <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm mt-1 ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-violet-600 border border-slate-200 dark:border-slate-700'}`}>
                                                    {msg.role === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                                                </div>
                                                <div className={`rounded-2xl px-4 py-3 shadow-sm text-sm border ${msg.role === 'user' ? 'bg-primary-600 text-white border-primary-500 rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 rounded-tl-sm w-full'}`}>
                                                    {msg.role === 'user' ? <p>{msg.content}</p> : <div className="w-full">{renderMessageContent(msg.content)}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {aiLoading && (
                                     <div className="flex w-full justify-start">
                                         <div className="flex gap-3 max-w-[85%]">
                                             <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white dark:bg-slate-800 text-violet-600 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm mt-1">
                                                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                                             </div>
                                             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                                                 <span className="flex gap-1"><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0.1s]"></span><span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0.2s]"></span></span>
                                                 <span className="text-xs font-medium text-slate-400">Thinking...</span>
                                             </div>
                                         </div>
                                     </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex flex-wrap gap-2 mb-3">
                                     {[
                                         { id: 'SUMMARY', label: t('btn_ai_summary'), icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                                         { id: 'QUIZ', label: t('btn_ai_quiz'), icon: HelpCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                                         { id: 'ROADMAP', label: t('btn_ai_roadmap'), icon: Map, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                                         { id: 'TAGS', label: t('btn_ai_tags'), icon: Tag, color: 'text-purple-600 bg-purple-50 border-purple-200' }
                                     ].map(action => (
                                         <button 
                                            key={action.id}
                                            onClick={() => handleAiTask(action.id as any)}
                                            disabled={aiLoading}
                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${action.color} dark:bg-opacity-10 dark:border-opacity-20`}
                                         >
                                             <action.icon className="w-3 h-3" /> {action.label}
                                         </button>
                                     ))}
                                </div>
                                <form onSubmit={handleExplainSubmit} className="relative">
                                    <input 
                                        type="text"
                                        value={userQuery}
                                        onChange={(e) => setUserQuery(e.target.value)}
                                        disabled={aiLoading}
                                        placeholder={t('ai_input_placeholder')}
                                        className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 border focus:border-violet-500 rounded-xl text-sm transition-all outline-none"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!userQuery.trim() || aiLoading}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-slate-400"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <CommentSection noteId={note.id} className="flex-1" />
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;