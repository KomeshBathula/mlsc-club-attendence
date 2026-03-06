import React, { useState, useEffect } from 'react';
import { verifyPassword, getAttendance } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminLogin = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // New states for Dashboard features
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [exportMessage, setExportMessage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      getAttendance().then(data => {
        const students = data.students || [];
        const branches = new Set();
        students.forEach(s => {
          if (s.branch) branches.add(s.branch.trim().toUpperCase());
        });
        setAvailableBranches(Array.from(branches).sort());
      }).catch(err => console.error("Error fetching branches:", err));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (exportMessage) {
      const timer = setTimeout(() => {
        setExportMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [exportMessage]);

  // Auto-branch logic based on Year
  useEffect(() => {
    if (selectedYear === '1st Year') {
      setSelectedBranch('BSH');
    } else if (selectedYear !== '' && selectedBranch === 'BSH') {
      setSelectedBranch('');
    }
  }, [selectedYear]);

  const handleExportPDF = async () => {
    if (!selectedYear || !selectedBranch) {
      setExportMessage('Please select both Year and Branch to export.');
      return;
    }

    setIsExporting(true);
    setExportMessage(null);
    try {
      const data = await getAttendance();
      const students = data.students || [];

      // Case-insensitive filtering
      const filtered = students.filter(s => {
        const sYear = (s.year || '').trim().toLowerCase();
        const sBranch = (s.branch || '').trim().toLowerCase();
        const fYear = selectedYear.toLowerCase();
        const fBranch = selectedBranch.toLowerCase();

        let yearBranchMatch = (sYear === fYear && sBranch === fBranch);

        if (!yearBranchMatch) return false;

        if (selectedStatus === 'Present') {
          return s.isPresent === true;
        } else if (selectedStatus === 'Absent') {
          return s.isPresent === false;
        }

        return true; // "All" selected
      });

      // Sort natural alphanumeric by rollNo
      filtered.sort((a, b) => {
        const rollA = (a.rollNo || '').toString().toLowerCase();
        const rollB = (b.rollNo || '').toString().toLowerCase();
        return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
      });

      if (filtered.length === 0) {
        setExportMessage("No students registered for this filter");
        setIsExporting(false);
        return;
      }

      const doc = new jsPDF();
      doc.text(`Attendance Report - ${selectedYear} - ${selectedBranch}`, 14, 15);

      const tableColumn = ["Roll No", "Name", "Branch", "Year", "Status"];
      const tableRows = [];

      filtered.forEach(student => {
        const studentData = [
          student.rollNo || 'N/A',
          student.name || 'N/A',
          student.branch || 'N/A',
          student.year || 'N/A',
          student.isPresent ? 'Present' : 'Absent'
        ];
        tableRows.push(studentData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      const statusSuffix = selectedStatus !== 'All' ? `_${selectedStatus}` : '';
      const fileName = `${selectedBranch}_${selectedYear}${statusSuffix}_Attendance.pdf`;
      doc.save(fileName);

      setExportMessage(`Successfully exported ${filtered.length} students`);
    } catch (err) {
      setExportMessage("Error exporting data: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await verifyPassword(password);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
        >
          <span>←</span> Home
        </button>

        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
        >
          Logout
        </button>

        <div className="flex flex-col items-center w-full max-w-4xl animate-fade-in-up">
          <img src="/logo.png" alt="MLSC Logo" className="h-20 sm:h-28 mb-6 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 duration-300" />

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-8 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            HOD Dashboard
          </h1>

          <div className="bg-white/5 border border-white/10 p-8 rounded-2xl w-full shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-start min-h-[400px]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            <h2 className="text-2xl font-bold text-white mb-2 mt-2">Welcome, HOD!</h2>
            <p className="text-slate-400 mb-8">Export attendance lists from the Google Sheet.</p>

            <div className="w-full max-w-md space-y-6">
              {/* Filters */}
              <div className="flex flex-col gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Year</label>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                    >
                      <option value="" disabled>Choose Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Branch</label>
                  <div className="relative">
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                    >
                      <option value="" disabled>Choose Branch</option>
                      {selectedYear === '1st Year' ? (
                        <option value="BSH">BSH</option>
                      ) : (
                        availableBranches.map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))
                      )}     </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Status</label>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                    >
                      <option value="All">All Students</option>
                      <option value="Present">Present Only</option>
                      <option value="Absent">Absent Only</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Message */}
              {exportMessage && (
                <div
                  onClick={() => setExportMessage(null)}
                  className={`p-4 mt-4 rounded-xl text-sm font-medium border cursor-pointer animate-fade-in-up ${exportMessage.includes("No students") ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : exportMessage.includes("Error") ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"} transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <span>{exportMessage}</span>
                    <svg className="w-4 h-4 opacity-70 hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className={`w-full py-4 mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isExporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
      >
        <span>←</span> Home
      </button>

      {/* Main Content */}
      <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up">
        {/* Logo area */}
        <img src="/logo.png" alt="MLSC Logo" className="h-20 sm:h-28 mb-6 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-transform hover:scale-105 duration-300" />

        {/* Heading container */}
        <div className="text-center mb-8 w-full px-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-3 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            Hello this is admin login page
          </h1>
          <p className="text-slate-400 font-medium">Please sign in to access HOD dashboard.</p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-2xl w-full relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-400 text-xs italic">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
