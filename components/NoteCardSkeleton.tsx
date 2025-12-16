import React from 'react';

const NoteCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-5"></div>
      
      <div className="flex gap-2 mb-6">
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
        <div className="flex gap-2">
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  );
};

export default NoteCardSkeleton;