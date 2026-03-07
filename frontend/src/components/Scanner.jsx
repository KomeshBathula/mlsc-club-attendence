import React, { useEffect, useState, useRef, useCallback } from 'react';
import { markAttendance } from '../services/api';
import scannerService from '../services/scannerService';
import { playSuccessBeep, playDuplicateBeep, playErrorBeep } from '../services/beepService';

const Scanner = ({ onScanSuccess, onScan, autoStart = false, id = "reader-custom" }) => {
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [activeCameraId, setActiveCameraId] = useState(null);
    const [scanHistory, setScanHistory] = useState([]);

    // State for duplicate prevention
    const lastScannedCode = useRef(null);
    const lastScannedTime = useRef(0);
    const COOLDOWN_MS = 3000; // 3 seconds before same code can be scanned again

    const readerId = id;

    // Initialize scanner instance once
    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            if (autoStart) {
                // Small delay to ensure DOM is ready and styled
                await new Promise(r => setTimeout(r, 100));
                if (isMounted) startScanning();
            }
        };

        init();

        return () => {
            isMounted = false;
            // Safe cleanup using service
            scannerService.clearSafe();
        };
    }, [autoStart, readerId]);

    const startScanning = useCallback(async (cameraIdToUse = null) => {
        setScanError(null);

        // Debug: check if element exists
        const element = document.getElementById(readerId);
        if (!element) {
            console.error(`Scanner element #${readerId} not found`);
            setScanError("Camera Error: Element not ready. Please retry.");
            return;
        }

        try {
            // Improved config for better recognition - Faster FPS and optimized scanning
            let config = {
                fps: 30, // Max recommended FPS
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const edge = Math.floor(minEdge * 0.85);
                    return { width: edge, height: edge };
                },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                focusMode: "continuous"
            };

            const handleScanResult = (t) => handleScan(t);
            const handleScanError = () => { };

            if (cameraIdToUse) {
                await scannerService.startSafe(readerId, cameraIdToUse, config, handleScanResult, handleScanError);
                setActiveCameraId(cameraIdToUse);
            } else {
                // TRY FAST START with environment camera first
                try {
                    await scannerService.startSafe(readerId, { facingMode: "environment" }, config, handleScanResult, handleScanError);
                    setIsScanning(true);

                    // After startup, get cameras in background for the switcher
                    const { Html5Qrcode } = await import('html5-qrcode');
                    Html5Qrcode.getCameras().then(available => {
                        setCameras(available);
                    }).catch(e => console.warn("Camera list fetch failed", e));

                } catch (err) {
                    console.warn("Environment camera failed, falling back...", err);
                    const { Html5Qrcode } = await import('html5-qrcode');
                    const availableCameras = await Html5Qrcode.getCameras();
                    setCameras(availableCameras);

                    if (availableCameras.length > 0) {
                        const backCamera = availableCameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
                        const targetId = backCamera ? backCamera.id : availableCameras[0].id;
                        setActiveCameraId(targetId);
                        await scannerService.startSafe(readerId, targetId, config, handleScanResult, handleScanError);
                    } else {
                        await scannerService.startSafe(readerId, { facingMode: "user" }, config, handleScanResult, handleScanError);
                    }
                }
            }

            setIsScanning(true);

        } catch (err) {
            let msg = "Unknown error starting camera";
            if (typeof err === 'string') msg = err;
            if (err.message) msg = err.message;
            if (err.name === 'NotAllowedError') msg = "Camera permission denied";
            setScanError(`Camera Error: ${msg}`);
        }
    }, [cameras, readerId]);

    const stopScanning = async () => {
        await scannerService.stopSafe();
        setIsScanning(false);
    };

    const handleSwitchCamera = async () => {
        if (cameras.length < 2) return;
        await stopScanning();
        const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        startScanning(cameras[nextIndex].id);
    };

    const handleScan = async (rawText) => {
        const rollNo = rawText.trim();
        const now = Date.now();

        if (rollNo === lastScannedCode.current && (now - lastScannedTime.current < COOLDOWN_MS)) {
            return;
        }

        lastScannedCode.current = rollNo;
        lastScannedTime.current = now;

        if (navigator.vibrate) try { navigator.vibrate(200); } catch (e) { }

        // If onScan is provided, we just return the result and don't mark attendance automatically
        if (onScan) {
            onScan(rollNo);
            return;
        }

        try {
            const data = await markAttendance(rollNo);

            if (navigator.vibrate) try { navigator.vibrate([100, 50, 100]); } catch (e) { }

            // Play appropriate beep based on HTTP status or response message
            const isAlreadyPresent = data.message?.toLowerCase().includes('already');
            if (isAlreadyPresent) {
                playDuplicateBeep();
            } else {
                playSuccessBeep();
            }

            const historyEntry = {
                id: Date.now(),
                message: data.message,
                student: data.student,
                timestamp: new Date().toLocaleTimeString(),
                isAlreadyPresent
            };

            setScanResult(historyEntry);
            setScanError(null);

            // Add to history (keep last 10)
            setScanHistory(prev => {
                const updated = [historyEntry, ...prev];
                return updated.slice(0, 10);
            });

            onScanSuccess && onScanSuccess(data);

        } catch (err) {
            // Use HTTP status code (404) for robust detection instead of fragile string matching
            const isNotRegistered = err.statusCode === 404;
            if (isNotRegistered) {
                const notRegEntry = {
                    id: Date.now(),
                    message: 'Student Not Registered',
                    student: null,
                    rollNo: rollNo,
                    timestamp: new Date().toLocaleTimeString(),
                    isNotRegistered: true
                };
                setScanResult(notRegEntry);
                setScanError(null);
                playErrorBeep();

                // Add "not registered" entry to history for consistency
                setScanHistory(prev => {
                    const updated = [notRegEntry, ...prev];
                    return updated.slice(0, 10);
                });

                if (navigator.vibrate) try { navigator.vibrate(400); } catch (e) { }
            } else {
                setScanError(err.message);
                setScanResult(null);
                if (navigator.vibrate) try { navigator.vibrate(400); } catch (e) { }
            }
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">

            <style>{`
                #${readerId} video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 1.5rem;
                }
            `}</style>

            {/* Camera Container */}
            <div className="relative w-full aspect-[4/5] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                {/* Always-on element */}
                <div className="absolute inset-0 z-0 bg-black">
                    <div id={readerId} className="w-full h-full"></div>
                </div>

                {/* Start Overlay */}
                {!isScanning && !scanResult && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-slate-300 p-6 text-center transition-all duration-300">
                        {!scanError && (
                            <div className="mb-4 p-4 bg-white/5 rounded-full border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                            </div>
                        )}

                        {!scanError ? (
                            <>
                                <h3 className="text-white text-xl font-bold mb-1 tracking-tight">Ready to Scan</h3>
                                <button
                                    onClick={() => startScanning()}
                                    className="cursor-pointer mt-6 px-8 py-3 bg-primary text-white font-bold rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)] hover:shadow-[0_0_25px_rgba(59,130,246,0.8)] hover:scale-105 transition transform flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Start Camera
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center">
                                <p className="text-red-400 text-sm mb-4 bg-red-950/30 px-3 py-1 rounded-lg border border-red-900/50">{scanError.replace('Camera Error:', '')}</p>
                                <button onClick={() => startScanning()} className="cursor-pointer px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-full border border-slate-700 hover:bg-slate-700 transition">Retry</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Laser Overlay */}
                {isScanning && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                        <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-white/50 rounded-tl-lg"></div>
                        <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-white/50 rounded-tr-lg"></div>
                        <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-white/50 rounded-bl-lg"></div>
                        <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-white/50 rounded-br-lg"></div>
                        <div className="scan-overlay opacity-50 h-0.5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                    </div>
                )}

                {/* Camera Switcher */}
                {isScanning && cameras.length > 1 && (
                    <button
                        onClick={handleSwitchCamera}
                        className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-md border border-white/20 text-white p-2 rounded-full active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                )}

                {/* Scanning Active Indicator - Top Overlay */}
                {isScanning && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white/90 text-[10px] font-bold tracking-wider shadow-lg animate-pulse uppercase">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                            Scanning Active
                        </div>
                    </div>
                )}
            </div>

            {/* Result Card Layout - PERSISTENT */}
            <div className="w-full">
                {scanResult && (
                    <div className="w-full animate-fade-in-up mb-4">
                        <div className={`bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden`}>
                            {/* Glow effect */}
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${scanResult.isNotRegistered
                                ? 'from-red-500 to-rose-500'
                                : 'from-green-500 to-emerald-500'
                                }`}></div>

                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${scanResult.isNotRegistered
                                ? 'bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                : 'bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                }`}>
                                {scanResult.isNotRegistered ? (
                                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                ) : (
                                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                )}
                            </div>
                            <h3 className={`text-lg font-bold leading-tight mb-1 drop-shadow-sm ${scanResult.isNotRegistered ? 'text-red-400' : 'text-green-400'
                                }`}>{scanResult.message}</h3>

                            {scanResult.student && (
                                <div className="mt-3 w-full bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="text-xl font-bold text-white tracking-wide">{scanResult.student.name}</div>
                                    <div className="text-sm font-mono text-slate-400 mt-1">{scanResult.student.rollNo}</div>
                                    <div className="text-xs text-indigo-300/80 mt-1 uppercase tracking-wider font-semibold">{scanResult.student.branch}</div>
                                </div>
                            )}

                            {scanResult.isNotRegistered && (
                                <div className="mt-3 w-full bg-red-950/40 rounded-xl p-3 border border-red-500/10">
                                    <div className="text-sm font-mono text-red-300">{scanResult.rollNo}</div>
                                    <div className="text-xs text-red-400/60 mt-1">This ID is not in the registered list</div>
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className="mt-2 text-xs text-slate-500">
                                Scanned at {scanResult.timestamp}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Error Card - Persistent */}
            {scanError && (
                <div className="w-full animate-fade-in-up mb-4">
                    <div className="bg-red-950/40 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-red-500/20 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-3 border border-red-500/10">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <h3 className="text-lg font-bold text-red-400 leading-tight mb-2">Registration Error</h3>
                        <p className="text-red-200 font-medium text-sm bg-red-950/60 px-3 py-2 rounded-lg break-all border border-red-500/10">
                            {scanError}
                        </p>
                        <div className="mt-2 text-xs text-red-500/70">
                            Scan another to retry
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Scans Feed */}
            {scanHistory.length > 0 && !onScan && (
                <div className="w-full mt-2">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Recent Scans
                        </h4>
                        <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            {scanHistory.length} scan{scanHistory.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-xl bg-slate-900/40 backdrop-blur-md border border-white/5 divide-y divide-white/5 scrollbar-thin">
                        {scanHistory.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                            >
                                {/* Status Dot */}
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${entry.isNotRegistered
                                        ? 'bg-red-400 shadow-red-400/30'
                                        : entry.isAlreadyPresent
                                            ? 'bg-yellow-400 shadow-yellow-400/30'
                                            : 'bg-green-400 shadow-green-400/30'
                                    }`}></div>

                                {/* Student Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-white truncate">
                                            {entry.student?.name || entry.rollNo || 'Unknown'}
                                        </span>
                                        {entry.isAlreadyPresent && (
                                            <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 uppercase tracking-wider flex-shrink-0">
                                                Dup
                                            </span>
                                        )}
                                        {entry.isNotRegistered && (
                                            <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wider flex-shrink-0">
                                                N/R
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 font-mono">
                                        {entry.student?.rollNo || entry.rollNo || ''}
                                    </span>
                                </div>

                                {/* Timestamp */}
                                <span className="text-[10px] text-slate-600 font-medium flex-shrink-0">
                                    {entry.timestamp}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;
