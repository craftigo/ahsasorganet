import { useEffect, useState } from 'react';
import { Users, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Unit, Member } from '@shared/types';

const ROLE_PRIORITY: Record<string, number> = {
  PRESIDENT: 1,
  'VICE PRESIDENT': 2,
  'GENERAL SECRETARY': 3,
  'JOINT SECRETARY': 4,
  TREASURER: 5,
  'CHIEF EDITOR': 6,
  MEDIA: 7,
};

export default function CommitteesPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    async function fetchUnits() {
      try {
        const { data, error } = await supabase
          .from('units')
          .select('id, name, address, class_name')
          .order('name', { ascending: true });

        if (error) throw error;
        if (data) setUnits(data as Unit[]);
      } catch (err) {
        console.error('Error fetching committees:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUnits();
  }, []);

  const openMembersModal = async (unit: Unit) => {
    setSelectedUnit(unit);
    setLoadingMembers(true);
    setMembers([]);

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('unit_id', unit.id);

      if (error) throw error;
      if (data) {
        const sorted = (data as Member[]).sort((a, b) => {
          const pA = ROLE_PRIORITY[a.designation.toUpperCase()] || 99;
          const pB = ROLE_PRIORITY[b.designation.toUpperCase()] || 99;
          return pA - pB;
        });
        setMembers(sorted);
      }
    } catch (err) {
      console.error('Error fetching unit members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-fade-in">
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-maroon/10 text-maroon mb-3">
          <Users className="w-3.5 h-3.5" /> Leadership Directory
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Class Committees
        </h1>
        <p className="mt-2 text-charcoal text-sm sm:text-base">
          Explore executive leadership and committee members across all affiliated classes.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon animate-spin mb-3" />
          <p className="text-sm font-medium">Loading class committees...</p>
        </div>
      ) : units.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((unit) => {
            const committeeTitle = unit.address || 'Class Committee';
            const classTitle = unit.class_name ? `${unit.class_name} (${unit.name})` : unit.name;

            return (
              <div
                key={unit.id}
                onClick={() => openMembersModal(unit)}
                className="glass p-6 rounded-2xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/80 bg-white group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-maroon/10 text-maroon rounded-2xl flex items-center justify-center font-black text-xl group-hover:bg-maroon group-hover:text-white transition-colors duration-300">
                    {unit.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-gray-900 group-hover:text-maroon transition truncate">
                      {committeeTitle}
                    </h3>
                    <p className="text-xs text-charcoal font-semibold uppercase tracking-wider mt-0.5 truncate">
                      {classTitle}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-gray-400 text-sm">No committees registered yet.</div>
      )}

      {/* Members Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-gray-100">
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">{selectedUnit.address || selectedUnit.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Executive Committee Roster</p>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto">
              {loadingMembers ? (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center">
                  <Loader2 className="w-6 h-6 text-maroon animate-spin mb-2" />
                  <p className="text-xs">Loading committee members...</p>
                </div>
              ) : members.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <li key={member.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                        <p className="text-[11px] text-maroon font-bold uppercase tracking-wider mt-0.5">
                          {member.designation}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-gray-400 text-xs italic">
                  No committee members registered for this unit.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
