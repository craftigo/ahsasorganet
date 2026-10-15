import { useEffect, useState } from 'react';
import { Users, X, Loader2, Phone, Calendar, MapPin, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Unit, Student } from '@shared/types';

export default function MembershipPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Student Profile Modal State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    async function loadMembership() {
      try {
        const [unitsRes, studentsRes] = await Promise.all([
          supabase.from('units').select('id, name').order('name', { ascending: true }),
          supabase.from('students').select('*').order('created_at', { ascending: true }),
        ]);

        if (unitsRes.data) setUnits(unitsRes.data as Unit[]);
        if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      } catch (err) {
        console.error('Membership load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMembership();
  }, []);

  // Group students by unit_id
  const groupedStudents: Record<string, Student[]> = {};
  students.forEach((s) => {
    if (!groupedStudents[s.unit_id]) groupedStudents[s.unit_id] = [];
    groupedStudents[s.unit_id].push(s);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-fade-in">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-maroon/10 text-maroon mb-3">
          <Users className="w-3.5 h-3.5" /> Student Directory
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Class Membership
        </h1>
        <p className="mt-2 text-charcoal text-sm sm:text-base">
          Directory of registered students grouped by academic class units.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-1.5 rounded-full shadow-sm text-xs font-bold text-gray-700">
          <span>Total Registered Students:</span>
          <span className="text-maroon font-black text-sm">{students.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon animate-spin mb-3" />
          <p className="text-sm font-medium">Loading membership rosters...</p>
        </div>
      ) : units.filter((u) => groupedStudents[u.id]?.length > 0).length > 0 ? (
        <div className="space-y-8">
          {units.map((unit) => {
            const unitStudents = groupedStudents[unit.id] || [];
            if (unitStudents.length === 0) return null;

            return (
              <div
                key={unit.id}
                className="bg-white rounded-2xl overflow-hidden shadow-md border-l-8 border-maroon border border-gray-200"
              >
                {/* Unit Header */}
                <div className="bg-gray-900 text-white p-5 sm:p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black">{unit.name}</h2>
                    <p className="text-gray-400 text-xs">Class Unit</p>
                  </div>
                  <div className="bg-maroon/20 border border-maroon/50 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white">
                    <span className="text-sm font-black mr-1">{unitStudents.length}</span> Students
                  </div>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5 text-left w-16">No.</th>
                        <th className="px-6 py-3.5 text-left">Student Name</th>
                        <th className="px-6 py-3.5 text-right">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-sm">
                      {unitStudents.map((student, idx) => (
                        <tr
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className="hover:bg-maroon/[0.03] transition cursor-pointer group"
                        >
                          <td className="px-6 py-3.5 font-semibold text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-6 py-3.5 font-bold text-gray-900 group-hover:text-maroon transition">
                            {student.name}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className="text-xs font-bold text-maroon hover:underline">View Details →</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm text-sm">
          No students registered in any unit yet.
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-gray-100">
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
              <div>
                <span className="text-xs text-maroon font-bold uppercase tracking-wider">Student Profile</span>
                <h3 className="text-xl font-black">{selectedStudent.name}</h3>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> Father's Name
                  </span>
                  <p className="font-bold text-gray-900 mt-1">{selectedStudent.father_name || '—'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date of Birth
                  </span>
                  <p className="font-bold text-gray-900 mt-1">{selectedStudent.dob || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contact
                  </span>
                  <p className="font-bold text-maroon mt-1">{selectedStudent.contact_number || '—'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> District
                  </span>
                  <p className="font-bold text-gray-900 mt-1">{selectedStudent.district || '—'}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Address</span>
                <p className="font-medium text-gray-800 mt-1 leading-relaxed">{selectedStudent.address || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
