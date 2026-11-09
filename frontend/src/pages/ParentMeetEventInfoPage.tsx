import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  Download,
  Share2,
  Users,
  Utensils,
  ArrowRight,
  Home,
  Info
} from 'lucide-react';
import { parentMeetService } from '../services/parentMeetService';
import { ParentMeetSettings } from '../../../shared/types';
import { DEFAULT_PARENT_MEET_SETTINGS } from '../../../shared/data/parentMeetDefaults';

export default function ParentMeetEventInfoPage(): JSX.Element {
  const [settings, setSettings] = useState<ParentMeetSettings>(DEFAULT_PARENT_MEET_SETTINGS);
  const [eventQrUrl, setEventQrUrl] = useState<string>('');

  useEffect(() => {
    parentMeetService.getSettings().then((s) => setSettings(s));

    // Generate Public Event Info QR code
    const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/event/info` : 'https://ahsasorganet.vercel.app/event/info';
    QRCode.toDataURL(currentUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#0369a1', light: '#ffffff' }
    }).then(setEventQrUrl);
  }, []);

  const handleDownloadEventQR = () => {
    if (!eventQrUrl) return;
    const link = document.createElement('a');
    link.href = eventQrUrl;
    link.download = `Edu_Familia_Public_Event_QR.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-50 to-white text-gray-800 font-sans selection:bg-sky-500 selection:text-white pb-20">
      {/* Top Banner Navigation */}
      <div className="bg-sky-950/90 backdrop-blur-md text-white border-b border-sky-400/20 py-2.5 px-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs">
          <Link to="/" className="flex items-center gap-2 hover:text-sky-300 transition font-bold">
            <Home className="w-4 h-4 text-sky-400" />
            <span>AHSAS Activity Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/event/edu-familia"
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold transition shadow-xs"
            >
              Register Now
            </Link>
            <Link to="/event/display" className="text-sky-300 hover:text-white font-bold hidden sm:inline">
              Large Screen
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-10 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 text-sky-900 shadow-sm border border-sky-200 text-xs font-bold uppercase tracking-wider">
            <span>Official Event Information & Programme</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-sky-950 font-serif drop-shadow-sm">
            {settings.event_name}
          </h1>
          <p className="text-lg sm:text-2xl font-black text-sky-800 tracking-widest uppercase">
            {settings.event_subtitle}
          </p>

          <p className="text-xs sm:text-sm text-sky-900/90 max-w-2xl mx-auto italic bg-white/60 p-4 rounded-2xl border border-sky-200/60 shadow-xs">
            "{settings.event_description}"
          </p>

          <div className="flex flex-wrap justify-center items-center gap-2.5 text-xs font-bold text-sky-950 pt-2">
            <span className="bg-white/95 px-3.5 py-2 rounded-xl shadow-xs border border-sky-100 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>09 November 2026 • Monday</span>
            </span>
            <span className="bg-white/95 px-3.5 py-2 rounded-xl shadow-xs border border-sky-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Darussalam Tharqiya Edu Village, Koyilandy</span>
            </span>
            <span className="bg-white/95 px-3.5 py-2 rounded-xl shadow-xs border border-sky-100 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-sky-600" />
              <span>AHSAS • Class Unit Al Suffa (C3)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Programme & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Programme Timeline Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-sky-100 space-y-6">
            <div className="flex items-center gap-3 border-b border-sky-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Official Event Schedule</h2>
                <p className="text-xs text-gray-500">Day itinerary for Monday, 09 November 2026</p>
              </div>
            </div>

            <div className="space-y-4">
              {settings.event_programme.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-3.5 rounded-2xl hover:bg-sky-50/60 transition border border-transparent hover:border-sky-100"
                >
                  <span className="px-3 py-1 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs font-mono shrink-0 shadow-xs">
                    {item.time}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-xs text-sky-600 font-semibold mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{item.location}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Main Sections Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white shadow-md border border-sky-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Edu Expo</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Innovation stalls, student projects, Islamic heritage displays. One-time entry upon arrival.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-md border border-sky-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Main Auditorium</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Keynote parenting sessions, moral education discourse, and teacher-parent conclave.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-md border border-sky-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">Traditional Feast</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Delicious banquet served for registered families following Main Meeting attendance.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Public Event Information QR */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-sky-100 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              <span>Public Event QR</span>
            </div>

            <h3 className="text-lg font-black text-gray-900">Share Event Information</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Scan this QR to open the public event schedule, venue map, and announcements on any mobile phone.
            </p>

            <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 inline-block shadow-inner">
              {eventQrUrl && <img src={eventQrUrl} alt="Public Event QR" className="w-48 h-48 rounded-xl object-contain" />}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadEventQR}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save Event QR</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Check out EDU FAMILIA – THARQIYA FAMILY MEET on 09 Nov 2026: ${window.location.href}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center justify-center shadow-md"
                title="Share Event"
              >
                <Share2 className="w-4 h-4" />
              </a>
            </div>

            <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400">
              * Note: This is the public event details QR code. Individual parent admission passes are generated upon
              registration.
            </div>
          </div>

          {/* Quick Registration Call to Action Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-600 to-sky-800 text-white shadow-xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Haven't Registered Yet?</span>
            <h3 className="text-lg font-black">Register Now to Get Your Personal QR Pass</h3>
            <p className="text-xs text-sky-100 leading-relaxed">
              Parents can easily register online and download their personal QR pass or receive it on WhatsApp.
            </p>
            <Link
              to="/event/edu-familia"
              className="inline-flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-white text-sky-900 font-extrabold text-xs shadow-md hover:bg-sky-50 transition"
            >
              <span>Go to Registration Page</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
