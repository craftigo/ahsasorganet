import { useEffect, useState } from 'react';
import { Bell, ChevronDown, ChevronUp, Download, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificationItem } from '@shared/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setNotifications(data as NotificationItem[]);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-fade-in">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-maroon/10 text-maroon mb-3">
          <Bell className="w-3.5 h-3.5" /> Official Announcements
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Circulars & Notifications
        </h1>
        <p className="mt-2 text-charcoal text-sm sm:text-base">
          Official communications, guidelines, and circulars broadcast by the administration.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-maroon animate-spin mb-3" />
          <p className="text-sm font-medium">Loading notifications...</p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => toggleExpand(item.id)}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 border-l-8 border-l-maroon overflow-hidden cursor-pointer transition-all hover:shadow-md"
              >
                <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base sm:text-lg text-gray-900 leading-snug">
                        {item.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {!isExpanded && item.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="p-1 text-gray-400 hover:text-gray-600 transition">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-dashed border-gray-100 space-y-4 animate-fade-in text-sm text-gray-700">
                    <p className="leading-relaxed whitespace-pre-wrap">{item.description}</p>

                    {item.file_url && (
                      <div className="pt-2">
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-maroon hover:bg-maroon-dark transition shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View / Download Attachment</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm text-sm">
          No circulars or notifications published yet.
        </div>
      )}
    </div>
  );
}
