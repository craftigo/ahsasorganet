import { useEffect, useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Unit } from '@shared/types';

export default function FundCollectionPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFunds() {
      try {
        const { data, error } = await supabase
          .from('units')
          .select('id, name, class_name, fund_amount')
          .order('fund_amount', { ascending: false });

        if (error) throw error;
        if (data) setUnits(data as Unit[]);
      } catch (err) {
        console.error('Error loading fund collection:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFunds();
  }, []);

  const totalCollected = units.reduce((sum, u) => sum + (u.fund_amount || 0), 0);

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-gray-950 via-[#1c0813] to-gray-950 text-white py-12 px-4 sm:px-6 lg:px-8 flex-grow">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-black uppercase tracking-wider">
            <Coins className="w-4 h-4 text-yellow-400" /> Community Contribution Drive
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight shimmer-text">
            AHSAS Fund Collection
          </h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Honoring class contributions and collective support towards the association's community goals.
          </p>
        </div>

        {/* Total Collected Highlight Card */}
        <div className="glass-dark border border-yellow-500/30 rounded-3xl p-8 text-center bg-gradient-to-r from-yellow-500/10 via-amber-600/15 to-yellow-500/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-yellow-400/10 rounded-full filter blur-2xl" />
          <span className="text-xs uppercase font-extrabold tracking-widest text-yellow-400 block mb-2">
            Total Fund Aggregated
          </span>
          <div className="text-4xl sm:text-6xl font-black text-yellow-300 drop-shadow-md">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-white/50 mt-3 font-medium">
            Across {units.length} participating class units
          </p>
        </div>

        {/* Units Fund List */}
        <div className="glass-dark rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-16 text-center text-white/40 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin mb-3" />
              <p className="text-sm">Loading contribution records...</p>
            </div>
          ) : units.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {units.map((unit, idx) => {
                const rank = idx + 1;
                const amount = unit.fund_amount || 0;
                const displayName = unit.class_name || unit.name;
                const subName = unit.class_name ? unit.name : '';
                const percentage = totalCollected > 0 ? Math.round((amount / totalCollected) * 100) : 0;

                const rankClass =
                  rank === 1
                    ? 'bg-yellow-400 text-gray-950 font-black'
                    : rank === 2
                    ? 'bg-gray-200 text-gray-950 font-black'
                    : rank === 3
                    ? 'bg-amber-600 text-white font-black'
                    : 'bg-white/10 text-white/70 font-bold';

                return (
                  <li
                    key={unit.id}
                    className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-white/[0.04] transition group"
                  >
                    <div className="col-span-2 flex justify-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-md ${rankClass}`}
                      >
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </div>
                    </div>
                    <div className="col-span-7 sm:col-span-8 flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-white text-sm sm:text-base truncate group-hover:text-yellow-300 transition">
                          {displayName}
                        </h3>
                        {subName && (
                          <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full truncate">
                            {subName}
                          </span>
                        )}
                      </div>
                      {/* Contribution Progress Bar */}
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-1">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${Math.max(percentage, amount > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right">
                      {amount > 0 ? (
                        <>
                          <span className="text-base sm:text-xl font-black text-yellow-300">
                            ₹{amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-white/40 block font-semibold">{percentage}%</span>
                        </>
                      ) : (
                        <span className="text-white/20 text-xs italic">No data</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-12 text-center text-white/40 text-sm">No fund records available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
