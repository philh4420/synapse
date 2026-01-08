import React from 'react';

interface HeaderProps {
  title: string;
  showTabs?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showTabs }) => {
  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 hidden lg:block">
      <div className="max-w-2xl mx-auto w-full">
        {!showTabs ? (
           <div className="px-4 py-4 flex items-center h-[60px]">
             <h2 className="text-xl font-bold text-slate-900">{title}</h2>
           </div>
        ) : (
          <div className="flex h-[60px]">
            <div className="flex-1 flex items-center justify-center cursor-pointer hover:bg-slate-50/80 transition-colors relative group">
              <span className="font-bold text-slate-900 text-[15px]">For you</span>
              <div className="absolute bottom-0 h-[4px] bg-synapse-600 rounded-full w-14"></div>
            </div>
            <div className="flex-1 flex items-center justify-center cursor-pointer hover:bg-slate-50/80 transition-colors relative group">
              <span className="font-medium text-slate-500 text-[15px] group-hover:text-slate-900">Following</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};