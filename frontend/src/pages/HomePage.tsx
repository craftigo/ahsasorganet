import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Coins, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { Unit } from '@shared/types';

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
      {/* News Ticker */}
      <div className="bg-maroon text-white py-2.5 overflow-hidden border-b border-red-950/30">
        <div className="ticker-wrap flex items-center">
          <div className="ticker-content flex items-center gap-8 text-xs sm:text-sm font-semibold tracking-wide">
            {newsItems.concat(newsItems).map((item, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden pt-16 pb-24 border-b border-gray-100">
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
