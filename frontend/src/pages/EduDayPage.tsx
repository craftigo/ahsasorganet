import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Ticket,
  Sparkles,
  ArrowRight,
  FileText,
  Upload,
  ShieldCheck
} from 'lucide-react';
import { EduDayPoster } from '../components/events/EduDayPoster';

export default function EduDayPage(): JSX.Element {
  return (
    <div className="flex-grow flex flex-col bg-gray-50">
      {/* =========================================================================
          HERO SECTION: EDU DAY — ANNIVERSARY SPECIAL
      ========================================================================= */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-br from-gray-950 via-[#181124] to-navy text-white overflow-hidden border-b border-amber-500/20">
        {/* Decorative background glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-maroon/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-amber-400/10 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>COLLEGE ANNIVERSARY CELEBRATION</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
                  EDU DAY
                </h1>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-300">
                  JAZRIYYA ONE DAY WORKSHOP
                </h2>
              </div>

              <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                As part of our prestigious college anniversary celebration, <strong>EDU DAY</strong>, <strong>Al Bayan Qur’an Academy</strong> (A chapter of IRThIQA’ · Alumni of Darussalam Tharqiya Edu Village) in joint partnership with <strong>AHSAS</strong> is hosting an intensive, one-day academic and spiritual workshop dedicated to the study of <em>Al-Muqaddimah Al-Jazariyyah</em>.
              </p>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase mb-1">
                    <Calendar className="w-4 h-4" /> Date
                  </div>
                  <p className="font-extrabold text-white text-base">29 October 2026</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase mb-1">
                    <Clock className="w-4 h-4" /> Time
                  </div>
                  <p className="font-extrabold text-white text-base">9:00 AM – 5:00 PM</p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase mb-1">
                    <Ticket className="w-4 h-4" /> Registration Fee
                  </div>
                  <p className="font-black text-amber-300 text-xl">₹313</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 col-span-2 sm:col-span-3 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Official Venue</span>
                    <p className="font-extrabold text-white text-base">
                      Darussalam Tharqiya Edu Village
                    </p>
                    <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                      <p>Organized collaboratively by <strong>Al Bayan Qur’an Academy &amp; AHSAS</strong></p>
                      <p className="text-[11px] text-amber-300/80">A chapter of IRThIQA’ • Alumni of Darussalam Tharqiya Edu Village</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Call to Action */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/edu-day/register"
                  id="event-page-register-btn"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-gray-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all duration-300 shadow-xl shadow-amber-400/25 transform hover:-translate-y-0.5 text-base"
                >
                  <Ticket className="w-5 h-5 text-gray-950" />
                  <span>REGISTER FOR JAZRIYYA WORKSHOP</span>
                </Link>
              </div>

            </div>

            {/* Right Poster Column */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md">
                <EduDayPoster />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          ABOUT THE EVENT & ORGANIZERS
      ========================================================================= */}
      <section className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-black tracking-widest uppercase text-maroon bg-maroon/10 px-3.5 py-1.5 rounded-full inline-block mb-3">
              Anniversary Academic Initiative
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              About EDU DAY & Jazriyya Workshop
            </h2>
            <div className="w-16 h-1 bg-maroon mx-auto mt-4 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4 text-gray-600 leading-relaxed text-sm sm:text-base">
              <p>
                <strong>EDU DAY</strong> marks the commemorative college anniversary, celebrating academic dedication, community spirit, and Quranic excellence.
              </p>
              <p>
                As an integral centerpiece of this celebration, the <strong>JAZRIYYA ONE DAY WORKSHOP</strong> offers students and scholars a focused immersion into the timeless masterpiece of Tajweed sciences: <em>Al-Muqaddimah fīmā yajib ‘alā qāri’ihi an ya‘lamah</em> by Imam Ibn al-Jazari.
              </p>
              <p>
                The workshop brings together dedicated students, teachers, and enthusiasts for a day of rigorous learning, recitation etiquette, and authentic articulation science.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-maroon" /> Organizing Institutions
              </h3>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
                  <h4 className="font-extrabold text-navy text-sm">Al Bayan Qur’an Academy</h4>
                  <p className="text-xs font-semibold text-amber-700 mt-0.5">
                    A chapter of IRThIQA’
                  </p>
                  <p className="text-xs font-medium text-gray-600">
                    Alumni of Darussalam Tharqiya Edu Village
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Committed to advanced Quranic studies, Tajweed preservation, and classical recitation traditions.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs">
                  <h4 className="font-extrabold text-maroon text-sm">AHSAS</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Anwarul Huda Students' Association — organizing and coordinating student activities, ranking, and educational milestones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          REGISTRATION STEPS (WITHOUT INVENTING UNPROVIDED DETAILS)
      ========================================================================= */}
      <section className="py-16 bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black tracking-widest uppercase text-navy bg-navy/10 px-3.5 py-1.5 rounded-full inline-block mb-3">
              Enrollment Guide
            </span>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              Simple 4-Step Registration Process
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Follow these simple steps to confirm your participation before registration closes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 font-black flex items-center justify-center text-lg mb-4 border border-amber-500/20">
                  1
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-amber-500" /> Pay Fee
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Transfer the exact registration fee of <strong>₹313</strong> to the designated organizer account and take a clear screenshot of the transaction.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-maroon/10 text-maroon font-black flex items-center justify-center text-lg mb-4 border border-maroon/20">
                  2
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-maroon" /> Fill Form
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Open the official registration form and enter your full name, place, institute or workplace, phone, and WhatsApp numbers.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy font-black flex items-center justify-center text-lg mb-4 border border-navy/20">
                  3
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-navy" /> Upload Proof
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Attach your fee payment screenshot (up to 5MB) and an optional personal photograph for official administrative records.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-black flex items-center justify-center text-lg mb-4 border border-emerald-500/20">
                  4
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Reference No.
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Submit the form to immediately receive your official registration reference number (e.g., <code>EDU-JAZ-2026-XXXX</code>).
                </p>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="mt-12 bg-gradient-to-r from-maroon via-maroon-dark to-navy rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                Ready to Join?
              </span>
              <h3 className="text-2xl sm:text-3xl font-black">
                Seats are Limited — Register Today
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 max-w-md">
                Complete your online submission now to ensure your seat at Darussalam Tharqiya Edu Village on 29 October 2026.
              </p>
            </div>

            <Link
              to="/edu-day/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-gray-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all duration-300 shadow-lg shadow-amber-400/25 flex-shrink-0"
            >
              <span>REGISTER FOR JAZRIYYA WORKSHOP</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
