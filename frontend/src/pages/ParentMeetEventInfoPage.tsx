import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  Share2,
  Users,
  Utensils,
  ArrowRight,
  Home,
  QrCode,
  Search,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { parentMeetService } from '../services/parentMeetService';
import { ParentMeetSettings } from '../../../shared/types';
import { DEFAULT_PARENT_MEET_SETTINGS } from '../../../shared/data/parentMeetDefaults';

export default function ParentMeetEventInfoPage(): JSX.Element {
  const [settings, setSettings] = useState<ParentMeetSettings>(DEFAULT_PARENT_MEET_SETTINGS);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    parentMeetService.getSettings().then((s) => setSettings(s));
  }, []);

  const handleLookupPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    setLookupError('');
    setLookupLoading(true);

    try {
      const data = await parentMeetService.getPassByToken(lookupQuery.trim());
      if (data && data.registration) {
        navigate(`/event/pass/${data.registration.qr_token || lookupQuery.trim()}`);
      } else {
        setLookupError('Personal QR Pass not found. Please check your Registration ID or register.');
      }
    } catch {
      setLookupError('Personal pass not found for this ID. Please register first.');
    } finally {
      setLookupLoading(false);
    }
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
              External Display Screen
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-10 pb-10 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 text-sky-900 shadow-sm border border-sky-200 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Single Personal QR Pass Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-sky-950 font-serif drop-shadow-sm">
            {settings.event_name}
          </h1>
          <p className="text-lg sm:text-2xl font-black text-sky-800 tracking-widest uppercase">
            {settings.event_subtitle}
          </p>

          <p className="text-xs sm:text-sm text-sky-900/90 max-w-2xl mx-auto italic bg-white/60 p-4 rounded-2xl border border-sky-200/60 shadow-xs leading-relaxed">
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

            <div className="space-y-3">
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
              <h3 className="font-extrabold text-sm text-gray-900">1. Edu Expo</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Scan personal QR for one-time admission to innovation stalls and gallery.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-md border border-sky-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">2. Main Auditorium</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Keynote parenting sessions. Attendance scan unlocks your family food token.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white shadow-md border border-sky-100 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Utensils className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-gray-900">3. Traditional Feast</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Scan your same personal QR to claim your meal following main meeting attendance.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Single Personal QR System & Pass Lookup */}
        <div className="space-y-6">
          {/* Single Pass Policy Box */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-sky-100 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>One QR Pass Per Parent</span>
            </div>

            <h3 className="text-lg font-black text-gray-900">Single Personal QR Pass</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Every registered parent receives <strong>ONE UNIQUE PERSONAL QR PASS</strong> containing an opaque security token. The same pass is used across all event checkpoints:
            </p>

            <ul className="text-xs text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Expo Entrance:</strong> Verifies one-time entry limit.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span><strong>Auditorium:</strong> Records attendance & unlocks food.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span><strong>Food Counter:</strong> Redeems single-use meal token.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                <span><strong>External Screen:</strong> Displays personalized statuses.</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-gray-100">
              <form onSubmit={handleLookupPass} className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">
                  Already Registered? Find Your QR Pass:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter Registration ID (e.g. EF-2026-0001)..."
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {lookupError && <p className="text-[11px] text-rose-600 font-bold">{lookupError}</p>}
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {lookupLoading ? 'Searching...' : 'Open My Personal QR Pass'}
                </button>
              </form>
            </div>
          </div>

          {/* Registration Call to Action */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-600 to-sky-800 text-white shadow-xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200">New Registration</span>
            <h3 className="text-lg font-black">Register For Your Personal QR Pass</h3>
            <p className="text-xs text-sky-100 leading-relaxed">
              Complete your online registration in 30 seconds to receive your digital QR pass instantly on your mobile and via WhatsApp.
            </p>
            <Link
              to="/event/edu-familia"
              className="inline-flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-white text-sky-900 font-extrabold text-xs shadow-md hover:bg-sky-50 transition"
            >
              <span>Fill Registration Form</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Assalamu Alaikum! Registrations are open for EDU FAMILIA – THARQIYA FAMILY MEET on Monday, 09 Nov 2026 at Darussalam Tharqiya Edu Village, Koyilandy. Register to get your personal QR Pass: ${typeof window !== 'undefined' ? window.location.origin : ''}/event/edu-familia`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 w-full justify-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Event with Parents on WhatsApp</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}