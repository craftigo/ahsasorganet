import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  CheckCircle2,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import { CameraQrReader } from '../../components/scanner/CameraQrReader';
import { parentMeetService } from '../../services/parentMeetService';
import { scannerAudio } from '../../utils/scannerAudio';
import { ScanVerificationResult } from '../../../../shared/types';

export default function ExpoScannerPage(): JSX.Element {
  const [stationKey] = useState<string>('EXPO-PASS-2026');
  const [staffName] = useState<string>('Expo Reception');
  const [scanResult, setScanResult] = useState<ScanVerificationResult | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [stats, setStats] = useState<{ approved: number; denied: number }>({ approved: 0, denied: 0 });

  const processScan = async (qrOrManual: string, isManual = false) => {
    if (isProcessing || !qrOrManual.trim()) return;
    setIsProcessing(true);

    try {
      const res = await parentMeetService.verifyScan({
        station_type: 'expo',
        station_key: stationKey,
        qr_token: isManual ? undefined : qrOrManual.trim(),
        manual_id: isManual ? qrOrManual.trim() : undefined,
        staff_name: staffName
      });

      setScanResult(res);

      if (res.success && res.result_code === 'EXPO_APPROVED') {
        scannerAudio.playSuccess();
        setStats((prev) => ({ ...prev, approved: prev.approved + 1 }));
      } else {
        scannerAudio.playError();
        setStats((prev) => ({ ...prev, denied: prev.denied + 1 }));
      }
    } catch (err: any) {
      scannerAudio.playError();
      setScanResult({
        success: false,
        result_code: 'REGISTRATION_NOT_FOUND',
        message: err.message || 'Scan error occurred.'
      });
      setStats((prev) => ({ ...prev, denied: prev.denied + 1 }));
    } finally {
      setIsProcessing(false);
      setManualInput('');
    }
  };

  const resetResult = () => {
    setScanResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-sky-500/20 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black shadow-md">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider block">Station 1: Expo</span>
              <h1 className="text-sm font-black text-white">Edu Expo Entrance Scanner</h1>
            </div>
          </div>

          <Link
            to="/admin/parent-meet"
            className="text-[11px] font-bold text-sky-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition"
          >
            Admin Panel
          </Link>
        </div>
      </header>

      {/* Main Scanner Section */}
      <main className="max-w-md mx-auto w-full px-4 py-6 space-y-5 my-auto">
        {/* Status Pills */}
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Strict One-Time Entry</span>
          </span>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400">✓ {stats.approved} Approved</span>
            <span>•</span>
            <span className="text-rose-400">✕ {stats.denied} Denied</span>
          </div>
        </div>

        {/* SCAN RESULT OVERLAY OR ACTIVE CAMERA */}
        {scanResult ? (
          <div className="animate-fade-in">
            {scanResult.success ? (
              /* GREEN SUCCESS SCREEN */
              <div className="bg-gradient-to-b from-emerald-600 to-emerald-900 rounded-3xl p-6 text-center text-white border-4 border-emerald-400 shadow-2xl space-y-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
                    Status: Approved
                  </span>
                  <h2 className="text-2xl font-black mt-2 tracking-wide">EXPO ENTRY APPROVED</h2>
                  <p className="text-xs text-emerald-100 font-semibold mt-0.5">One-time entry recorded successfully.</p>
                </div>

                {scanResult.registration && (
                  <div className="bg-black/30 rounded-2xl p-4 text-xs text-left space-y-2 border border-white/10">
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-emerald-200">Parent:</span>
                      <span className="font-extrabold text-sm">{scanResult.registration.parent_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-emerald-200">Student:</span>
                      <span className="font-bold">{scanResult.registration.student_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-emerald-200">Attendees:</span>
                      <span className="font-bold text-amber-300">
                        {scanResult.registration.attendees_count} Members
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-200">Reg ID:</span>
                      <span className="font-mono font-bold">{scanResult.registration.registration_number}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={resetResult}
                  className="w-full py-3.5 rounded-2xl bg-white text-emerald-950 font-black text-sm shadow-xl hover:bg-emerald-50 transition cursor-pointer"
                >
                  Scan Next Parent Pass
                </button>
              </div>
            ) : (
              /* RED REJECTION SCREEN */
              <div className="bg-gradient-to-b from-rose-700 to-rose-950 rounded-3xl p-6 text-center text-white border-4 border-rose-500 shadow-2xl space-y-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <XCircle className="w-12 h-12 text-rose-600" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
                    Entry Denied
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black mt-2 text-rose-100">
                    {scanResult.result_code === 'EXPO_ALREADY_ENTERED'
                      ? 'ALREADY ENTERED – RE-ENTRY NOT ALLOWED'
                      : scanResult.message}
                  </h2>
                  <p className="text-xs text-rose-200 font-semibold mt-1">
                    Expo permits one single entry per registration.
                  </p>
                </div>

                {scanResult.details?.original_timestamp && (
                  <div className="bg-black/40 rounded-2xl p-4 text-xs text-left space-y-1.5 border border-white/10">
                    <span className="text-rose-200 font-bold block text-[10px] uppercase">
                      Original Entry Recorded At:
                    </span>
                    <p className="font-mono text-sm text-white font-bold">
                      {new Date(scanResult.details.original_timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                    {scanResult.registration && (
                      <p className="text-[11px] text-rose-200 pt-1 border-t border-white/10">
                        Parent: <strong>{scanResult.registration.parent_name}</strong> (
                        {scanResult.registration.registration_number})
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={resetResult}
                  className="w-full py-3.5 rounded-2xl bg-white text-rose-950 font-black text-sm shadow-xl hover:bg-rose-50 transition cursor-pointer"
                >
                  Scan Another Pass
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE CAMERA VIEWFINDER */
          <div className="space-y-4">
            <CameraQrReader onScanSuccess={(text) => processScan(text, false)} paused={isProcessing} />

            {/* Manual Lookup Fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processScan(manualInput, true);
              }}
              className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Manual Fallback Lookup (Reg ID or WhatsApp)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. EF-2026-0001 or 9847..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-grow px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="bg-slate-900 border-t border-slate-800 p-3 text-center text-[10px] text-slate-400">
        Expo Entrance Scanner • AHSAS Event Management System
      </footer>
    </div>
  );
}
