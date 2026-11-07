import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Coins, Sparkles, Loader2, HelpCircle, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { Unit } from '@shared/types';
import { isQuizClosed, isQuizUpcoming } from '../data/quizQuestions';

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
          EDU FAMILIA — ONLINE QUIZ COMPETITION SPOTLIGHT (Al Suffa C3 Special)
      ========================================================================= */}
      <section className="relative py-12 sm:py-16 bg-gradient-to-br from-slate-950 via-[#270b3b] to-slate-950 text-white overflow-hidden border-b border-purple-500/25">
        {/* Ambient lighting effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>EDU FAMILIA • AL SUFFA (C3) SPECIAL</span>
              </div>

              {/* Main Title */}
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                ONLINE QUIZ COMPETITION
              </h2>

              <p className="text-base sm:text-lg font-medium text-purple-200 leading-relaxed">
                Organized by AHSAS Class Unit <strong>Al Suffa (C3)</strong> in connection with the prestigious <em>Edu Familia</em> Parents' Meet at Darussalam Tharqiya Edu Village.
              </p>

              {/* Event Metadata Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-lg pt-1">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Date</span>
                  <span className="text-xs sm:text-sm font-extrabold text-white">Sunday, 08 Nov 2026</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Questions</span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-300">30 Qs (30s each)</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Organizer</span>
                  <span className="text-xs sm:text-sm font-extrabold text-white">Al Suffa (C3) • AHSAS</span>
                </div>
              </div>

              {/* Status Alert Dynamic */}
              {isQuizClosed() ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                  <Lock className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>Registration Closed • Quiz window ended at 12:00 AM.</span>
                </div>
              ) : isQuizUpcoming() ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>Registration Opens Sunday 12:00 AM.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>Online Quiz is Live Now! (Open until 12:00 AM tonight).</span>
                </div>
              )}

              {/* Big CTA Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {isQuizClosed() ? (
                  <Link
                    to="/quiz"
                    id="participate-quiz-btn"
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-black text-rose-200 bg-rose-950/80 border border-rose-600/50 hover:bg-rose-900/80 transition shadow-xl text-sm sm:text-base cursor-pointer"
                  >
                    <Lock className="w-5 h-5 text-rose-400" />
                    <span>REGISTRATION CLOSED</span>
                    <ArrowRight className="w-4 h-4 text-rose-400" />
                  </Link>
                ) : (
                  <Link
                    to="/quiz"
                    id="participate-quiz-btn"
                    className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-black text-gray-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition shadow-xl shadow-amber-400/25 transform hover:-translate-y-0.5 text-sm sm:text-base cursor-pointer"
                  >
                    <HelpCircle className="w-5 h-5 text-gray-950" />
                    <span>ATTEND QUIZ NOW</span>
                    <ArrowRight className="w-4 h-4 text-gray-950" />
                  </Link>
                )}
              </div>
            </div>

            {/* Right Brand Logo Column — Upgraded High-Impact Card */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="relative group max-w-md w-full p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-purple-950/90 via-slate-950/95 to-purple-950/90 border border-purple-400/40 shadow-[0_20px_50px_rgba(88,28,135,0.4)] backdrop-blur-xl flex flex-col items-center text-center overflow-hidden">
                {/* Dynamic animated glow backdrop */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-400 rounded-3xl blur-2xl opacity-40 group-hover:opacity-75 transition duration-700 pointer-events-none" />
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-600/20 rounded-full blur-xl pointer-events-none" />

                {/* Subtitle Badge */}
                <div className="relative z-10 mb-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-black tracking-widest uppercase bg-purple-500/20 border border-purple-400/40 text-purple-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AL SUFFA (C3) PRESENTS</span>
                </div>

                {/* Main Edu Familia Typography Logo (Cropped & Scaled to Full Impact) */}
                <div className="relative z-10 w-full flex items-center justify-center py-4 my-2">
                  <img
                    src="/assets/edu_familia_logo.png"
                    alt="Edu Familia Official Logo"
                    className="w-full max-w-[290px] sm:max-w-[340px] h-auto object-contain drop-shadow-[0_12px_28px_rgba(255,255,255,0.35)] filter brightness-110 transform transition duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Bottom Card Footer Details */}
                <div className="relative z-10 mt-4 pt-4 border-t border-purple-500/30 w-full space-y-2">
                  <span className="text-xs sm:text-sm font-black tracking-widest text-amber-300 uppercase block">
                    PARENTS' MEET & ONLINE QUIZ 2026
                  </span>
                  <p className="text-xs text-purple-200 font-medium">
                    Darussalam Tharqiya Edu Village • Koyilandy, Calicut
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      40 Questions • Live
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden pt-16 pb-20 border-b border-gray-100">
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
