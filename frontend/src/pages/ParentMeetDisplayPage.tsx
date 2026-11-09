import { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  Calendar,
  MapPin,
  Sparkles,
  CheckCircle2,
  Search,
  Camera,
  X,
  Clock,
  Building,
  Users,
  Utensils,
  QrCode
} from 'lucide-react';
import { parentMeetService } from '../services/parentMeetService';
import { ParentMeetSettings } from '../../../shared/types';
import { DEFAULT_PARENT_MEET_SETTINGS } from '../../../shared/data/parentMeetDefaults';
import { CameraQrReader } from '../components/scanner/CameraQrReader';
import { scannerAudio } from '../utils/scannerAudio';

interface PersonalizedPassView {
  registration: {
    id: string;
    registration_number: string;
    parent_name: string;
    whatsapp_number: string;
    student_name: string;
    student_class: string;
    attendees_count: number;
    pass_status: string;
  };
  event: {
    name: string;
    subtitle: string;
    description: string;
    date: string;
    day: string;
    venue: string;
    location: string;
    programme: Array<{ time: string; title: string; location: string }>;
  };
  statuses: {
    expo_entered: boolean;
    expo_entry_time: string | null;
    meeting_attended: boolean;
    meeting_attendance_time: string | null;
    food_status: 'pending_meeting' | 'eligible' | 'redeemed';
    food_redeemed_at: string | null;
    food_tokens_allocated: number;
    food_tokens_redeemed: number;
  };
}

