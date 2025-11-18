import React from 'react';
import { Brain, Search } from 'lucide-react';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ searchTerm, setSearchTerm }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Gemini Cloud
            </h1>
            <nav className="hidden md:flex items-center gap-2">
                <button
                    className={`px-4 py-2 rounded-lg font-medium transition-colors bg-slate-100 text-slate-900`}
                    aria-current="page"
                    >
                    Dashboard
                </button>
                <a
                    href="https://giri-shankar.github.io/ai-analytics-page/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-slate-500 hover:bg-slate-100`}
                    >
                    <Brain className="w-4 h-4" />
                    AI Analytics
                </a>
            </nav>
          </div>
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
