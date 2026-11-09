import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Users,
  Building,
  Utensils,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  Settings,
  FileSpreadsheet,
  X,
  Eye,
  Radio,
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parentMeetService } from '../services/parentMeetService';
import {
  ParentMeetSettings,
  ParentRegistration,
  ScannerStation,
  ScanLog,
  AuditLog,
  WhatsAppLog
} from '../../../shared/types';
import { DEFAULT_PARENT_MEET_SETTINGS } from '../../../shared/data/parentMeetDefaults';

type AdminTab =
  | 'overview'
  | 'registrations'
  | 'expo'
  | 'meeting'
  | 'food'
  | 'scanners'
  | 'whatsapp'
  | 'settings'
  | 'audit';

export default function AdminParentMeetPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Core Data States
  const [settings, setSettings] = useState<ParentMeetSettings>(DEFAULT_PARENT_MEET_SETTINGS);
  const [registrations, setRegistrations] = useState<ParentRegistration[]>([]);
  const [stats, setStats] = useState<any>({
    total_registrations: 0,
    total_attendees: 0,
    expo_completed: 0,
    expo_remaining: 0,
    meeting_completed: 0,
    meeting_remaining: 0,
    food_eligible: 0,
    food_redeemed: 0,
    food_remaining: 0,
    whatsapp_sent: 0,
    whatsapp_failed: 0
  });
  const [stations, setStations] = useState<ScannerStation[]>([]);
  const [logs, setLogs] = useState<{ scan_logs: ScanLog[]; audit_logs: AuditLog[]; whatsapp_logs: WhatsAppLog[] }>({
    scan_logs: [],
    audit_logs: [],
    whatsapp_logs: []
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [expoFilter, setExpoFilter] = useState<'all' | 'entered' | 'pending'>('all');
  const [meetingFilter, setMeetingFilter] = useState<'all' | 'attended' | 'pending'>('all');
  const [foodFilter, setFoodFilter] = useState<'all' | 'redeemed' | 'eligible' | 'pending_meeting'>('all');

  // Modals
  const [dbPending, setDbPending] = useState(false);
  const [manualAddModalOpen, setManualAddModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideAction, setOverrideAction] = useState<'expo_reset' | 'attendance_reset' | 'food_reset'>('expo_reset');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRegId, setOverrideRegId] = useState('');
  const [qrModalUrl, setQrModalUrl] = useState<string>('');

  // Manual Add Form State
  const [newParentName, setNewParentName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newAttendees, setNewAttendees] = useState(1);
  const [newAddress, setNewAddress] = useState('');

  // Settings Form State
  const [editableSettings, setEditableSettings] = useState<ParentMeetSettings>(DEFAULT_PARENT_MEET_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load All Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [s, r, st, sc, l] = await Promise.all([
        parentMeetService.getSettings().catch(() => DEFAULT_PARENT_MEET_SETTINGS),
        parentMeetService.getRegistrations().catch(() => []),
        parentMeetService.getAdminStats().catch(() => null),
        parentMeetService.getScannerStations().catch(() => []),
        parentMeetService.getLogs().catch(() => ({ scan_logs: [], audit_logs: [], whatsapp_logs: [] }))
      ]);

      setSettings(s);
      setEditableSettings(s);
      setRegistrations(r);
      if (st) setStats(st);
      setStations(sc);
      setLogs(l);

      // Verify remote Supabase table presence
      try {
        const { error: sbErr } = await supabase.from('parent_registrations').select('id').limit(1);
        setDbPending(!!sbErr && (sbErr.code === 'PGRST205' || sbErr.code === '42P01'));
      } catch {
        setDbPending(true);
      }
    } catch (err: any) {
      console.error('Error loading parent meet admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // Filtered registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      reg.parent_name.toLowerCase().includes(q) ||
      reg.student_name.toLowerCase().includes(q) ||
      reg.whatsapp_number.includes(q) ||
      reg.registration_number.toLowerCase().includes(q) ||
      (reg.student_class && reg.student_class.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (expoFilter === 'entered' && !reg.expo_entry) return false;
    if (expoFilter === 'pending' && reg.expo_entry) return false;

    if (meetingFilter === 'attended' && !reg.meeting_attendance) return false;
    if (meetingFilter === 'pending' && reg.meeting_attendance) return false;

    if (foodFilter === 'redeemed' && reg.food_token?.status !== 'redeemed') return false;
    if (foodFilter === 'eligible' && (reg.food_token?.status === 'redeemed' || !reg.meeting_attendance)) return false;
    if (foodFilter === 'pending_meeting' && reg.meeting_attendance) return false;

    return true;
  });

  // Manual Add Submit
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentName || !newWhatsapp || !newStudentName) {
      alert('Parent Name, WhatsApp, and Student Name are required.');
      return;
    }

    try {
      await parentMeetService.addManualRegistration({
        parent_name: newParentName,
        whatsapp_number: newWhatsapp,
        student_name: newStudentName,
        student_class: newClass,
        attendees_count: newAttendees,
        address: newAddress
      });
      showNotification('Manual registration created successfully!');
      setManualAddModalOpen(false);
      setNewParentName('');
      setNewWhatsapp('');
      setNewStudentName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error adding registration');
    }
  };

  // Regenerate Pass
  const handleRegeneratePass = async (id: string) => {
    const reason = prompt('Please enter a mandatory reason for reissuing this QR Pass:');
    if (!reason || !reason.trim()) return;

    try {
      await parentMeetService.regeneratePass(id, reason.trim());
      showNotification('New secure QR pass generated successfully.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate pass');
    }
  };

  // Resend WhatsApp
  const handleResendWhatsApp = async (id: string) => {
    try {
      const msg = await parentMeetService.resendWhatsApp(id);
      showNotification(msg);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to resend WhatsApp pass');
    }
  };

  // Execute Override
  const handleExecuteOverride = async () => {
    if (!overrideReason.trim()) {
      alert('A mandatory reason is required for audit logs.');
      return;
    }

    try {
      await parentMeetService.performOverride({
        action_type: overrideAction,
        registration_id: overrideRegId,
        mandatory_reason: overrideReason.trim()
      });
      showNotification(`Override '${overrideAction}' executed successfully.`);
      setOverrideModalOpen(false);
      setOverrideReason('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Override failed');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await parentMeetService.updateSettings(editableSettings);
      setSettings(updated);
      showNotification('Event settings and rules updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // View QR Modal
  const openQRModal = async (token: string) => {
    const img = await QRCode.toDataURL(token, { width: 300, margin: 2, color: { dark: '#0369a1', light: '#fff' } });
    setQrModalUrl(img);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) {
      alert('No registrations available to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Parent Name',
      'WhatsApp Number',
      'Child Name',
      'Class',
      'Attendees',
      'Address',
      'Expo Entry',
      'Meeting Attendance',
      'Food Token Status',
      'Registered At'
    ];

    const rows = registrations.map((r) => [
      `"${r.registration_number}"`,
      `"${r.parent_name}"`,
      `"${r.whatsapp_number}"`,
      `"${r.student_name}"`,
      `"${r.student_class || ''}"`,
      r.attendees_count,
      `"${r.address || ''}"`,
      r.expo_entry ? 'Completed' : 'Pending',
      r.meeting_attendance ? 'Confirmed' : 'Pending',
      r.food_token?.status === 'redeemed'
        ? 'Redeemed'
        : r.meeting_attendance
        ? 'Eligible'
        : 'Pending Meeting',
      `"${new Date(r.created_at).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Edu_Familia_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-sky-950 via-sky-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-sky-400/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link to="/admin" className="text-xs font-bold text-sky-400 hover:text-white transition">
              ← Admin Command Center
            </Link>
            <span className="text-sky-600">•</span>
            <span className="text-xs font-extrabold text-amber-300 uppercase">Class Unit Al Suffa (C3)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
            <Users className="w-8 h-8 text-sky-400" />
            <span>Edu Familia – Parent Meet Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-sky-200/80 mt-1 max-w-2xl leading-relaxed">
            Centralized operations suite for parent registrations, QR pass generation, WhatsApp delivery, Expo entry,
            Auditorium attendance, and attendance-dependent food tokens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-sky-100 bg-sky-900/60 hover:bg-sky-800 border border-sky-400/30 transition shadow-sm cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <Link
            to="/event/edu-familia"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition shadow-md"
          >
            <span>Public Registration</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Supabase Production Database Pending Notice */}
      {dbPending && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-black text-amber-900 block text-sm">
                Supabase Database Setup Pending (Action Required in Supabase Dashboard)
              </strong>
              <p className="text-amber-800 text-xs mt-1 leading-relaxed">
                The database tables for Parent Meet Management have not yet been executed in your remote Supabase project. To persist registrations, entry logs, and food token redemptions across all devices in real-time, execute <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900">supabase/migrations/20261109_parent_meet_management.sql</code> in your <strong>Supabase SQL Editor</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              alert('Please open the file supabase/migrations/20261109_parent_meet_management.sql, copy its contents, and run it in your Supabase project (SQL Editor).');
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 shadow-md transition cursor-pointer"
          >
            View SQL Instructions
          </button>
        </div>
      )}

      {/* Global Notification Banner */}
      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Dedicated Scanner Fast-Links Pill Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Link
          to="/scanner/expo"
          target="_blank"
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-white flex items-center justify-between transition shadow-md group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-400 block">Scanner 1</span>
              <span className="text-xs font-black">Expo Entrance</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
        </Link>

        <Link
          to="/scanner/meeting"
          target="_blank"
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-white flex items-center justify-between transition shadow-md group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Scanner 2</span>
              <span className="text-xs font-black">Main Auditorium</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
        </Link>

        <Link
          to="/scanner/food"
          target="_blank"
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-white flex items-center justify-between transition shadow-md group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Scanner 3</span>
              <span className="text-xs font-black">Food Counter</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
        </Link>

        <Link
          to="/event/display"
          target="_blank"
          className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-white flex items-center justify-between transition shadow-md group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Stage / LED</span>
              <span className="text-xs font-black">Large Display Mode</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
        </Link>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'registrations'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Parent Registrations ({registrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'expo'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Expo ({stats.expo_completed})</span>
        </button>

        <button
          onClick={() => setActiveTab('meeting')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'meeting'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Auditorium ({stats.meeting_completed})</span>
        </button>

        <button
          onClick={() => setActiveTab('food')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'food'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Food Tokens ({stats.food_redeemed})</span>
        </button>

        <button
          onClick={() => setActiveTab('scanners')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'scanners'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Scanners ({stations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>WhatsApp Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Rules & Config</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Audit Logs ({logs.audit_logs.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: OVERVIEW DASHBOARD
      ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Families</span>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 flex items-baseline gap-2">
                <span>{stats.total_registrations}</span>
                <span className="text-xs font-bold text-sky-600">Registered</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Attendees</span>
              <div className="text-2xl sm:text-3xl font-black text-sky-700 mt-1 flex items-baseline gap-1">
                <span>{stats.total_attendees}</span>
                <span className="text-xs text-gray-400 font-bold">Persons</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Expo Entries</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 flex items-baseline gap-1">
                <span>{stats.expo_completed}</span>
                <span className="text-sm text-gray-400 font-bold">/ {stats.total_registrations}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Auditorium Meet</span>
              <div className="text-2xl sm:text-3xl font-black text-purple-600 mt-1 flex items-baseline gap-1">
                <span>{stats.meeting_completed}</span>
                <span className="text-sm text-gray-400 font-bold">/ {stats.total_registrations}</span>
              </div>
            </div>
          </div>

          {/* Secondary Funnel Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Expo Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-sky-600" />
                  <span>Expo Attendance Rate</span>
                </span>
                <span className="text-sky-600 font-black">
                  {stats.total_registrations > 0
                    ? `${((stats.expo_completed / stats.total_registrations) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: stats.total_registrations > 0 ? `${(stats.expo_completed / stats.total_registrations) * 100}%` : '0%'
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-400 block pt-1">{stats.expo_remaining} parents yet to enter</span>
            </div>

            {/* Auditorium Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Meeting Attendance Rate</span>
                </span>
                <span className="text-purple-600 font-black">
                  {stats.total_registrations > 0
                    ? `${((stats.meeting_completed / stats.total_registrations) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width:
                      stats.total_registrations > 0 ? `${(stats.meeting_completed / stats.total_registrations) * 100}%` : '0%'
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-400 block pt-1">{stats.meeting_remaining} pending attendance</span>
            </div>

            {/* Food Tokens Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span>Food Tokens Redeemed</span>
                </span>
                <span className="text-amber-600 font-black">
                  {stats.meeting_completed > 0
                    ? `${((stats.food_redeemed / stats.meeting_completed) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: stats.meeting_completed > 0 ? `${(stats.food_redeemed / stats.meeting_completed) * 100}%` : '0%'
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-400 block pt-1">
                {stats.food_redeemed} redeemed • {stats.food_remaining} eligible awaiting feast
              </span>
            </div>
          </div>

          {/* Quick Actions & Recent Scans */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Recent Live Activity Stream</h3>
              <span className="text-[11px] text-gray-400">Auto-logged</span>
            </div>

            {logs.scan_logs.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No scanning activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.scan_logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-xs border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          log.result === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-bold uppercase text-gray-700">[{log.station_type}]</span>
                      <span className="text-gray-900 font-medium">{log.reason || log.result}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {new Date(log.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PARENT REGISTRATIONS LIST & ACTIONS
      ===================================================================== */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search parent, student, phone, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={expoFilter}
                onChange={(e: any) => setExpoFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700"
              >
                <option value="all">Expo: All</option>
                <option value="entered">Expo: Entered</option>
                <option value="pending">Expo: Pending</option>
              </select>

              <select
                value={meetingFilter}
                onChange={(e: any) => setMeetingFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700"
              >
                <option value="all">Meeting: All</option>
                <option value="attended">Meeting: Attended</option>
                <option value="pending">Meeting: Pending</option>
              </select>

              <select
                value={foodFilter}
                onChange={(e: any) => setFoodFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700"
              >
                <option value="all">Food: All</option>
                <option value="redeemed">Food: Redeemed</option>
                <option value="eligible">Food: Eligible</option>
                <option value="pending_meeting">Food: Missing Meeting</option>
              </select>

              <button
                onClick={() => setManualAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto sm:ml-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Parent</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition flex items-center gap-1 cursor-pointer"
                title="Export Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Registrations Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            {filteredRegistrations.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                {searchQuery ? 'No matching registrations found.' : 'No parent registrations recorded yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Pass ID</th>
                      <th className="px-4 py-3">Parent & Contact</th>
                      <th className="px-4 py-3">Child & Class</th>
                      <th className="px-4 py-3 text-center">Attendees</th>
                      <th className="px-4 py-3 text-center">Expo Entry</th>
                      <th className="px-4 py-3 text-center">Meeting</th>
                      <th className="px-4 py-3 text-center">Food Token</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-sky-50/30 transition">
                        {/* Pass ID */}
                        <td className="px-4 py-3 font-mono font-bold text-sky-950">
                          <button
                            type="button"
                            onClick={() => openQRModal(reg.qr_token)}
                            className="text-sky-700 hover:text-sky-950 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{reg.registration_number}</span>
                          </button>
                        </td>

                        {/* Parent & Contact */}
                        <td className="px-4 py-3">
                          <div className="font-extrabold text-gray-900">{reg.parent_name}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{reg.whatsapp_number}</div>
                        </td>

                        {/* Child & Class */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{reg.student_name}</div>
                          {reg.student_class && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                              {reg.student_class}
                            </span>
                          )}
                        </td>

                        {/* Attendees */}
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                            {reg.attendees_count}
                          </span>
                        </td>

                        {/* Expo Entry */}
                        <td className="px-4 py-3 text-center">
                          {reg.expo_entry ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                              ✓ Entered
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold text-[10px]">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Meeting Attendance */}
                        <td className="px-4 py-3 text-center">
                          {reg.meeting_attendance ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                              ✓ Attended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Food Token */}
                        <td className="px-4 py-3 text-center">
                          {reg.food_token?.status === 'redeemed' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                              ✓ Redeemed
                            </span>
                          ) : reg.meeting_attendance ? (
                            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                              Eligible
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold text-[10px]">
                              Locked
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/event/pass/${reg.qr_token}`}
                              target="_blank"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition"
                              title="Open Digital Pass"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleResendWhatsApp(reg.id)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                              title="Resend WhatsApp Pass"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRegeneratePass(reg.id)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                              title="Reissue New QR Code"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOverrideRegId(reg.id);
                                setOverrideModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition"
                              title="Admin Override / Reset Status"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: EXPO MANAGEMENT
      ===================================================================== */}
      {activeTab === 'expo' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Edu Expo Entrance Activity Log</h2>
              <p className="text-xs text-gray-500">
                One-time entry tracking • Re-entry attempts are automatically blocked
              </p>
            </div>
            <Link
              to="/scanner/expo"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <span>Open Expo Scanner</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {registrations
              .filter((r) => r.expo_entry)
              .map((reg) => (
                <div
                  key={reg.id}
                  className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-gray-900 text-sm block">{reg.parent_name}</span>
                    <span className="text-gray-500 text-[11px]">
                      Student: {reg.student_name} ({reg.student_class || 'Standard'}) • {reg.registration_number}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      ✓ Entry Approved
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1 font-mono">
                      {reg.expo_entry?.entry_timestamp &&
                        new Date(reg.expo_entry.entry_timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: MAIN MEETING MANAGEMENT
      ===================================================================== */}
      {activeTab === 'meeting' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Main Auditorium Attendance Record</h2>
              <p className="text-xs text-gray-500">Verified attendees eligible for food tokens</p>
            </div>
            <Link
              to="/scanner/meeting"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <span>Open Meeting Scanner</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {registrations
              .filter((r) => r.meeting_attendance)
              .map((reg) => (
                <div
                  key={reg.id}
                  className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-gray-900 text-sm block">{reg.parent_name}</span>
                    <span className="text-gray-500 text-[11px]">
                      Student: {reg.student_name} • {reg.registration_number}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      ✓ Attendance Confirmed
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1 font-mono">
                      {reg.meeting_attendance?.attendance_timestamp &&
                        new Date(reg.meeting_attendance.attendance_timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: FOOD TOKEN MANAGEMENT
      ===================================================================== */}
      {activeTab === 'food' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Food Counter Redemption Monitor</h2>
              <p className="text-xs text-gray-500">
                Attendance-dependent tokens • Redemptions locked until Main Meeting is recorded
              </p>
            </div>
            <Link
              to="/scanner/food"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <span>Open Food Scanner</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Redeemed List */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <span className="text-xs font-black uppercase text-emerald-800 tracking-wider block">
                Redeemed & Served ({stats.food_redeemed})
              </span>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {registrations
                  .filter((r) => r.food_token?.status === 'redeemed')
                  .map((reg) => (
                    <div key={reg.id} className="p-2.5 rounded-xl bg-white text-xs border border-emerald-100">
                      <div className="font-bold text-gray-900">{reg.parent_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        Redeemed:{' '}
                        {reg.food_token?.redeemed_at
                          ? new Date(reg.food_token.redeemed_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recorded'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Awaiting Feast / Missing Meeting */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
              <span className="text-xs font-black uppercase text-amber-800 tracking-wider block">
                Eligible or Awaiting Meeting
              </span>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {registrations
                  .filter((r) => r.food_token?.status !== 'redeemed')
                  .map((reg) => (
                    <div key={reg.id} className="p-2.5 rounded-xl bg-white text-xs border border-amber-100 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-900">{reg.parent_name}</div>
                        <div className="text-[10px] text-gray-400">{reg.registration_number}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          reg.meeting_attendance ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {reg.meeting_attendance ? 'Eligible' : 'Meeting Missing'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: SCANNER STATIONS & DEVICE MANAGEMENT
      ===================================================================== */}
      {activeTab === 'scanners' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Scanner Stations & Staff Assignments</h2>
              <p className="text-xs text-gray-500">Manage physical gate stations, access keys, and staff roles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stations.map((st) => (
              <div key={st.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    {st.type.toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">● Active</span>
                </div>

                <div>
                  <h3 className="font-black text-gray-900 text-sm">{st.name}</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">Staff: {st.assigned_staff_name}</p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Station Key:</span>
                    <span className="font-mono font-bold text-gray-800">{st.access_key}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Scans:</span>
                    <span className="font-bold text-sky-700">{st.total_scans}</span>
                  </div>
                </div>

                <Link
                  to={`/scanner/${st.type}`}
                  target="_blank"
                  className="block text-center py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition"
                >
                  Launch Station Interface
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: WHATSAPP MANAGEMENT
      ===================================================================== */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">WhatsApp Notification Delivery Monitor</h2>
              <p className="text-xs text-gray-500">Meta Cloud API integration status and delivery logs</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                settings.whatsapp_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              Status: {settings.whatsapp_enabled ? 'Production API Active' : 'Testing / Simulated Mode'}
            </span>
          </div>

          {/* Sender Overview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-extrabold text-sky-950 text-sm">Official WhatsApp Sender: +91 83019 48964</span>
                <p className="text-[11px] text-sky-800">
                  Mode: <strong>{settings.whatsapp_enabled ? 'Live Cloud API' : 'Simulated Sandbox'}</strong> • Delivery: Personalized QR Pass Card Image (PNG)
                </p>
              </div>
              <span className="text-[10px] font-mono bg-white px-3 py-1 rounded-full border border-sky-300 font-bold text-sky-900">
                Sender: 918301948964
              </span>
            </div>
            <div className="text-[11px] text-gray-600 border-t border-sky-200/60 pt-2 flex flex-wrap gap-4">
              <span>Webhook Endpoint: <code className="bg-white/80 px-1.5 py-0.5 rounded text-[10px] font-mono">https://ahsasorganet.vercel.app/api/parent-meet/whatsapp/webhook</code></span>
              <span>Verify Token: <code className="bg-white/80 px-1.5 py-0.5 rounded text-[10px] font-mono">ahsas_edu_familia_2026</code></span>
            </div>
          </div>

          <div className="space-y-3">
            {logs.whatsapp_logs.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No WhatsApp logs recorded yet.</p>
            ) : (
              logs.whatsapp_logs.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900 font-mono">{w.phone_number}</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Type: {w.message_type} • Provider: {w.provider}
                      {w.provider_response_id && ` • ID: ${w.provider_response_id}`}
                    </p>
                    {w.error_message && (
                      <p className="text-[10px] text-amber-700 font-medium mt-0.5 italic">
                        {w.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        w.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : w.status === 'sent'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : w.status === 'simulated'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {w.status === 'simulated' ? 'SIMULATED / TEST' : w.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(w.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: EVENT RULES & CONFIGURATION
      ===================================================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">Event Rules & Global Configuration</h2>
              <p className="text-xs text-gray-500">
                All settings directly control backend logic and validation rules in real-time.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {savingSettings ? 'Saving Rules...' : 'Save Configuration'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Event Name */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                value={editableSettings.event_name}
                onChange={(e) => setEditableSettings({ ...editableSettings, event_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-semibold"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={editableSettings.event_subtitle}
                onChange={(e) => setEditableSettings({ ...editableSettings, event_subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-semibold"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Venue / Institution</label>
              <input
                type="text"
                value={editableSettings.venue}
                onChange={(e) => setEditableSettings({ ...editableSettings, venue: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-semibold"
              />
            </div>

            {/* Event Date */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Event Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={editableSettings.event_date}
                onChange={(e) => setEditableSettings({ ...editableSettings, event_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-semibold"
              />
            </div>

            {/* Max Registrations */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Max Registrations Allowed</label>
              <input
                type="number"
                value={editableSettings.max_registrations}
                onChange={(e) =>
                  setEditableSettings({ ...editableSettings, max_registrations: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-semibold"
              />
            </div>

            {/* Max Attendees */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Max Attendees per Family</label>
              <input
                type="number"
                value={editableSettings.max_attendees_per_reg}
                onChange={(e) =>
                  setEditableSettings({ ...editableSettings, max_attendees_per_reg: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-semibold"
              />
            </div>
          </div>

          {/* Logic Switches */}
          <div className="pt-4 border-t border-gray-100 space-y-3 text-xs">
            <span className="font-extrabold uppercase text-gray-700 block tracking-wider text-[11px]">
              Access & Validation Switches:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableSettings.registration_enabled}
                  onChange={(e) =>
                    setEditableSettings({ ...editableSettings, registration_enabled: e.target.checked })
                  }
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-bold text-gray-800">Public Registration Open</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableSettings.prevent_duplicate_phone}
                  onChange={(e) =>
                    setEditableSettings({ ...editableSettings, prevent_duplicate_phone: e.target.checked })
                  }
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-bold text-gray-800">Block Duplicate WhatsApp Numbers</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableSettings.food_requires_meeting}
                  onChange={(e) =>
                    setEditableSettings({ ...editableSettings, food_requires_meeting: e.target.checked })
                  }
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-bold text-gray-800">Require Main Meeting for Food Token</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editableSettings.expo_enabled}
                  onChange={(e) => setEditableSettings({ ...editableSettings, expo_enabled: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-bold text-gray-800">Enable Edu Expo Scanner Station</span>
              </label>
            </div>
          </div>

          {/* WhatsApp Cloud API Configuration */}
          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-extrabold uppercase text-gray-700 block tracking-wider text-[11px]">
                  Official WhatsApp Cloud API Configuration:
                </span>
                <p className="text-[11px] text-gray-500">
                  Automated personalized QR card image delivery from verified business sender <strong>+91 83019 48964</strong>.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200">
                <input
                  type="checkbox"
                  checked={editableSettings.whatsapp_enabled}
                  onChange={(e) => setEditableSettings({ ...editableSettings, whatsapp_enabled: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-bold text-xs text-sky-900">Enable Live WhatsApp Delivery</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Official Sender Account (Fixed)</label>
                <input
                  type="text"
                  disabled
                  value="+91 83019 48964 (International: 918301948964)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 font-mono font-semibold"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Sender account. Each parent's unique pass is sent to their registered WhatsApp number.
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Meta Phone Number ID</label>
                <input
                  type="text"
                  placeholder="e.g. 106548729182374"
                  value={editableSettings.whatsapp_phone_number_id || ''}
                  onChange={(e) => setEditableSettings({ ...editableSettings, whatsapp_phone_number_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono text-xs"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Found in Meta Developer Portal &gt; WhatsApp &gt; API Setup.
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Meta Business Account ID (WABA ID)</label>
                <input
                  type="text"
                  placeholder="e.g. 108472910482910"
                  value={editableSettings.whatsapp_business_account_id || ''}
                  onChange={(e) => setEditableSettings({ ...editableSettings, whatsapp_business_account_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">WhatsApp Utility Template Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. edu_familia_qr_pass"
                  value={editableSettings.whatsapp_template_name || ''}
                  onChange={(e) => setEditableSettings({ ...editableSettings, whatsapp_template_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono text-xs"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Leave blank to use direct high-res card image with caption.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Meta Permanent System User Access Token</label>
                <input
                  type="password"
                  placeholder="EAABw..."
                  value={editableSettings.whatsapp_access_token || ''}
                  onChange={(e) => setEditableSettings({ ...editableSettings, whatsapp_access_token: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 font-mono text-xs"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Stored securely. Never exposed in public client responses.
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =====================================================================
          TAB 9: AUDIT LOGS & ADMIN OVERRIDES
      ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-black text-gray-900">Administrator Audit Trail & Override Log</h2>
            <p className="text-xs text-gray-500">Every manual override, QR reissue, and rule change is recorded.</p>
          </div>

          <div className="space-y-2">
            {logs.audit_logs.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No audit logs recorded yet.</p>
            ) : (
              logs.audit_logs.map((a) => (
                <div key={a.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[10px]">
                      {a.action}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-medium text-gray-800">
                    <strong>Reason:</strong> {a.mandatory_reason}
                  </div>
                  <div className="text-[11px] text-gray-500">By: {a.performed_by}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MANUAL ADD REGISTRATION
      ===================================================================== */}
      {manualAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900">Manual Parent Registration</h3>
              <button
                type="button"
                onClick={() => setManualAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Parent Name *</label>
                <input
                  type="text"
                  required
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Class / Dept</label>
                  <input
                    type="text"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Attendees</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newAttendees}
                    onChange={(e) => setNewAttendees(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Address / Place</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold">
                  Create Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADMIN OVERRIDE
      ===================================================================== */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Authorized Admin Override</span>
              </h3>
              <button
                type="button"
                onClick={() => setOverrideModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Override Action</label>
                <select
                  value={overrideAction}
                  onChange={(e: any) => setOverrideAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-semibold"
                >
                  <option value="expo_reset">Reset Expo Entry (Allow Re-Entry)</option>
                  <option value="attendance_reset">Reset Main Meeting Attendance</option>
                  <option value="food_reset">Reset Food Token (Allow Re-Collection)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Mandatory Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the justification for this override (logged permanently)..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteOverride}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Execute Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: QR PREVIEW
      ===================================================================== */}
      {qrModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-gray-900">QR Code Preview</h3>
            <img src={qrModalUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-xl object-contain border" />
            <button
              type="button"
              onClick={() => setQrModalUrl('')}
              className="w-full py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
