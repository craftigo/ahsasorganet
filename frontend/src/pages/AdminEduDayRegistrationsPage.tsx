import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AdminNavigation } from '../components/layout/AdminNavigation';
import {
  EduDayRegistration,
  EduDayRegistrationStatus,
  EduDayRegistrationsResponse,
  EduDaySignedUrlResponse
} from '../../../shared/types';
import {
  ShieldAlert,
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  Users,
  MapPin,
  Phone,
  MessageCircle,
  BookOpen,
  AlertTriangle,
  X,
  ExternalLink,
  Download,
  Copy,
  Check,
  ArrowUpDown,
  Sparkles,
  FileText,
  AlertCircle
} from 'lucide-react';

const STATUS_LABELS: Record<EduDayRegistrationStatus, string> = {
  submitted: 'Awaiting Verification',
  verified: 'Verified',
  rejected: 'Rejected',
  attended: 'Attended'
};

const STATUS_BADGE_STYLES: Record<EduDayRegistrationStatus, string> = {
  submitted: 'bg-amber-100 text-amber-800 border-amber-300',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-300',
  attended: 'bg-purple-100 text-purple-800 border-purple-300'
};

export const AdminEduDayRegistrationsPage: React.FC = () => {
  const { isAdmin } = useAuth();

  // Registrations state
  const [registrations, setRegistrations] = useState<EduDayRegistration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [configurationPending, setConfigurationPending] = useState<boolean>(false);
  const [configurationMessage, setConfigurationMessage] = useState<string>('');

  // Summary counts
  const [summary, setSummary] = useState({
    total: 0,
    submitted: 0,
    verified: 0,
    rejected: 0,
    attended: 0
  });

  // Filters & Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [selectedRegistration, setSelectedRegistration] = useState<EduDayRegistration | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);

  // Status Change State
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [updatingRegistration, setUpdatingRegistration] = useState<EduDayRegistration | null>(null);
  const [newStatus, setNewStatus] = useState<EduDayRegistrationStatus>('submitted');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deletingRegistration, setDeletingRegistration] = useState<EduDayRegistration | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Secure File Preview Modal State
  const [filePreviewModalOpen, setFilePreviewModalOpen] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Get authenticated JWT token
  const getAuthToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  // Fetch registrations
  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setError('Authentication required. Please log in as an administrator.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        search: debouncedSearch,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/edu-day/admin/registrations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch registrations (${response.status})`);
      }

      const data: EduDayRegistrationsResponse = await response.json();

      if (data.configurationPending) {
        setConfigurationPending(true);
        setConfigurationMessage(
          data.configurationMessage ||
            'The database table `edu_day_registrations` is pending migration. Please apply `supabase/migrations/20261016_edu_day_registrations.sql` in Supabase.'
        );
        setRegistrations([]);
        setTotalRecords(0);
        setTotalPages(1);
      } else {
        setConfigurationPending(false);
        setRegistrations(data.registrations || []);
        setSummary(
          data.summary || {
            total: 0,
            submitted: 0,
            verified: 0,
            rejected: 0,
            attended: 0
          }
        );
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
      setError(err.message || 'An unexpected error occurred while loading registrations.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    if (isAdmin) {
      fetchRegistrations();
    }
  }, [isAdmin, fetchRegistrations]);

  // Handle Copy Reference Number
  const handleCopyRef = (refNo: string) => {
    navigator.clipboard.writeText(refNo);
    setCopiedRef(refNo);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Secure File Viewer: Calls backend signed URL endpoint with multi-layer fallback
  const handleViewPrivateFile = async (
    registrationId: string,
    fileType: 'payment-proof' | 'applicant-photo',
    title: string
  ) => {
    try {
      setFilePreviewModalOpen(true);
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);
      setImageLoadError(false);
      setPreviewTitle(title);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required.');
      }

      let resolvedUrl: string | null = null;

      // 1. Primary: Call backend file access endpoint
      try {
        const res = await fetch(`/api/edu-day/admin/registrations/${registrationId}/files/${fileType}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data: EduDaySignedUrlResponse & { error?: string; viewUrl?: string; isDirectStream?: boolean } = await res.json();

        if (res.ok && data.success) {
          if (data.signedUrl && data.signedUrl.startsWith('http')) {
            resolvedUrl = data.signedUrl;
          } else if (data.viewUrl) {
            resolvedUrl = `${data.viewUrl}?token=${encodeURIComponent(token)}`;
          }
        }
      } catch (e) {
        console.warn('Backend signedUrl request failed, attempting direct Supabase resolution:', e);
      }

      // 2. Secondary fallback: Direct Supabase client signed URL using active admin session
      if (!resolvedUrl) {
        const targetReg = registrations.find((r) => r.id === registrationId) || selectedRegistration;
        const rawPath = fileType === 'payment-proof' ? targetReg?.payment_screenshot_url : targetReg?.applicant_photo_url;
        if (rawPath) {
          const cleanPath = rawPath.replace(/^edu-day-registration-files\//, '');
          const { data: suData, error: suErr } = await supabase.storage
            .from('edu-day-registration-files')
            .createSignedUrl(cleanPath, 3600);

          if (!suErr && suData?.signedUrl) {
            resolvedUrl = suData.signedUrl;
          }
        }
      }

      // 3. Tertiary fallback: Direct stream endpoint
      if (!resolvedUrl) {
        resolvedUrl = `/api/edu-day/admin/registrations/${registrationId}/files/${fileType}/view?token=${encodeURIComponent(token)}`;
      }

      setPreviewUrl(resolvedUrl);
    } catch (err: any) {
      console.error('Error fetching signed preview URL:', err);
      setPreviewError(err.message || 'Failed to load private document.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Status Change Handler
  const handleOpenStatusModal = (reg: EduDayRegistration) => {
    setUpdatingRegistration(reg);
    setNewStatus(reg.status);
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!updatingRegistration) return;

    try {
      setIsUpdatingStatus(true);
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token expired.');

      const response = await fetch(`/api/edu-day/admin/registrations/${updatingRegistration.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status.');
      }

      showToast(`Registration ${updatingRegistration.reference_no} status changed to ${STATUS_LABELS[newStatus]}.`);
      setStatusModalOpen(false);
      setUpdatingRegistration(null);

      // If details modal is currently open with this record, update it too
      if (selectedRegistration && selectedRegistration.id === updatingRegistration.id) {
        setSelectedRegistration({ ...selectedRegistration, status: newStatus });
      }

      fetchRegistrations();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Handlers
  const handleOpenDeleteModal = (reg: EduDayRegistration) => {
    setDeletingRegistration(reg);
    setDeleteConfirmText('');
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRegistration) return;

    if (deleteConfirmText.trim() !== deletingRegistration.reference_no.trim()) {
      setDeleteError(`Please type "${deletingRegistration.reference_no}" exactly to confirm.`);
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);

      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token expired.');

      const targetId = deletingRegistration.id;
      const targetRef = deletingRegistration.reference_no;

      const response = await fetch(`/api/edu-day/admin/registrations/${targetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (!response.ok) {
        // Fallback: If backend delete failed, try direct delete via Supabase client with active admin session
        console.warn('Backend delete returned non-ok, attempting direct client delete:', result.error);
        const { error: directErr } = await supabase
          .from('edu_day_registrations')
          .delete()
          .eq('id', targetId);

        if (directErr) {
          throw new Error(result.error || directErr.message || 'Failed to delete registration.');
        }
      } else {
        // Even if backend returned ok, run direct Supabase client delete as well to guarantee DB deletion
        await supabase
          .from('edu_day_registrations')
          .delete()
          .eq('id', targetId);
      }

      // Optimistically remove from state immediately
      setRegistrations((prev) => prev.filter((r) => r.id !== targetId));
      setTotalRecords((prev) => Math.max(0, prev - 1));

      showToast(result.message || `Registration ${targetRef} permanently deleted.`, 'success');

      setDeleteModalOpen(false);
      setDeletingRegistration(null);
      setDeleteConfirmText('');

      if (detailsModalOpen && selectedRegistration?.id === targetId) {
        setDetailsModalOpen(false);
        setSelectedRegistration(null);
      }

      fetchRegistrations();
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to delete registration.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format Date Helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white rounded-3xl shadow-xl border border-red-100">
          <ShieldAlert className="w-14 h-14 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 text-sm mb-6">
            You do not have administrative privileges to manage EDU DAY registrations.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-maroon text-white font-bold rounded-xl hover:bg-red-900 transition shadow-lg"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold animate-bounce-subtle ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-900 text-white rounded-2xl shadow-xl p-6 border-l-4 border-amber-500 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-amber-950 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Anniversary Special
            </span>
            <span className="text-xs text-amber-300 font-semibold">Darussalam Tharqiya Edu Village</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-amber-400" />
            EDU DAY — Registration Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Jazriyya One Day Workshop · 29 October 2026 · 9:00 AM – 5:00 PM · Fee ₹313
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/edu-day/register"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition border border-white/10"
          >
            <span>Public Form</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
          </Link>
          <button
            onClick={() => fetchRegistrations()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <AdminNavigation registrationCountBadge={summary.total} />

      {/* CONFIGURATION PENDING BANNER */}
      {configurationPending && (
        <div className="mb-8 p-6 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-600 rounded-xl mt-0.5">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Database Setup Pending Approval</h3>
                <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                  {configurationMessage}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-mono bg-white/80 px-3 py-1.5 rounded-lg border border-amber-200 text-gray-700 w-fit">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Migration File: supabase/migrations/20261016_edu_day_registrations.sql</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchRegistrations()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow whitespace-nowrap self-stretch md:self-auto text-center"
            >
              Check Again
            </button>
          </div>
        </div>
      )}

      {/* Registration Fee & Financial Overview Bar */}
      <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-amber-200/80 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow font-black text-xl flex-shrink-0">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
                EDU DAY Jazriyya Workshop Fee: <span className="text-amber-700">₹313</span> / Participant
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Official Fee
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Each applicant must submit screenshot proof of paying ₹313 to be verified and admitted.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-amber-200/60 pt-3 md:pt-0">
          <div className="bg-white/90 backdrop-blur px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Expected</span>
            <span className="text-sm font-extrabold text-gray-900">
              ₹{((summary.total || 0) * 313).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-xs">
            <span className="text-emerald-700 block text-[10px] uppercase font-bold">Verified Fees</span>
            <span className="text-sm font-extrabold text-emerald-800">
              ₹{(((summary.verified || 0) + (summary.attended || 0)) * 313).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {/* Total Card */}
        <button
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400'
              : 'bg-white hover:bg-blue-50/50 border-gray-200 text-gray-800'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>
              Total
            </span>
            <Users className={`w-4 h-4 ${statusFilter === 'all' ? 'text-blue-200' : 'text-blue-600'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black">
            {configurationPending ? '—' : summary.total}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${statusFilter === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>
            All Applicants
          </div>
        </button>

        {/* Awaiting Verification Card */}
        <button
          onClick={() => {
            setStatusFilter('submitted');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            statusFilter === 'submitted'
              ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400'
              : 'bg-white hover:bg-amber-50/50 border-gray-200 text-gray-800'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'submitted' ? 'text-amber-100' : 'text-amber-700'}`}>
              Awaiting
            </span>
            <Clock className={`w-4 h-4 ${statusFilter === 'submitted' ? 'text-amber-200' : 'text-amber-600'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 sm:text-inherit">
            {configurationPending ? '—' : summary.submitted}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${statusFilter === 'submitted' ? 'text-amber-100' : 'text-gray-500'}`}>
            Needs Verification
          </div>
        </button>

        {/* Verified Card */}
        <button
          onClick={() => {
            setStatusFilter('verified');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            statusFilter === 'verified'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
              : 'bg-white hover:bg-emerald-50/50 border-gray-200 text-gray-800'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'verified' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Verified
            </span>
            <CheckCircle2 className={`w-4 h-4 ${statusFilter === 'verified' ? 'text-emerald-200' : 'text-emerald-600'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900 sm:text-inherit">
            {configurationPending ? '—' : summary.verified}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${statusFilter === 'verified' ? 'text-emerald-100' : 'text-gray-500'}`}>
            Fee &amp; Details Approved
          </div>
        </button>

        {/* Rejected Card */}
        <button
          onClick={() => {
            setStatusFilter('rejected');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
            statusFilter === 'rejected'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
              : 'bg-white hover:bg-rose-50/50 border-gray-200 text-gray-800'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'rejected' ? 'text-rose-100' : 'text-rose-700'}`}>
              Rejected
            </span>
            <XCircle className={`w-4 h-4 ${statusFilter === 'rejected' ? 'text-rose-200' : 'text-rose-600'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-900 sm:text-inherit">
            {configurationPending ? '—' : summary.rejected}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${statusFilter === 'rejected' ? 'text-rose-100' : 'text-gray-500'}`}>
            Declined Submissions
          </div>
        </button>

        {/* Attended Card */}
        <button
          onClick={() => {
            setStatusFilter('attended');
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between col-span-2 sm:col-span-1 ${
            statusFilter === 'attended'
              ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400'
              : 'bg-white hover:bg-purple-50/50 border-gray-200 text-gray-800'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'attended' ? 'text-purple-100' : 'text-purple-700'}`}>
              Attended
            </span>
            <UserCheck className={`w-4 h-4 ${statusFilter === 'attended' ? 'text-purple-200' : 'text-purple-600'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900 sm:text-inherit">
            {configurationPending ? '—' : summary.attended}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${statusFilter === 'attended' ? 'text-purple-100' : 'text-gray-500'}`}>
            Present At Workshop
          </div>
        </button>
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, reference no, phone, workplace, or place..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Awaiting Verification</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="attended">Attended</option>
              </select>
            </div>

            {/* Sort Field */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="created_at">Date Submitted</option>
                <option value="full_name">Applicant Name</option>
                <option value="reference_no">Reference No</option>
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition"
              title={`Sorting: ${sortOrder === 'desc' ? 'Newest / Z-A' : 'Oldest / A-Z'}`}
            >
              {sortOrder.toUpperCase()}
            </button>

            {/* Page Limit */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchRegistrations()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* TABLE / CARD VIEW */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-500">Querying live registration records...</p>
          </div>
        ) : configurationPending ? (
          <div className="py-16 px-4 text-center">
            <div className="max-w-md mx-auto">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Configuration Pending</h3>
              <p className="text-sm text-gray-500 mb-4">
                The database table for EDU DAY registrations has not yet been applied to production. Once applied, live applicant records will appear here immediately.
              </p>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                Awaiting approval for 20261016_edu_day_registrations.sql
              </span>
            </div>
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="max-w-md mx-auto">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Registrations Found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'No registrations match your current filter criteria.'
                  : 'No registrations have been received yet.'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    <th className="py-3.5 px-4">Reference No</th>
                    <th className="py-3.5 px-4">Applicant Name</th>
                    <th className="py-3.5 px-4">Phone / WhatsApp</th>
                    <th className="py-3.5 px-4">Place &amp; Institute</th>
                    <th className="py-3.5 px-4">Fee Paid</th>
                    <th className="py-3.5 px-4">Registration Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50/60 transition">
                      {/* Reference No */}
                      <td className="py-4 px-4 font-mono text-xs font-bold text-gray-800">
                        <div className="flex items-center gap-1.5">
                          <span>{reg.reference_no}</span>
                          <button
                            onClick={() => handleCopyRef(reg.reference_no)}
                            title="Copy Reference"
                            className="text-gray-400 hover:text-maroon transition"
                          >
                            {copiedRef === reg.reference_no ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900">{reg.full_name}</div>
                      </td>

                      {/* Phone / WhatsApp */}
                      <td className="py-4 px-4 text-xs">
                        <div className="flex flex-col gap-1">
                          <a
                            href={`tel:${reg.phone_number}`}
                            className="flex items-center gap-1 text-gray-700 hover:text-maroon"
                          >
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{reg.phone_number}</span>
                          </a>
                          <a
                            href={`https://wa.me/${reg.whatsapp_number.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-500" />
                            <span>{reg.whatsapp_number}</span>
                          </a>
                        </div>
                      </td>

                      {/* Place & Institute */}
                      <td className="py-4 px-4 text-xs">
                        <div className="font-semibold text-gray-800">{reg.institute_workplace}</div>
                        <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{reg.place}</span>
                        </div>
                      </td>

                      {/* Fee Paid (₹313) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-gray-900 text-sm">₹313</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Paid
                          </span>
                        </div>
                        <button
                          onClick={() => handleViewPrivateFile(reg.id, 'payment-proof', `Fee Payment Proof (₹313) — ${reg.reference_no}`)}
                          className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Proof</span>
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(reg.created_at)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleOpenStatusModal(reg)}
                          title="Click to update status"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition hover:opacity-80 cursor-pointer ${
                            STATUS_BADGE_STYLES[reg.status]
                          }`}
                        >
                          {reg.status === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {reg.status === 'submitted' && <Clock className="w-3 h-3 text-amber-600" />}
                          {reg.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {reg.status === 'attended' && <UserCheck className="w-3 h-3 text-purple-600" />}
                          <span>{STATUS_LABELS[reg.status]}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRegistration(reg);
                              setDetailsModalOpen(true);
                            }}
                            title="View Complete Details"
                            className="p-1.5 rounded-lg text-gray-600 hover:text-maroon hover:bg-gray-100 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenDeleteModal(reg)}
                            title="Delete Registration Permanently"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {registrations.map((reg) => (
                <div key={reg.id} className="p-4 hover:bg-gray-50/50 transition">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <div className="font-mono text-xs font-bold text-gray-500">
                        {reg.reference_no}
                      </div>
                      <h4 className="font-bold text-base text-gray-900 mt-0.5">{reg.full_name}</h4>
                    </div>
                    <button
                      onClick={() => handleOpenStatusModal(reg)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        STATUS_BADGE_STYLES[reg.status]
                      }`}
                    >
                      {STATUS_LABELS[reg.status]}
                    </button>
                  </div>

                  {/* Fee Paid Badge */}
                  <div className="flex items-center justify-between bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200/70 my-2.5">
                    <div className="text-xs">
                      <span className="text-[10px] uppercase font-bold text-amber-800 block">Registration Fee</span>
                      <span className="font-extrabold text-gray-900 text-sm">₹313</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Paid (Proof Attached)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 my-3">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Institute</span>
                      <span className="font-semibold text-gray-800">{reg.institute_workplace}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Place</span>
                      <span className="font-semibold text-gray-800">{reg.place}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Phone</span>
                      <a href={`tel:${reg.phone_number}`} className="text-maroon font-semibold">
                        {reg.phone_number}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Submitted</span>
                      <span className="text-gray-500">{formatDate(reg.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewPrivateFile(reg.id, 'payment-proof', `Payment Proof: ${reg.reference_no}`)}
                        className="text-xs font-bold text-amber-700 hover:underline"
                      >
                        Payment Proof
                      </button>
                      {reg.applicant_photo_url && (
                        <button
                          onClick={() => handleViewPrivateFile(reg.id, 'applicant-photo', `Photo: ${reg.full_name}`)}
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          Photo
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRegistration(reg);
                          setDetailsModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(reg)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 bg-gray-50/80 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
              <div>
                Showing{' '}
                <span className="font-bold text-gray-900">
                  {totalRecords === 0 ? 0 : (page - 1) * limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-gray-900">
                  {Math.min(page * limit, totalRecords)}
                </span>{' '}
                of <span className="font-bold text-gray-900">{totalRecords}</span> registrations
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold hover:bg-gray-50 transition disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-bold px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold hover:bg-gray-50 transition disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ============================================================================== */}
      {/* MODAL 1: VIEW COMPLETE REGISTRATION DETAILS (PHASE 5) */}
      {/* ============================================================================== */}
      {detailsModalOpen && selectedRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gray-900 text-white flex justify-between items-start border-b border-gray-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {selectedRegistration.reference_no}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                      STATUS_BADGE_STYLES[selectedRegistration.status]
                    }`}
                  >
                    {STATUS_LABELS[selectedRegistration.status]}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{selectedRegistration.full_name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Registration Details · Jazriyya One Day Workshop
                </p>
              </div>

              <button
                onClick={() => setDetailsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Event Metadata Banner */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-950 flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <div className="font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    EDU DAY — ANNIVERSARY SPECIAL · JAZRIYYA WORKSHOP
                  </div>
                  <div className="mt-1 text-gray-700">
                    29 October 2026 · 9:00 AM – 5:00 PM · Darussalam Tharqiya Edu Village
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Organized by: IRTHIQA Quranic Academy &amp; AHSAS
                  </div>
                </div>
                <div className="sm:text-right font-bold text-amber-900">
                  <span className="block text-[10px] uppercase text-gray-500">Workshop Fee</span>
                  <span className="text-base font-black">₹313</span>
                </div>
              </div>

              {/* 12 Registration Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {/* 1. Reference No */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    1. Reference Number
                  </span>
                  <span className="font-mono font-bold text-gray-900">{selectedRegistration.reference_no}</span>
                </div>

                {/* 2. Full Name */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    2. Full Name
                  </span>
                  <span className="font-bold text-gray-900">{selectedRegistration.full_name}</span>
                </div>

                {/* 3. Place */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    3. Place
                  </span>
                  <span className="font-semibold text-gray-800">{selectedRegistration.place}</span>
                </div>

                {/* 4. Institute / Workplace */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    4. Institute of Study / Workplace
                  </span>
                  <span className="font-semibold text-gray-800">{selectedRegistration.institute_workplace}</span>
                </div>

                {/* 5. Phone Number */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    5. Phone Number
                  </span>
                  <a
                    href={`tel:${selectedRegistration.phone_number}`}
                    className="font-bold text-maroon hover:underline flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedRegistration.phone_number}</span>
                  </a>
                </div>

                {/* 6. WhatsApp Number */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    6. WhatsApp Number
                  </span>
                  <a
                    href={`https://wa.me/${selectedRegistration.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedRegistration.whatsapp_number}</span>
                  </a>
                </div>

                {/* 7. Tajweed Kithabs Studied (Full width) */}
                <div className="sm:col-span-2 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-maroon" />
                    <span>7. Tajweed Kithabs Studied</span>
                  </span>
                  <div className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200 text-xs font-medium leading-relaxed">
                    {selectedRegistration.tajweed_kithabs}
                  </div>
                </div>

                {/* 8. Fee Payment Screenshot (Private Secure Action) */}
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        8. Fee Payment Verification (₹313)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        ₹313
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-700 bg-white/90 rounded-lg p-2.5 border border-amber-200/60 mb-3 space-y-0.5 shadow-xs">
                      <div className="text-gray-400 text-[10px] uppercase font-bold">Official Beneficiary Account:</div>
                      <div className="font-bold text-gray-900 text-xs">HAFIZ MUHAMMADALI THARQAWI</div>
                      <div className="font-mono text-amber-800 text-[11px] font-semibold">alimuhammed0203@oksbi</div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleViewPrivateFile(
                        selectedRegistration.id,
                        'payment-proof',
                        `Fee Payment Screenshot (₹313) — ${selectedRegistration.reference_no}`
                      )
                    }
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Payment Screenshot (₹313)</span>
                  </button>
                </div>

                {/* 9. Applicant Photo (Private Secure Action) */}
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex flex-col justify-between">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-1">
                      9. Applicant Photo
                    </span>
                    <span className="text-xs text-gray-500 block mb-3">
                      {selectedRegistration.applicant_photo_url
                        ? 'Photo provided by applicant.'
                        : 'No applicant photo was uploaded (Optional).'}
                    </span>
                  </div>
                  {selectedRegistration.applicant_photo_url ? (
                    <button
                      onClick={() =>
                        handleViewPrivateFile(
                          selectedRegistration.id,
                          'applicant-photo',
                          `Applicant Photo — ${selectedRegistration.full_name}`
                        )
                      }
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Applicant Photo</span>
                    </button>
                  ) : (
                    <div className="py-2 text-center text-xs text-gray-400 font-semibold bg-gray-100 rounded-lg">
                      Photo Not Provided
                    </div>
                  )}
                </div>

                {/* 10. Registration Status */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                      10. Registration Status
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        STATUS_BADGE_STYLES[selectedRegistration.status]
                      }`}
                    >
                      {STATUS_LABELS[selectedRegistration.status]}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenStatusModal(selectedRegistration)}
                    className="text-xs font-bold text-maroon hover:underline"
                  >
                    Change Status
                  </button>
                </div>

                {/* 11 & 12. Submission & Update Timestamps */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    11 &amp; 12. Audit Timestamps
                  </span>
                  <div className="text-gray-700">
                    <span className="text-gray-400">Submitted:</span> {formatDate(selectedRegistration.created_at)}
                  </div>
                  <div className="text-gray-700 mt-1">
                    <span className="text-gray-400">Last Updated:</span> {formatDate(selectedRegistration.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  handleOpenDeleteModal(selectedRegistration);
                }}
                className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Registration</span>
              </button>

              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 2: SECURE PRIVATE FILE PREVIEW MODAL */}
      {/* ============================================================================== */}
      {filePreviewModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-gray-900 text-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gray-950 flex justify-between items-center border-b border-gray-800">
              <h4 className="text-sm font-bold truncate max-w-md">{previewTitle}</h4>
              <button
                onClick={() => setFilePreviewModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 flex items-center justify-center overflow-auto min-h-[300px]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Loading secure applicant image...</p>
                </div>
              ) : previewError ? (
                <div className="p-6 text-center max-w-md">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm text-rose-300 font-semibold mb-2">{previewError}</p>
                  <p className="text-xs text-gray-400">
                    If this error persists, ensure that the storage policy has been configured in Supabase SQL editor.
                  </p>
                </div>
              ) : previewUrl ? (
                <div className="flex flex-col items-center max-h-full w-full">
                  {!imageLoadError ? (
                    <img
                      src={previewUrl}
                      alt={previewTitle}
                      onError={() => setImageLoadError(true)}
                      className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-gray-800 bg-gray-950/50"
                    />
                  ) : (
                    <div className="p-8 text-center bg-gray-950/80 rounded-2xl border border-gray-800 max-w-md">
                      <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                      <h5 className="text-sm font-bold text-gray-200 mb-1">Image Preview Unavailable Inline</h5>
                      <p className="text-xs text-gray-400 mb-4">
                        The file was retrieved securely, but could not be rendered directly in this frame.
                      </p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open File Directly in New Tab</span>
                      </a>
                    </div>
                  )}
                  <span className="text-[11px] text-gray-400 mt-3 font-mono">
                    Authorized secure access link (valid for 1 hour)
                  </span>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-gray-950 border-t border-gray-800 flex justify-between items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in New Tab</span>
                    </a>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </>
                )}
              </div>
              <button
                onClick={() => setFilePreviewModalOpen(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 3: STATUS CHANGE MODAL (PHASE 6) */}
      {/* ============================================================================== */}
      {statusModalOpen && updatingRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 bg-gray-900 text-white">
              <h3 className="text-lg font-bold">Update Registration Status</h3>
              <p className="text-xs text-gray-400 mt-1">
                {updatingRegistration.full_name} · {updatingRegistration.reference_no}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Select the new verification status. Status changes are audited and persisted directly to Supabase.
              </p>

              <div className="space-y-2">
                {(['submitted', 'verified', 'rejected', 'attended'] as EduDayRegistrationStatus[]).map((statusOption) => (
                  <label
                    key={statusOption}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                      newStatus === statusOption
                        ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="reg_status"
                        checked={newStatus === statusOption}
                        onChange={() => setNewStatus(statusOption)}
                        className="w-4 h-4 text-maroon focus:ring-maroon cursor-pointer"
                      />
                      <span className="text-sm font-bold text-gray-800">
                        {STATUS_LABELS[statusOption]}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        STATUS_BADGE_STYLES[statusOption]
                      }`}
                    >
                      {statusOption}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center gap-2">
              <button
                onClick={() => setStatusModalOpen(false)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatus}
                disabled={isUpdatingStatus}
                className="px-5 py-2 bg-maroon hover:bg-maroon-dark text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdatingStatus ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* MODAL 4: PERMANENT DELETION MODAL WITH TWO-STEP CONFIRMATION (PHASE 7) */}
      {/* ============================================================================== */}
      {deleteModalOpen && deletingRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-rose-200 overflow-hidden">
            <div className="p-6 bg-rose-900 text-white">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-200">
                  Critical Operation
                </span>
              </div>
              <h3 className="text-xl font-black">Delete Registration Permanently</h3>
              <p className="text-xs text-rose-200/80 mt-1">
                This action is irreversible and permanently deletes both the applicant record and all private storage documents.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                <div>
                  <span className="font-bold">Applicant Name:</span> {deletingRegistration.full_name}
                </div>
                <div>
                  <span className="font-bold">Reference Number:</span>{' '}
                  <span className="font-mono font-bold">{deletingRegistration.reference_no}</span>
                </div>
                <div>
                  <span className="font-bold">Registered On:</span> {formatDate(deletingRegistration.created_at)}
                </div>
                <div className="pt-2 text-rose-700 font-medium">
                  Associated fee payment proof and applicant photo in private storage bucket{' '}
                  <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">edu-day-registration-files</code> will
                  also be permanently expunged.
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-100 text-red-800 text-xs font-bold rounded-xl">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Type reference number to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deletingRegistration.reference_no}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={
                  isDeleting ||
                  deleteConfirmText.trim() !== deletingRegistration.reference_no.trim()
                }
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow disabled:opacity-40 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting Permanently...' : 'Confirm Permanent Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEduDayRegistrationsPage;
