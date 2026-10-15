import { useEffect, useState } from 'react';
import { Calendar, Award, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Report } from '@shared/types';

export default function ProgramsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApprovedPrograms() {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('id, title, submitted_at, points_awarded')
          .eq('status', 'approved')
          .order('submitted_at', { ascending: false });

        if (error) throw error;
        if (data) setReports(data as Report[]);
      } catch (err) {
        console.error('Error fetching programs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchApprovedPrograms();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-fade-in">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-maroon/10 text-maroon mb-3">
          <Award className="w-3.5 h-3.5" /> Activity Archive
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Approved Programs & Activities
        </h1>
        <p className="mt-2 text-charcoal text-sm sm:text-base">
          Chronological record of approved class activities and achievements.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon animate-spin mb-3" />
          <p className="text-sm font-medium">Loading programs...</p>
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white p-5 rounded-2xl border border-gray-200 border-l-4 border-l-maroon shadow-sm flex items-center justify-between gap-4 hover:shadow-md transition"
            >
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">{report.title}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                <Calendar className="w-3 h-3" />
                {new Date(report.submitted_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm text-sm">
          No approved programs recorded yet.
        </div>
      )}
    </div>
  );
}
