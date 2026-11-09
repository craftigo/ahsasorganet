import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Maximize2,
  Minimize2,
  Calendar,
  MapPin,
  Sparkles,
  QrCode,
  CheckCircle2,
  Search
} from 'lucide-react';
import { parentMeetService } from '../services/parentMeetService';
import { ParentMeetSettings } from '../../../shared/types';
import { DEFAULT_PARENT_MEET_SETTINGS } from '../../../shared/data/parentMeetDefaults';

export default function ParentMeetDisplayPage(): JSX.Element {
  const [settings, setSettings] = useState<ParentMeetSettings>(DEFAULT_PARENT_MEET_SETTINGS);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [publicQrUrl, setPublicQrUrl] = useState<string>('');

  // Kiosk quick lookup / scan greeting
  const [kioskInput, setKioskInput] = useState<string>('');
  const [greeting, setGreeting] = useState<{
    parent_name: string;
    student_name: string;
    attendees: number;
    reg_number: string;
  } | null>(null);

  useEffect(() => {
    parentMeetService.getSettings().then((s) => setSettings(s));

    // Update digital clock every second
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    }, 1000);

    // Generate Public Event QR
    const url = typeof window !== 'undefined' ? `${window.location.origin}/event/info` : 'https://ahsasorganet.vercel.app/event/info';
    QRCode.toDataURL(url, {
      width: 400,
      margin: 1,
      color: { dark: '#0369a1', light: '#ffffff' }
    }).then(setPublicQrUrl);

    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Quick kiosk search/scan test
  const handleKioskLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskInput.trim()) return;

    try {
      const res = await parentMeetService.verifyScan({
        station_type: 'meeting',
        qr_token: kioskInput.trim(),
        manual_id: kioskInput.trim(),
        staff_name: 'Display Kiosk'
      });

      if (res.registration) {
        setGreeting({
          parent_name: res.registration.parent_name,
          student_name: res.registration.student_name,
          attendees: res.registration.attendees_count,
          reg_number: res.registration.registration_number
        });
        setTimeout(() => setGreeting(null), 8000);
      }
    } catch {}
    setKioskInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-sky-800 to-slate-950 text-white font-sans flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden relative">
      {/* Subtle Floating Shapes for Stage Presence */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Clock & Fullscreen Controls */}
      <header className="flex items-center justify-between border-b border-sky-400/20 pb-4 z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/ahsas logo png logo.png" alt="AHSAS Logo" className="h-10 w-auto object-contain" />
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-sky-300 block">
              {settings.organizer}
            </span>
            <span className="text-[11px] text-sky-100 font-semibold">{settings.venue}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-5 py-2 rounded-2xl bg-sky-950/80 border border-sky-400/30 text-sky-200 font-mono font-black text-xl tracking-wider shadow-inner">
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

      {/* GREETING OVERLAY (When a parent scans at Kiosk) */}
      {greeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-sky-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-br from-sky-600 to-sky-800 p-10 rounded-3xl text-center max-w-xl w-full border-4 border-sky-300 shadow-2xl space-y-4 animate-scale-up">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <span className="px-4 py-1.5 rounded-full bg-white/20 text-xs font-black uppercase tracking-widest text-sky-100 inline-block">
              Welcome to Edu Familia
            </span>
            <h2 className="text-4xl font-black text-white">{greeting.parent_name}</h2>
            <p className="text-lg text-sky-100 font-bold">
              Parent of <span className="text-white underline">{greeting.student_name}</span> • {greeting.attendees} Members
            </p>
            <div className="pt-2">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full text-sky-200">
                {greeting.reg_number}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN SCREEN BODY */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto z-10 py-6 items-center">
        {/* Left Column: Branding, Title, Poster */}
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

          <div className="flex flex-wrap gap-3 text-xs sm:text-sm font-bold pt-2">
            <span className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-300" />
              <span>09 November 2026 (Monday)</span>
            </span>
            <span className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-300" />
              <span>{settings.venue}, Koyilandy</span>
            </span>
          </div>

          {/* Quick Announcement Ticker */}
          <div className="p-4 rounded-2xl bg-sky-950/70 border border-sky-400/30 text-xs text-sky-200 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-bold tracking-wide">{settings.public_announcements}</span>
          </div>
        </div>

        {/* Right Column: Public Event Information QR for Audience */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border-2 border-sky-300/40 text-center space-y-4 shadow-2xl max-w-sm w-full">
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-300 block">
              Scan For Event Programme & Map
            </span>

            <div className="p-4 bg-white rounded-2xl shadow-xl inline-block">
              {publicQrUrl ? (
                <img src={publicQrUrl} alt="Public Event QR" className="w-56 h-56 object-contain rounded-xl" />
              ) : (
                <div className="w-56 h-56 bg-sky-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-sky-600 animate-pulse" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Public Information Access</h3>
              <p className="text-xs text-sky-200">
                Point your mobile camera to view the live schedule, announcements & guidelines.
              </p>
            </div>

            {/* Optional Kiosk Manual Input Bar */}
            <form onSubmit={handleKioskLookup} className="pt-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Scan pass token or enter ID..."
                  value={kioskInput}
                  onChange={(e) => setKioskInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-sky-300/60 text-xs focus:outline-none focus:border-sky-400 font-mono"
                />
                <Search className="w-4 h-4 text-sky-300 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* FOOTER: Schedule Ticker */}
      <footer className="border-t border-sky-400/20 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-sky-300 gap-2 z-10">
        <span>© 2026 AHSAS • Class Unit Al Suffa (C3) • All Rights Reserved</span>
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <span>Expo: 09:00 AM</span>
          <span>•</span>
          <span>Inauguration: 10:00 AM</span>
          <span>•</span>
          <span>Food Counter: 01:00 PM</span>
        </div>
      </footer>
    </div>
  );
}
