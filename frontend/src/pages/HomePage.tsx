import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Coins, Sparkles, Loader2, Calendar, Clock, MapPin, Ticket, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { Unit } from '@shared/types';
import { EduDayPoster } from '../components/events/EduDayPoster';

export default function HomePage() {
  const { settings } = useSettings();
  const [topUnits, setTopUnits] = useState<Unit[]>([]);
  const [topFundUnits, setTopFundUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const showFund = Boolean(settings.show_fund_collection);
  const newsItems = (settings.news_ticker || 'Welcome to the AHSAS Activity Management Portal!')
    .split('•')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch Top 3 Leaderboard
        const { data: lbData } = await supabase
          .from('units')
          .select('id, name, class_name, address, total_score, grade')
          .order('total_score', { ascending: false })
          .limit(3);

        if (lbData) setTopUnits(lbData as Unit[]);

        // 2. Fetch Top 3 Fund Contributors
        const { data: fundData } = await supabase
          .from('units')
          .select('id, name, class_name, fund_amount')
          .order('fund_amount', { ascending: false })
          .limit(3);

        if (fundData) setTopFundUnits(fundData as Unit[]);
      } catch (err) {
        console.error('Home data load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="flex-grow flex flex-col">
      {/* News Ticker - Single-line continuous horizontal announcement strip */}
      <div
        className="bg-maroon text-white h-9 flex items-center overflow-hidden border-b border-red-950/40 select-none"
        role="region"
        aria-label="Announcements"
      >
        <div className="ticker-wrap h-full flex items-center">
          <div className="ticker-track items-center text-xs sm:text-sm font-semibold tracking-wide">
            {/* Primary sequence */}
            <div className="inline-flex items-center flex-nowrap whitespace-nowrap gap-8 pr-8">
              {newsItems.map((item, idx) => (
                <span key={`t1-${idx}`} className="inline-flex items-center flex-nowrap whitespace-nowrap gap-2 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                  <span className="text-white/40 ml-4 font-bold" aria-hidden="true">•</span>
                </span>
              ))}
            </div>
            {/* Duplicate sequence for seamless continuous marquee loop */}
            <div className="inline-flex items-center flex-nowrap whitespace-nowrap gap-8 pr-8" aria-hidden="true">
              {newsItems.map((item, idx) => (
                <span key={`t2-${idx}`} className="inline-flex items-center flex-nowrap whitespace-nowrap gap-2 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                  <span className="text-white/40 ml-4 font-bold" aria-hidden="true">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EDU DAY — ANNIVERSARY SPECIAL SECTION (FIRST PRIMARY HOMEPAGE SECTION)
          The premier visual focus when visitors open the homepage
      ========================================================================= */}
      <section className="relative py-16 sm:py-20 bg-gradient-to-br from-gray-950 via-[#1a1429] to-navy text-white overflow-hidden border-b border-amber-500/20">
        {/* Ambient lighting effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-maroon/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Official Label Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-gradient-to-r from-amber-500/20 via-maroon/30 to-amber-500/10 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10 mb-4 animate-fade-in-down">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>EDU DAY — ANNIVERSARY SPECIAL</span>
              </div>

              {/* Main Prominent Headings */}
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
                EDU DAY
              </h2>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-400">
                JAZRIYYA ONE DAY WORKSHOP
              </div>

              <p className="mt-4 text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl">
                In celebration of our prestigious college anniversary, <strong className="text-white">IRTHIQA Quranic Academy</strong> in proud association with <strong className="text-white">AHSAS</strong> presents an intensive, structured workshop dedicated to the mastery of the celebrated Tajweed text, <em>Al-Muqaddimah Al-Jazariyyah</em>.
              </p>

              {/* Event Metadata Grid */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-xl">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Date</span>
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-white">29 Oct 2026</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Time</span>
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-white">9:00 AM – 5:00 PM</p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 backdrop-blur-xs col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-amber-400 mb-1">
                    <Ticket className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Registration Fee</span>
                  </div>
                  <p className="text-lg font-black text-amber-300">₹313</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs col-span-2 sm:col-span-3 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">Venue & Host</span>
                    <p className="text-sm font-semibold text-white">
                      Darussalam Tharqiya Edu Village
                      <span className="text-gray-400 text-xs block sm:inline sm:ml-2 sm:before:content-['•_']">
                        Organized by IRTHIQA Quranic Academy & AHSAS
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>Online Registrations are Live — Seats are limited. Complete your enrollment now.</span>
              </div>

              {/* Call-to-Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link
                  to="/edu-day/register"
                  id="edu-day-register-now-btn"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-gray-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all duration-300 shadow-xl shadow-amber-400/20 transform hover:-translate-y-0.5"
                >
                  <Ticket className="w-5 h-5 text-gray-950" />
                  <span>REGISTER NOW</span>
                </Link>

                <Link
                  to="/edu-day"
                  id="edu-day-view-details-btn"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 backdrop-blur-xs transform hover:-translate-y-0.5"
                >
                  <span>VIEW EVENT DETAILS</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </Link>
              </div>
            </div>

            {/* Right Visual Poster Column */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md">
                <EduDayPoster />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Regular AHSAS Hero Section - Positioned below EDU DAY */}
      <section className="relative bg-white overflow-hidden pt-14 pb-16 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-maroon/10 text-maroon mb-6 animate-fade-in-down">
              <Trophy className="w-4 h-4" /> Official Activities & Ranking Portal
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
              Digitizing Activities <br />
              <span className="text-maroon">Fostering Healthy Competition</span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-charcoal leading-relaxed">
              The Anwarul Huda Students' Association platform to manage activities, track performance scores, and celebrate excellence across all classes.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                to="/leaderboard"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white bg-maroon hover:bg-maroon-dark transition-all duration-300 shadow-xl shadow-maroon/25 transform hover:-translate-y-0.5"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-40">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-maroon/20 rounded-full filter blur-3xl animate-pulse-subtle" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-navy/15 rounded-full filter blur-3xl animate-pulse-subtle" />
        </div>
      </section>

      {/* AHSAS FUND COLLECTION Spotlight (Conditionally Rendered) */}
      {showFund && (
        <section className="bg-gradient-to-br from-gray-950 via-[#2d0d1f] to-gray-950 text-white py-20 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center gap-3 mb-3">
                <span className="text-4xl animate-bounce">💰</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight shimmer-text">
                  AHSAS FUND COLLECTION
                </h2>
                <span className="text-4xl animate-bounce">💰</span>
              </div>
              <p className="text-gray-300 text-sm max-w-md mx-auto">
                Top contributing class units — thank you for your commitment and generosity!
              </p>
              <div className="w-20 h-1 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full mx-auto mt-4" />
            </div>

            {/* Top 3 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {topFundUnits.map((unit, idx) => {
                const rankEmojis = ['🥇', '🥈', '🥉'];
                const rankStyles = [
                  'from-yellow-500/25 to-yellow-600/10 border-yellow-400/50 shadow-yellow-500/20',
                  'from-gray-300/20 to-gray-400/10 border-gray-300/40 shadow-gray-400/10',
                  'from-amber-600/20 to-amber-700/10 border-amber-600/40 shadow-amber-600/10',
                ];
                const amountColors = ['text-yellow-300', 'text-gray-200', 'text-amber-300'];
                const displayName = unit.class_name || unit.name;
                const subName = unit.class_name ? unit.name : '';

                return (
                  <div
                    key={unit.id}
                    className={`glass-dark rounded-2xl p-6 text-center border bg-gradient-to-b ${rankStyles[idx]} shadow-lg transition-transform hover:-translate-y-1`}
                  >
                    <div className="text-4xl mb-3">{rankEmojis[idx]}</div>
                    <h3 className="text-white font-extrabold text-base sm:text-lg leading-tight truncate">
                      {displayName}
                    </h3>
                    {subName && <p className="text-white/60 text-xs mt-1 truncate">{subName}</p>}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <span className={`text-2xl sm:text-3xl font-black ${amountColors[idx]}`}>
                        ₹{(unit.fund_amount || 0).toLocaleString('en-IN')}
                      </span>
                      <p className="text-white/50 text-[10px] uppercase font-bold tracking-wider mt-1">Contributed</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <Link
                to="/fund-collection"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 font-black rounded-full shadow-lg hover:from-yellow-400 hover:to-amber-500 transition-all duration-300 transform hover:-translate-y-0.5 text-sm"
              >
                <Coins className="w-4 h-4" />
                <span>View Full Fund Collection</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Live Leaderboard Top 3 Podium */}
      <section className="py-20 bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900">Live Leaderboard</h2>
            <p className="text-charcoal text-sm mt-2">Top performing classes this academic month</p>
          </div>

          <div className="glass rounded-2xl shadow-xl overflow-hidden border border-gray-200 divide-y divide-gray-100 bg-white">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-maroon animate-spin mb-3" />
                <p className="text-sm">Loading top performers...</p>
              </div>
            ) : topUnits.length > 0 ? (
              topUnits.map((unit, idx) => {
                const rank = idx + 1;
                const primaryTitle = unit.class_name || unit.name;
                const secondaryTitle = unit.class_name ? unit.name : (unit.address || '');

                return (
                  <div
                    key={unit.id}
                    className="p-6 flex items-center justify-between hover:bg-gray-50/80 transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-sm ${
                          rank === 1
                            ? 'bg-maroon text-white ring-4 ring-maroon/20'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-maroon transition">
                          {primaryTitle}
                        </h3>
                        {secondaryTitle && <p className="text-xs text-charcoal mt-0.5">{secondaryTitle}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black text-maroon">
                        {unit.total_score || 0}
                      </span>
                      <span className="text-xs font-semibold text-gray-400 block uppercase">Points</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400">No unit rankings available yet.</div>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 text-sm font-bold text-maroon hover:text-maroon-dark transition underline underline-offset-4"
            >
              <span>Explore Complete Rankings & Unit Grades</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
