import { useEffect, useState } from 'react';
import { Trophy, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Unit } from '@shared/types';

export default function LeaderboardPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from('units')
          .select('id, name, class_name, address, total_score, grade')
          .order('total_score', { ascending: false });

        if (error) throw error;
        if (data) setUnits(data as Unit[]);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const filteredUnits = units.filter((u) => {
    const q = search.toLowerCase();
    const name = (u.name || '').toLowerCase();
    const className = (u.class_name || '').toLowerCase();
    const address = (u.address || '').toLowerCase();
    return name.includes(q) || className.includes(q) || address.includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-fade-in">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-maroon/10 text-maroon mb-3">
          <Trophy className="w-3.5 h-3.5" /> Performance Rankings
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Class Performance Excellence
        </h1>
        <p className="mt-2 text-charcoal text-sm sm:text-base">
          Comprehensive ranking of all active class units across the AHSAS portal.
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-6 max-w-md mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search class or committee..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon shadow-sm"
          />
        </div>
      </div>

      {/* Rankings Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Table Header */}
        <div className="bg-gray-900 text-white px-6 py-4 grid grid-cols-12 gap-4 font-bold text-xs uppercase tracking-wider">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-6">Unit / Class Name</div>
          <div className="col-span-2 text-center">Grade</div>
          <div className="col-span-2 text-right">Points</div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-maroon animate-spin mb-3" />
            <p className="text-sm font-medium">Loading latest rankings...</p>
          </div>
        ) : filteredUnits.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {filteredUnits.map((unit, idx) => {
              const rank = idx + 1;
              const primaryTitle = unit.class_name || unit.name;
              const secondaryTitle = unit.class_name ? unit.name : (unit.address || '');

              const rankBadge =
                rank === 1
                  ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400/50'
                  : rank === 2
                  ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-300'
                  : rank === 3
                  ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400/50'
                  : 'bg-gray-50 text-gray-500';

              return (
                <li
                  key={unit.id}
                  className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50/80 transition group"
                >
                  <div className="col-span-2 flex justify-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-sm ${rankBadge}`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </div>
                  </div>
                  <div className="col-span-6">
                    <h3 className="font-extrabold text-sm sm:text-base text-gray-900 group-hover:text-maroon transition">
                      {primaryTitle}
                    </h3>
                    {secondaryTitle && (
                      <p className="text-xs text-charcoal font-medium mt-0.5 truncate">{secondaryTitle}</p>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gray-100 text-gray-800 border border-gray-200">
                      {unit.grade || '-'}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-lg sm:text-xl font-black text-maroon">
                      {unit.total_score || 0}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">PTS</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-12 text-center text-gray-400 text-sm">
            No units match your search query.
          </div>
        )}
      </div>
    </div>
  );
}
