import React, { useState } from 'react';
import Scanner from './components/Scanner';
import ManualEntry from './components/ManualEntry';
import AttendanceList from './components/AttendanceList';
import SpotRegistration from './components/SpotRegistration';

function App() {
  const [activeTab, setActiveTab] = useState('scan');

  return (
    <div className="min-h-screen bg-[--color-background] text-[--color-secondary] flex flex-col items-center py-8 px-4 transition-colors duration-300">
      {/* Header */}
      <header className="mb-8 text-center flex flex-col items-center">
        <div className="w-24 h-24 mb-4 rounded-full bg-white/5 border border-white/10 p-2 shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-sm">
          <img src="/logo.png" alt="MLSC Logo" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
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
      <footer className="mt-12 text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Bhargav | <span className="opacity-50">Club Attendance System</span>
      </footer>
    </div>
  );
}

export default App;