export default function ParentMeetDisplayPage(): JSX.Element {
  const [settings, setSettings] = useState<ParentMeetSettings>(DEFAULT_PARENT_MEET_SETTINGS);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Kiosk / Scanner controls
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [kioskInput, setKioskInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Scanned Parent Profile State
  const [activeProfile, setActiveProfile] = useState<PersonalizedPassView | null>(null);
  const [countdown, setCountdown] = useState<number>(20);

  // Hardware Barcode / QR Scanner Buffer
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    parentMeetService.getSettings().then((s) => setSettings(s));

    // Digital clock running every second
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Hardware USB 2D Barcode / QR Scanner rapid keystroke listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is intentionally typing into an input element
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const now = Date.now();
      // If keystrokes arrive rapidly (< 60ms apart), it is a barcode scanner
      if (now - lastKeyTimeRef.current > 150) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.trim().length >= 4) {
          processScannedToken(barcodeBufferRef.current.trim());
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Countdown timer for returning to ambient stage display
  useEffect(() => {
    if (!activeProfile) return;

    setCountdown(20);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setActiveProfile(null);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeProfile]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Securely retrieve parent data & activity statuses by scanned personal token / ID
  const processScannedToken = async (rawTokenOrId: string) => {
    if (!rawTokenOrId.trim()) return;
    setIsLoading(true);
    setErrorMessage('');

    try {
      let clean = rawTokenOrId.trim();
      if (clean.includes('/event/pass/')) {
        clean = clean.split('/event/pass/')[1].split(/[?#/]/)[0].trim();
      }

      const passData = await parentMeetService.getPassByToken(clean);
      if (passData && passData.registration) {
        setActiveProfile(passData);
        scannerAudio.playSuccess();
        setIsCameraActive(false); // Close camera once scanned
      } else {
        setErrorMessage('Personal QR Pass not recognized in database.');
        scannerAudio.playError();
      }
    } catch {
      setErrorMessage('Personal QR Pass not found. Please register or verify your ID.');
      scannerAudio.playError();
    } finally {
      setIsLoading(false);
      setKioskInput('');
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (kioskInput.trim()) {
      processScannedToken(kioskInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-slate-900 to-sky-900 text-white font-sans flex flex-col justify-between p-6 sm:p-10 select-none overflow-x-hidden relative">
      {/* Stage Backdrop Lights */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Clock & Fullscreen Controls */}
      <header className="flex items-center justify-between border-b border-sky-400/20 pb-4 z-20">
        <div className="flex items-center gap-3">
          <img src="/assets/ahsas logo png logo.png" alt="AHSAS Logo" className="h-10 w-auto object-contain drop-shadow" />
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-sky-300 block">
              {settings.organizer}
            </span>
            <span className="text-[11px] text-sky-100 font-semibold">{settings.venue}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-5 py-2 rounded-2xl bg-sky-950/90 border border-sky-400/30 text-sky-200 font-mono font-black text-xl tracking-wider shadow-inner">
            {currentTime || '08:30:00 AM'}
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white/80 hover:text-white cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* =====================================================================
          VIEWPORT 1: PERSONALIZED PARENT SCREEN (When Personal QR is Scanned)
      ===================================================================== */}
      {activeProfile ? (
        <main className="my-auto z-20 py-6 max-w-6xl mx-auto w-full animate-fade-in space-y-6">
          {/* Top Banner with Countdown & Close */}
          <div className="flex items-center justify-between bg-sky-900/60 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-sky-400/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase font-black tracking-widest text-sky-200">
                Personalized Attendee Dashboard Verified
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono font-bold text-sky-300">
                Auto-resetting in <strong className="text-white text-sm">{countdown}s</strong>
              </span>
              <button
                onClick={() => setActiveProfile(null)}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Return to Stage</span>
              </button>
            </div>
          </div>

          {/* Main Profile & Event Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Personalized Parent Greeting & Metadata */}
            <div className="lg:col-span-5 bg-gradient-to-br from-sky-800 to-sky-950 p-8 rounded-3xl border-2 border-sky-400/40 shadow-2xl flex flex-col justify-between space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider text-sky-200 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Welcome Dear Parent</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  {activeProfile.registration.parent_name}
                </h2>

                <div className="mt-4 space-y-2 text-sm text-sky-100">
                  <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                    <span className="text-[11px] uppercase tracking-wider text-sky-300 block font-bold">Child / Student:</span>
                    <span className="font-extrabold text-base text-white">
                      {activeProfile.registration.student_name}
                    </span>
                    {activeProfile.registration.student_class && (
                      <span className="text-xs text-sky-200 block font-medium">
                        Class / Dept: {activeProfile.registration.student_class}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-sky-300 block">Registration ID:</span>
                      <strong className="text-white text-xs">{activeProfile.registration.registration_number}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-sky-300 block">Registered Family:</span>
                      <strong className="text-white text-xs">{activeProfile.registration.attendees_count} Members</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Context & Privacy Notice */}
              <div className="pt-4 border-t border-sky-400/20 text-[11px] text-sky-200/80 leading-relaxed">
                <p className="italic">
                  "{activeProfile.event.name} — {activeProfile.event.subtitle}"
                </p>
                <p className="mt-2 text-[10px] text-sky-300">
                  🔒 Privacy protected: Contact details masked on external public screen.
                </p>
              </div>
            </div>

            {/* Right Column: The 3 Live Activity Statuses */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="bg-sky-950/80 backdrop-blur-xl p-6 rounded-3xl border border-sky-400/30 shadow-xl space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-sky-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Personal Activity & Checkpoint Statuses</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Status 1: Expo Entry */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      activeProfile.statuses.expo_entered
                        ? 'bg-emerald-950/70 border-emerald-400/50'
                        : 'bg-slate-900/70 border-sky-400/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          activeProfile.statuses.expo_entered
                            ? 'bg-emerald-400 text-emerald-950'
                            : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        }`}
                      >
                        {activeProfile.statuses.expo_entered ? 'Entered' : 'Pending'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-200 block">1. Edu Expo Entry</span>
                    <span className="text-[11px] font-mono text-sky-300 block mt-1">
                      {activeProfile.statuses.expo_entered
                        ? `✓ ${new Date(activeProfile.statuses.expo_entry_time || '').toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}`
                        : 'Gate Check Ready'}
                    </span>
                  </div>

                  {/* Status 2: Main Meeting Attendance */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      activeProfile.statuses.meeting_attended
                        ? 'bg-purple-950/70 border-purple-400/50'
                        : 'bg-slate-900/70 border-sky-400/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          activeProfile.statuses.meeting_attended
                            ? 'bg-purple-400 text-purple-950'
                            : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        }`}
                      >
                        {activeProfile.statuses.meeting_attended ? 'Attended' : 'Pending'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-200 block">2. Main Auditorium</span>
                    <span className="text-[11px] font-mono text-purple-300 block mt-1">
                      {activeProfile.statuses.meeting_attended
                        ? `✓ ${new Date(activeProfile.statuses.meeting_attendance_time || '').toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}`
                        : 'Attendance Required'}
                    </span>
                  </div>

                  {/* Status 3: Food Token Status */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      activeProfile.statuses.food_status === 'redeemed'
                        ? 'bg-emerald-950/70 border-emerald-400/50'
                        : activeProfile.statuses.food_status === 'eligible'
                        ? 'bg-amber-950/70 border-amber-400/50 animate-pulse'
                        : 'bg-slate-900/70 border-sky-400/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          activeProfile.statuses.food_status === 'redeemed'
                            ? 'bg-emerald-400 text-emerald-950'
                            : activeProfile.statuses.food_status === 'eligible'
                            ? 'bg-amber-400 text-amber-950 font-black'
                            : 'bg-rose-400/20 text-rose-300 border border-rose-400/30'
                        }`}
                      >
                        {activeProfile.statuses.food_status === 'redeemed'
                          ? 'Redeemed'
                          : activeProfile.statuses.food_status === 'eligible'
                          ? 'Eligible'
                          : 'Locked'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-200 block">3. Food Token</span>
                    <span className="text-[11px] font-mono text-amber-300 block mt-1">
                      {activeProfile.statuses.food_status === 'redeemed'
                        ? `✓ Redeemed`
                        : activeProfile.statuses.food_status === 'eligible'
                        ? '🍽️ Ready to Collect'
                        : 'Requires Meeting Scan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Programme Schedule Widget */}
              <div className="bg-sky-950/60 p-5 rounded-3xl border border-sky-400/20 space-y-3">
                <span className="text-xs font-black uppercase tracking-widest text-sky-300 block">
                  Today's Event Programme
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(activeProfile.event.programme || settings.event_programme).slice(0, 4).map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-200 text-[10px] font-mono font-bold shrink-0">
                        {p.time}
                      </span>
                      <span className="truncate text-white font-semibold text-[11px]">{p.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* =====================================================================
            VIEWPORT 2: AMBIENT STAGE / KIOSK SCANNING MODE (Default)
        ===================================================================== */
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto z-20 py-6 items-center">
          {/* Left Column: Event Branding & Official Programme */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/40 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Islamic Parents' Meet & Educational Conclave</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white font-serif drop-shadow-md">
                {settings.event_name}
              </h1>
              <p className="text-2xl sm:text-3xl font-black tracking-widest text-sky-300 uppercase">
                {settings.event_subtitle}
              </p>
            </div>

            <p className="text-sm sm:text-base text-sky-100 max-w-2xl leading-relaxed italic border-l-4 border-sky-400 pl-4 bg-white/5 py-2 rounded-r-xl">
              "{settings.event_description}"
            </p>

            <div className="flex flex-wrap gap-3 text-xs sm:text-sm font-bold pt-1">
              <span className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-300" />
                <span>09 November 2026 (Monday)</span>
              </span>
              <span className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-300" />
                <span>{settings.venue}, Koyilandy</span>
              </span>
            </div>

            {/* Event Programme Schedule Box */}
            <div className="p-4 rounded-2xl bg-sky-950/70 border border-sky-400/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-sky-300 font-bold border-b border-sky-400/20 pb-2">
                <span className="uppercase tracking-wider">Day Programme Itinerary</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {settings.event_programme.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sky-100">
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-200 text-[10px] font-mono font-bold shrink-0">
                      {p.time}
                    </span>
                    <span className="text-[11px] truncate font-medium">{p.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcement Ticker */}
            <div className="p-3.5 rounded-2xl bg-sky-950/90 border border-sky-400/30 text-xs text-sky-200 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="font-bold tracking-wide">{settings.public_announcements}</span>
            </div>
          </div>

          {/* Right Column: Personal QR Pass Kiosk & Scanner */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="bg-sky-950/90 backdrop-blur-xl p-8 rounded-3xl border-2 border-sky-300/40 text-center space-y-5 shadow-2xl max-w-sm w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/40 text-[11px] font-black uppercase tracking-wider">
                <QrCode className="w-3.5 h-3.5 text-sky-300" />
                <span>Parent Pass Kiosk</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">Scan Your Personal QR Pass</h3>
                <p className="text-xs text-sky-200 leading-relaxed">
                  Present your mobile pass to the scanner or camera to display your registered details & activity statuses.
                </p>
              </div>

              {/* Camera Scanner Viewfinder (Toggleable) */}
              {isCameraActive ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-sky-400 shadow-xl bg-black">
                    <CameraQrReader onScanSuccess={processScannedToken} />
                  </div>
                  <button
                    onClick={() => setIsCameraActive(false)}
                    className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Close Camera Scanner</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black text-sm shadow-xl transition flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02]"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Activate Kiosk Camera Scanner</span>
                  </button>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1 text-[11px] text-sky-200">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Hardware Scanner Active</span>
                    </div>
                    <p className="text-[10px] text-sky-300">
                      USB 2D Barcode / QR handheld scanners scan automatically without clicking.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-bold">
                  {errorMessage}
                </div>
              )}

              {/* Manual Registration ID / Token Input */}
              <form onSubmit={handleManualSearch} className="space-y-2 pt-2 border-t border-sky-400/20">
                <span className="text-[10px] text-sky-300 font-bold block uppercase tracking-wider">
                  Or Enter Registration ID:
                </span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. EF-2026-0001"
                    value={kioskInput}
                    onChange={(e) => setKioskInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-sky-300/50 text-xs focus:outline-none focus:border-sky-400 font-mono"
                  />
                  <Search className="w-4 h-4 text-sky-300 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Verifying Pass...' : 'Look Up Personal Pass'}
                </button>
              </form>
            </div>
          </div>
        </main>
      )}

      {/* FOOTER: Schedule Ticker */}
      <footer className="border-t border-sky-400/20 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-sky-300 gap-2 z-20">
        <span>© 2026 AHSAS • Class Unit Al Suffa (C3) • All Rights Reserved</span>
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <span>Edu Expo: 09:00 AM</span>
          <span>•</span>
          <span>Inaugural Conclave: 10:00 AM</span>
          <span>•</span>
          <span>Food Counter: 01:00 PM</span>
        </div>
      </footer>
    </div>
  );
}