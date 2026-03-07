import React, { useState } from 'react';
import Scanner from './components/Scanner';
import ManualEntry from './components/ManualEntry';
import AttendanceList from './components/AttendanceList';
import SpotRegistration from './components/SpotRegistration';
import AdminLogin from './components/AdminLogin';

function App() {
  const [activeTab, setActiveTab] = useState('scan');

  if (activeTab === 'admin') {
    return <AdminLogin onBack={() => setActiveTab('scan')} />;
  }

  return (
    <div className="min-h-screen bg-[--color-background] text-[--color-secondary] flex flex-col items-center py-8 px-4 transition-colors duration-300 relative">
      {/* HOD Login Button */}
      <button
        onClick={() => setActiveTab('admin')}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs sm:text-sm font-semibold py-2 px-3 sm:px-4 rounded-lg backdrop-blur-sm transition-all shadow-lg hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] z-50 cursor-pointer flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-cyan-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        HOD Login
      </button>

      {/* Header */}
      <header className="mb-8 text-center flex flex-col items-center">
        <div className="w-24 h-24 sm:w-28 sm:h-28 mb-6 rounded-full overflow-hidden bg-slate-900/80 border-[3px] border-cyan-500/40 p-1 shadow-[0_0_25px_rgba(34,211,238,0.3)] flex items-center justify-center transition-all hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(34,211,238,0.5)] group backdrop-blur-xl scale-95 sm:scale-100">
          <img src="/logo.png" alt="MLSC Logo" className="w-full h-full rounded-full object-cover drop-shadow-lg transition-transform group-hover:scale-110 duration-500" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-pulse-slow">
          MLSC Club
        </h1>
        <p className="text-slate-400 font-medium tracking-wide">Event Coordinator Portal</p>
      </header>

      {/* Toggle */}
      <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 mb-8 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('scan')}
          className={`cursor-pointer px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'scan'
            ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          QR Scanner
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`cursor-pointer px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'manual'
            ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('spot')}
          className={`cursor-pointer px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'spot'
            ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          Spot Registration
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`cursor-pointer px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'list'
            ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          List
        </button>
      </div>

      {/* Content */}
      <main className="w-full max-w-4xl">
        <div className={`transition-opacity duration-300 ${activeTab === 'scan' ? 'block' : 'hidden'}`}>
          <Scanner />
        </div>
        <div className={`transition-opacity duration-300 ${activeTab === 'manual' ? 'block' : 'hidden'}`}>
          <ManualEntry />
        </div>
        <div className={`transition-opacity duration-300 ${activeTab === 'spot' ? 'block' : 'hidden'}`}>
          <SpotRegistration />
        </div>
        <div className={`transition-opacity duration-300 ${activeTab === 'list' ? 'block' : 'hidden'}`}>
          <AttendanceList />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 flex flex-col items-center gap-3 text-slate-500 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">Developed by</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/BhargavChowdaryBala"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all group"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="text-slate-300 group-hover:text-white text-xs font-semibold transition-colors">Bhargav Chowdary</span>
          </a>
          <span className="text-slate-600 font-medium">&amp;</span>
          <a
            href="https://github.com/KomeshBathula"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all group"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="text-slate-300 group-hover:text-white text-xs font-semibold transition-colors">Komesh Bathula</span>
          </a>
        </div>
        <span className="text-[10px] text-slate-600 tracking-wider uppercase">&copy; {new Date().getFullYear()} Club Attendance System</span>
      </footer>
    </div>
  );
}

export default App;
