import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Download,
  Share2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Printer,
  Home,
  ShieldCheck,
  Building,
  Users,
  Lock,
  Utensils
} from 'lucide-react';
import { parentMeetService } from '../services/parentMeetService';

export default function ParentMeetPassPage(): JSX.Element {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passData, setPassData] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    parentMeetService
      .getPassByToken(token)
      .then(async (data) => {
        setPassData(data);
        const qrImage = await QRCode.toDataURL(token, {
          width: 320,
          margin: 2,
          color: { dark: '#0369a1', light: '#ffffff' }
        });
        setQrDataUrl(qrImage);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Pass not found.');
        setLoading(false);
      });
  }, [token]);

  // Download QR Code PNG
  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_Pass_${passData?.registration?.registration_number || 'Edu_Familia'}.png`;
    link.click();
  };

  // Download Printable PDF Pass via html2pdf
  const handleDownloadPDF = async () => {
    if (!passCardRef.current) return;
    setPdfGenerating(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = passCardRef.current;
      const opt = {
        margin: 10,
        filename: `Edu_Familia_Pass_${passData?.registration?.registration_number || 'Pass'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-sky-900">Loading your digital QR pass...</p>
        </div>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center space-y-4 border border-rose-100">
          <AlertCircle className="w-14 h-14 text-rose-500 mx-auto" />
          <h2 className="text-2xl font-black text-gray-900">QR Pass Not Found</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {error || 'This digital admission pass could not be retrieved. Please check your QR token link.'}
          </p>
          <Link
            to="/event/edu-familia"
            className="inline-block px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
          >
            Register for Edu Familia
          </Link>
        </div>
      </div>
    );
  }

  const { registration, event, statuses } = passData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-sky-50 py-8 px-4 font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <div className="max-w-md mx-auto mb-4 flex items-center justify-between text-xs">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sky-900 hover:text-sky-950 font-bold">
          <Home className="w-4 h-4 text-sky-600" />
          <span>Home</span>
        </Link>
        <span className="text-[11px] font-bold text-sky-800 bg-white/80 px-2.5 py-1 rounded-full shadow-xs">
          Official Digital Pass
        </span>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Printable Pass Card Container */}
        <div
          ref={passCardRef}
          className="bg-white rounded-3xl shadow-2xl border-2 border-sky-300 overflow-hidden relative"
        >
          {/* Card Top Sky Header with Poster Visual Elements */}
          <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-sky-900 text-white p-6 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-200 block mb-1">
              {event?.organizer || 'AHSAS • Class Unit Al Suffa (C3)'}
            </span>
            <h1 className="text-3xl font-black tracking-tight font-serif drop-shadow-sm">{event?.name || 'EDU FAMILIA'}</h1>
            <p className="text-xs font-black tracking-widest text-sky-200 uppercase mt-0.5">
              {event?.subtitle || 'THARQIYA FAMILY MEET'}
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold text-white border border-white/20">
              <Calendar className="w-3.5 h-3.5 text-sky-200" />
              <span>
                {event?.date} • {event?.day}
              </span>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="p-6 text-center bg-sky-50/60 border-b border-sky-100 flex flex-col items-center">
            <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-sky-200 inline-block">
              {qrDataUrl && <img src={qrDataUrl} alt="Secure QR Pass" className="w-48 h-48 object-contain rounded-xl" />}
            </div>

            <div className="mt-3">
              <span className="text-xs font-mono font-black text-sky-950 bg-sky-100 px-3.5 py-1 rounded-full border border-sky-300 shadow-xs">
                {registration.registration_number}
              </span>
              <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                Single Personal Pass: 1) Expo Entry • 2) Main Meeting • 3) Food Token • 4) Kiosk Screen
              </p>
            </div>
          </div>

          {/* Parent & Child Details */}
          <div className="p-6 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Parent / Guardian:</span>
              <span className="font-extrabold text-gray-900 text-sm">{registration.parent_name}</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Child / Student:</span>
              <span className="font-bold text-gray-900">{registration.student_name}</span>
            </div>

            {registration.student_class && (
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Class / Dept:</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                  {registration.student_class}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Attendees:</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                {registration.attendees_count} Members
              </span>
            </div>

            <div className="flex items-start justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Venue:</span>
              <span className="font-medium text-gray-800 text-right max-w-[200px]">
                {event?.venue}, {event?.location}
              </span>
            </div>
          </div>

          {/* Live Activity Status Indicators */}
          <div className="p-4 bg-sky-50 border-t border-sky-100 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-900 block mb-1">
              Live Admission & Activity Status:
            </span>

            {/* Expo Status */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-sky-200 text-xs">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-sky-600" />
                <span>Edu Expo Entrance:</span>
              </span>
              {statuses?.expo_entered ? (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Entry Approved</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 text-[10px]">
                  Not Entered Yet
                </span>
              )}
            </div>

            {/* Meeting Status */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-sky-200 text-xs">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Main Auditorium Meet:</span>
              </span>
              {statuses?.meeting_attended ? (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Attendance Recorded</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[10px]">
                  Pending Attendance
                </span>
              )}
            </div>

            {/* Food Token Status */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-sky-200 text-xs">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                <span>Food Token Status:</span>
              </span>
              {statuses?.food_status === 'redeemed' ? (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Redeemed ({statuses.food_tokens_redeemed})</span>
                </span>
              ) : statuses?.meeting_attended ? (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 text-[10px] animate-pulse">
                  Eligible (Ready to Redeem)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 text-[10px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-500" />
                  <span>Locked (Attend Meeting First)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Save PNG</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={pdfGenerating}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-sky-300" />
            <span>{pdfGenerating ? 'Preparing...' : 'Print / PDF'}</span>
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `My QR Pass for Edu Familia - Tharqiya Family Meet: ${window.location.href}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition text-center cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>

        {/* Entry Instructions Card */}
        <div className="p-4 bg-white/90 rounded-2xl border border-sky-200 text-xs text-sky-950 space-y-1.5 shadow-sm">
          <div className="font-black text-sky-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>General Guidelines for Event Day:</span>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Please display this screen with full brightness at the entrance. Each scanner at Expo, Main Meeting, and Food
            Counter reads your token securely without requiring internet connectivity on your phone once this page is
            loaded.
          </p>
        </div>
      </div>
    </div>
  );
}
