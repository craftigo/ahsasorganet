import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  Building,
  Phone,
  User,
  GraduationCap,
  Home,
  FileText
} from 'lucide-react';
import { parentMeetService } from '../services/parentMeetService';
import { ParentMeetSettings, ParentRegistration } from '../../../shared/types';
import { DEFAULT_PARENT_MEET_SETTINGS } from '../../../shared/data/parentMeetDefaults';

export default function ParentMeetRegistrationPage(): JSX.Element {
  const [settings, setSettings] = useState<ParentMeetSettings>(DEFAULT_PARENT_MEET_SETTINGS);

  // Form State
  const [parentName, setParentName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [mobileNumber] = useState('');
  const [email] = useState('');
  const [address, setAddress] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [attendeesCount, setAttendeesCount] = useState(1);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRegistration, setSuccessRegistration] = useState<ParentRegistration | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [passUrl, setPassUrl] = useState<string>('');

  // Countdown timer to 09 November 2026
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    parentMeetService.getSettings().then((s) => {
      setSettings(s);
    });

    const targetDate = new Date('2026-11-09T08:30:00+05:30').getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!parentName.trim()) {
      setErrorMessage('Please enter Parent / Guardian Name.');
      return;
    }
    const cleanPhone = whatsappNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit WhatsApp number.');
      return;
    }
    if (!studentName.trim()) {
      setErrorMessage('Please enter Child / Student Name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await parentMeetService.registerParent({
        parent_name: parentName,
        whatsapp_number: cleanPhone,
        mobile_number: mobileNumber,
        email,
        address,
        student_name: studentName,
        student_class: studentClass,
        attendees_count: attendeesCount,
        additional_details: additionalDetails,
        whatsapp_consent: whatsappConsent
      });

      setSuccessRegistration(res.registration);
      setPassUrl(res.pass_url);

      // Generate visual QR code
      const qrImage = await QRCode.toDataURL(res.registration.qr_token, {
        width: 320,
        margin: 2,
        color: { dark: '#0369a1', light: '#ffffff' }
      });
      setQrDataUrl(qrImage);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Download personalized admission card PNG
  const handleDownloadCardPNG = () => {
    if (!successRegistration?.qr_token) return;
    const link = document.createElement('a');
    link.href = `/api/parent-meet/pass/${successRegistration.qr_token}/card.png`;
    link.download = `Edu_Familia_Pass_${successRegistration.registration_number || 'Card'}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-100 to-sky-50 text-gray-800 font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Banner Navigation */}
      <div className="bg-sky-950/80 backdrop-blur-md text-white border-b border-sky-400/20 py-2 px-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs">
          <Link to="/" className="flex items-center gap-2 hover:text-sky-300 transition font-bold">
            <Home className="w-4 h-4 text-sky-400" />
            <span>AHSAS Activity Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/event/info" className="hover:text-sky-300 transition font-semibold">
              Event Programme
            </Link>
            <Link
              to="/event/display"
              className="hidden sm:inline-flex items-center gap-1 text-sky-300 hover:text-white font-semibold"
            >
              <span>LED Display</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section with Supplied Poster Design Elements */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 px-4">
        {/* Soft Background Clouds / Shapes */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-300/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 text-sky-900 shadow-md border border-sky-200 text-xs font-bold uppercase tracking-wider animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span>Official Parents' Meet • 09 November 2026 (Monday)</span>
          </div>

          {/* Main Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-sky-950 drop-shadow-sm font-serif">
              {settings.event_name}
            </h1>
            <p className="text-lg sm:text-2xl font-extrabold tracking-widest text-sky-800 uppercase">
              {settings.event_subtitle}
            </p>
          </div>

          {/* Quote from Official Poster */}
          <p className="text-xs sm:text-sm text-sky-900/90 max-w-2xl mx-auto leading-relaxed italic bg-white/60 p-4 rounded-2xl border border-sky-200/60 shadow-xs backdrop-blur-xs">
            "{settings.event_description}"
          </p>

          {/* Event Quick Meta Badges */}
          <div className="flex flex-wrap justify-center items-center gap-2.5 pt-2 text-xs font-bold text-sky-950">
            <span className="inline-flex items-center gap-1.5 bg-white/90 px-3.5 py-2 rounded-xl shadow-xs border border-sky-100">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>09 November 2026 • Monday</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/90 px-3.5 py-2 rounded-xl shadow-xs border border-sky-100">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Darussalam Tharqiya Edu Village, Koyilandy</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/90 px-3.5 py-2 rounded-xl shadow-xs border border-sky-100">
              <Building className="w-4 h-4 text-sky-600" />
              <span>AHSAS • Class Unit Al Suffa (C3)</span>
            </span>
          </div>

          {/* Countdown Clock */}
          <div className="pt-4 max-w-md mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-900/80 block mb-2">
              Time Remaining Until Event Opening
            </span>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/95 rounded-xl p-2.5 shadow-md border border-sky-200">
                <span className="text-xl sm:text-2xl font-black text-sky-950 block">{timeLeft.days}</span>
                <span className="text-[10px] uppercase font-bold text-sky-600">Days</span>
              </div>
              <div className="bg-white/95 rounded-xl p-2.5 shadow-md border border-sky-200">
                <span className="text-xl sm:text-2xl font-black text-sky-950 block">{timeLeft.hours}</span>
                <span className="text-[10px] uppercase font-bold text-sky-600">Hours</span>
              </div>
              <div className="bg-white/95 rounded-xl p-2.5 shadow-md border border-sky-200">
                <span className="text-xl sm:text-2xl font-black text-sky-950 block">{timeLeft.minutes}</span>
                <span className="text-[10px] uppercase font-bold text-sky-600">Mins</span>
              </div>
              <div className="bg-white/95 rounded-xl p-2.5 shadow-md border border-sky-200">
                <span className="text-xl sm:text-2xl font-black text-sky-950 block">{timeLeft.seconds}</span>
                <span className="text-[10px] uppercase font-bold text-sky-600">Secs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pb-20 relative z-10">
        {/* SUCCESS STATE */}
        {successRegistration ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-sky-100 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white p-6 sm:p-8 text-center relative">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">Registration Successful!</h2>
              <p className="text-sky-100 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                Assalamu Alaikum! Your personal admission pass for Edu Familia – Tharqiya Family Meet has been generated.
              </p>
            </div>

            {/* Pass Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-sky-50 rounded-2xl p-6 border border-sky-200 flex flex-col sm:flex-row items-center gap-6 justify-between">
                {/* QR Code Presentation */}
                <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-md border border-sky-100 shrink-0">
                  {qrDataUrl && <img src={qrDataUrl} alt="Your QR Pass" className="w-48 h-48 rounded-xl object-contain" />}
                  <span className="text-[11px] font-mono font-bold text-sky-950 mt-2 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                    {successRegistration.registration_number}
                  </span>
                </div>

                {/* Registration Details */}
                <div className="space-y-3 flex-grow text-xs sm:text-sm w-full">
                  <div className="border-b border-sky-200 pb-2">
                    <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">Parent / Guardian</span>
                    <span className="text-base font-extrabold text-gray-900">{successRegistration.parent_name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-b border-sky-200 pb-2">
                    <div>
                      <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">Student Name</span>
                      <span className="font-bold text-gray-900">{successRegistration.student_name}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">Class / Dept</span>
                      <span className="font-bold text-gray-900">{successRegistration.student_class || 'Standard'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-b border-sky-200 pb-2">
                    <div>
                      <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">WhatsApp</span>
                      <span className="font-bold font-mono text-gray-900">{successRegistration.whatsapp_number}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">Total Attendees</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        {successRegistration.attendees_count} Members
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">Event Venue</span>
                    <span className="font-medium text-gray-800">
                      {settings.venue}, {settings.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Automatic WhatsApp Delivery Status Notice */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="font-extrabold flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automatic WhatsApp Admission Card Dispatch</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Your personalized admission card image has been queued for WhatsApp delivery to <strong>{successRegistration.whatsapp_number}</strong> from our official WhatsApp Business account <strong>+91 83019 48964</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadCardPNG}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Card (PNG)</span>
                </button>

                <Link
                  to={`/event/pass/${successRegistration.qr_token}`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs shadow-md transition cursor-pointer text-center"
                >
                  <FileText className="w-4 h-4 text-sky-300" />
                  <span>Open Digital Pass / PDF</span>
                </Link>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Assalamu Alaikum! Here is my personal QR Pass for Edu Familia - Tharqiya Family Meet: ${passUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer text-center"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Forward via WhatsApp</span>
                </a>
              </div>

              {/* Instructions Reminder */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Important Entry & Food Token Guidelines:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                  <li>
                    <strong>Expo Entry:</strong> Scan this pass once at the Expo gate. (One-time entry only).
                  </li>
                  <li>
                    <strong>Main Meeting:</strong> Scan at the Main Auditorium entrance to record official attendance.
                  </li>
                  <li>
                    <strong>Food Counter:</strong> Food tokens are automatically unlocked <em>after</em> Main Meeting
                    attendance is verified!
                  </li>
                </ul>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessRegistration(null);
                    setParentName('');
                    setStudentName('');
                    setWhatsappNumber('');
                  }}
                  className="text-xs text-sky-700 hover:text-sky-900 font-bold underline cursor-pointer"
                >
                  Register Another Parent / Student
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="bg-white rounded-3xl shadow-xl border border-sky-100 overflow-hidden">
            {/* Form Header */}
            <div className="p-6 sm:p-8 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-sky-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">Parent Registration Form</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Please provide your contact details to generate your digital QR admission pass.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Registration Closed Notice */}
            {!settings.registration_enabled ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Registration Currently Closed</h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                  Online registration for Edu Familia – Tharqiya Family Meet is presently disabled by the organizers.
                  Please contact the AHSAS committee or help desk for assistance.
                </p>
                <Link
                  to="/"
                  className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs"
                >
                  Return to Home Portal
                </Link>
              </div>
            ) : (
              /* The Active Form */
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 text-xs sm:text-sm">
                {/* Row 1: Parent Name & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                      Parent / Guardian Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mohammed Rasheed"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9847000000"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-medium transition font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Your unique QR Pass link will be delivered to this WhatsApp number.
                    </span>
                  </div>
                </div>

                {/* Row 2: Student Name & Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                      Child / Student Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Fathima Zahra"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                      Class / Department <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Class 10A / Al Suffa"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-medium transition"
                    />
                  </div>
                </div>

                {/* Row 3: Attendees Count & Place */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                      Number of Attendees (Family Members)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setAttendeesCount(num)}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                            attendeesCount === num
                              ? 'bg-sky-600 text-white shadow-md'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Select how many family members will attend with you.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                      Place / Residence <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Koyilandy / Calicut"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 font-medium transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1.5">
                    Special Inquiries or Suggestions <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any specific topic you wish to discuss during the Teacher-Parent Conclave..."
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-sky-500 font-medium transition text-xs"
                  />
                </div>

                {/* WhatsApp Communication Consent Checkbox */}
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="whatsappConsent"
                    checked={whatsappConsent}
                    onChange={(e) => setWhatsappConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <label htmlFor="whatsappConsent" className="text-xs text-sky-950 font-medium leading-relaxed cursor-pointer">
                    <strong>WhatsApp Pass Delivery Consent:</strong> I agree to receive my personalized Edu Familia admission QR card and official event updates on WhatsApp from official sender <strong>+91 83019 48964</strong>.
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-extrabold text-sm sm:text-base shadow-xl hover:shadow-2xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating Secure QR Pass...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5 text-sky-200" />
                        <span>Register & Generate Digital QR Pass</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-gray-400 mt-2">
                    🔒 Secure registration powered by AHSAS Event Management System.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
