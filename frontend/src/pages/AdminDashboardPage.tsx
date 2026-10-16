import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import { AdminNavigation } from '../components/layout/AdminNavigation';
import { Unit, Report, UnitMessage, AdminUser } from '../../../shared/types';
import {
  ShieldAlert,
  Award,
  RefreshCw,
  X,
  Send,
  MessageSquare,
  Search,
  Bell,
  Settings,
  DollarSign,
  Building,
  ExternalLink
} from 'lucide-react';

const MASTER_ADMINS = ['ahsaslab@gmail.com', 'mmmed8833@gmail.com'];

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();

  // Auth & Admin check
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean | null>(null);

  // 1. Pending Reports
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportPoints, setReportPoints] = useState<Record<string, number>>({});
  const [reportGrades, setReportGrades] = useState<Record<string, string>>({});

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 2. WhatsApp-Style Support Chat
  const [allChatMessages, setAllChatMessages] = useState<UnitMessage[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeChatUnitId, setActiveChatUnitId] = useState<string | null>(null);
  const [activeChatUnitName, setActiveChatUnitName] = useState<string>('');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // 3. Broadcast Notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifDesc, setNotifDesc] = useState('');
  const [notifFile, setNotifFile] = useState<File | null>(null);
  const [notifUrl, setNotifUrl] = useState('');
  const [postingNotif, setPostingNotif] = useState(false);
  const [notifMessage, setNotifMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 4. Admin Users Management
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminActionStatus, setAdminActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 5. Fund Collection Management
  const [fundUnits, setFundUnits] = useState<Unit[]>([]);
  const [selectedFundUnitId, setSelectedFundUnitId] = useState<string>('');
  const [fundAddAmount, setFundAddAmount] = useState<string>('');
  const [fundEditTotal, setFundEditTotal] = useState<string>('');
  const [fundUpdating, setFundUpdating] = useState(false);

  // 6. Registered Units & Manage Unit Modal
  const [registeredUnits, setRegisteredUnits] = useState<Unit[]>([]);
  const [selectedUnitForManage, setSelectedUnitForManage] = useState<Unit | null>(null);
  const [manageUnitModalOpen, setManageUnitModalOpen] = useState(false);
  const [manageModalTab, setManageModalTab] = useState<'reports' | 'settings'>('reports');
  const [manageUnitReports, setManageUnitReports] = useState<Report[]>([]);
  const [loadingUnitReports, setLoadingUnitReports] = useState(false);
  const [manageUnitGrade, setManageUnitGrade] = useState('');

  // Unit settings form inside manage modal
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitClassName, setEditUnitClassName] = useState('');
  const [editUnitEmail, setEditUnitEmail] = useState('');
  const [savingUnitProfile, setSavingUnitProfile] = useState(false);

  // 1. Authorization Verification
  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user || !user.email) {
        setIsAdminAuthorized(false);
        return;
      }

      const email = user.email.toLowerCase();
      if (MASTER_ADMINS.includes(email)) {
        setIsAdminAuthorized(true);
        return;
      }

      // Check admin_users table
      const { data } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (data) {
        setIsAdminAuthorized(true);
      } else {
        setIsAdminAuthorized(false);
      }
    };

    verifyAdmin();
  }, [user]);

  // Load all admin data once authorized
  useEffect(() => {
    if (!isAdminAuthorized) return;

    fetchPendingReports();
    fetchSupportMessages();
    fetchAdminUsers();
    fetchRegisteredUnits();
    fetchFundUnits();

    // Setup chat realtime listener
    const chatChannel = supabase
      .channel('admin_support_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'unit_messages'
        },
        () => {
          fetchSupportMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [isAdminAuthorized]);

  // Scroll chat window to bottom
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allChatMessages, activeChatUnitId]);

  // --- Fetch Methods ---
  const fetchPendingReports = async () => {
    try {
      setLoadingReports(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*, units(name, grade)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      setPendingReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchSupportMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('unit_messages')
        .select('*, units(name)')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAllChatMessages(data || []);
    } catch (err) {
      console.error('Error fetching support messages:', err);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    }
  };

  const fetchRegisteredUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegisteredUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchFundUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('class_name', { ascending: true });

      if (error) throw error;
      setFundUnits(data || []);
    } catch (err) {
      console.error('Error fetching fund units:', err);
    }
  };

  // --- Report Approval & Rejection ---
  const handleApproveReport = async (reportId: string, unitId: string) => {
    const points = reportPoints[reportId];
    const grade = reportGrades[reportId];

    if (points === undefined || isNaN(points) || points < 0) {
      alert('Please enter a valid number of points (0-100).');
      return;
    }

    try {
      // 1. Update report
      const { error: repErr } = await supabase
        .from('reports')
        .update({
          status: 'approved',
          points_awarded: points,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (repErr) throw repErr;

      // 2. Update unit grade if selected
      if (grade) {
        await supabase.from('units').update({ grade }).eq('id', unitId);
      }

      setPendingReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      alert('Failed to approve report: ' + err.message);
    }
  };

  const handleOpenRejectModal = (reportId: string) => {
    setRejectingReportId(reportId);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleSubmitRejection = async () => {
    if (!rejectingReportId || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          description: `[REJECTED: ${rejectionReason.trim()}]`,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', rejectingReportId);

      if (error) throw error;

      setPendingReports((prev) => prev.filter((r) => r.id !== rejectingReportId));
      setRejectModalOpen(false);
      setRejectingReportId(null);
      setRejectionReason('');
    } catch (err: any) {
      alert('Failed to reject report: ' + err.message);
    }
  };

  // --- WhatsApp-style Chat Methods ---
  // Group messages into unit threads
  const chatThreadsMap: Record<string, { unitId: string; unitName: string; messages: UnitMessage[]; latest: UnitMessage }> = {};
  allChatMessages.forEach((msg) => {
    const uId = msg.unit_id;
    const uName = (msg as any).units?.name || 'Unit #' + uId.substring(0, 5);
    if (!chatThreadsMap[uId]) {
      chatThreadsMap[uId] = {
        unitId: uId,
        unitName: uName,
        messages: [],
        latest: msg
      };
    }
    chatThreadsMap[uId].messages.push(msg);
    chatThreadsMap[uId].latest = msg;
  });

  const chatThreadsList = Object.values(chatThreadsMap).sort((a, b) => {
    return new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime();
  });

  const filteredChatThreads = chatThreadsList.filter((t) =>
    t.unitName.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const activeMessages = activeChatUnitId && chatThreadsMap[activeChatUnitId]
    ? chatThreadsMap[activeChatUnitId].messages
    : [];

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeChatUnitId) return;

    const reply = adminReplyText.trim();
    setSendingReply(true);

    try {
      const { error } = await supabase.from('unit_messages').insert([
        {
          unit_id: activeChatUnitId,
          message: reply,
          sender: 'admin'
        }
      ]);

      if (error) throw error;
      setAdminReplyText('');
      await fetchSupportMessages();
    } catch (err: any) {
      alert('Failed to send reply: ' + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // --- Broadcast Notification ---
  const handlePostNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifDesc.trim()) return;

    setPostingNotif(true);
    setNotifMessage(null);

    try {
      let fileUrl = notifUrl.trim();

      if (notifFile) {
        const fileExt = notifFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `notifications/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('activity-images')
          .upload(filePath, notifFile);

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('activity-images')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
      }

      const { error: notifErr } = await supabase.from('notifications').insert([
        {
          title: notifTitle.trim(),
          description: notifDesc.trim(),
          file_url: fileUrl || null
        }
      ]);

      if (notifErr) throw notifErr;

      setNotifMessage({ type: 'success', message: 'Circular broadcasted successfully!' });
      setNotifTitle('');
      setNotifDesc('');
      setNotifFile(null);
      setNotifUrl('');
    } catch (err: any) {
      setNotifMessage({ type: 'error', message: err.message || 'Failed to post circular.' });
    } finally {
      setPostingNotif(false);
    }
  };

  // --- Global Settings Toggles ---
  const handleToggleSetting = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    try {
      const { data: updateData, error: updateErr } = await supabase
        .from('global_settings')
        .update({ value: newValue ? 'true' : 'false' })
        .eq('key', key)
        .select();

      if (updateErr) throw updateErr;

      if (!updateData || updateData.length === 0) {
        await supabase
          .from('global_settings')
          .insert([{ key, value: newValue ? 'true' : 'false' }]);
      }

      await refreshSettings();
    } catch (err: any) {
      alert('Failed to update setting: ' + err.message);
    }
  };

  // --- Admin Users Management ---
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminPassword) return;

    if (newAdminPassword.length < 6) {
      setAdminActionStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setAddingAdmin(true);
    setAdminActionStatus(null);

    const SUPABASE_URL = 'https://tcxmvujspjrrxinzpiqq.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_rFl-zfQXBUuqKhWeEtXuSA_9x1Kg8kp';

    try {
      // Create user in Supabase Auth via REST signup
      const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email: newAdminEmail.trim(), password: newAdminPassword })
      });

      const signUpData = await signUpRes.json();

      if (!signUpRes.ok) {
        if (
          !signUpData.msg?.includes('already registered') &&
          !signUpData.error_description?.includes('already registered')
        ) {
          throw new Error(signUpData.msg || signUpData.error_description || 'Failed to create auth user.');
        }
      }

      // Add to admin_users table
      const { error: insErr } = await supabase
        .from('admin_users')
        .insert([{ email: newAdminEmail.trim().toLowerCase() }]);

      if (insErr) {
        if (insErr.code === '23505') throw new Error('This email is already an admin.');
        throw insErr;
      }

      setAdminActionStatus({
        type: 'success',
        message: `✅ Admin account created for ${newAdminEmail}.`
      });
      setNewAdminEmail('');
      setNewAdminPassword('');
      await fetchAdminUsers();
    } catch (err: any) {
      setAdminActionStatus({ type: 'error', message: err.message || 'Failed to add admin.' });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    if (MASTER_ADMINS.includes(email)) return;
    if (!window.confirm(`Are you sure you want to remove admin privileges for ${email}?`)) return;

    try {
      const { error } = await supabase.from('admin_users').delete().eq('email', email);
      if (error) throw error;
      await fetchAdminUsers();
    } catch (err: any) {
      alert('Failed to remove admin: ' + err.message);
    }
  };

  // --- Fund Collection Methods ---
  const selectedFundUnit = fundUnits.find((u) => u.id === selectedFundUnitId);

  const handleAddFundAmount = async () => {
    if (!selectedFundUnitId) {
      alert('Please select a unit first.');
      return;
    }

    const amountToAdd = parseFloat(fundAddAmount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    setFundUpdating(true);
    try {
      const currentAmount = selectedFundUnit?.fund_amount || 0;
      const newTotal = currentAmount + amountToAdd;

      const { error } = await supabase
        .from('units')
        .update({ fund_amount: newTotal })
        .eq('id', selectedFundUnitId);

      if (error) throw error;

      setFundAddAmount('');
      await fetchFundUnits();
    } catch (err: any) {
      alert('Failed to add fund: ' + err.message);
    } finally {
      setFundUpdating(false);
    }
  };

  const handleEditFundTotal = async () => {
    if (!selectedFundUnitId) {
      alert('Please select a unit first.');
      return;
    }

    const newTotal = parseFloat(fundEditTotal);
    if (isNaN(newTotal) || newTotal < 0) {
      alert('Please enter a valid total amount.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to change the total fund to ₹${newTotal.toLocaleString('en-IN')}? This will override the existing total.`
      )
    ) {
      return;
    }

    setFundUpdating(true);
    try {
      const { error } = await supabase
        .from('units')
        .update({ fund_amount: newTotal })
        .eq('id', selectedFundUnitId);

      if (error) throw error;

      setFundEditTotal('');
      await fetchFundUnits();
    } catch (err: any) {
      alert('Failed to update fund total: ' + err.message);
    } finally {
      setFundUpdating(false);
    }
  };

  // --- Registered Units & Manage Unit Modal ---
  const handleOpenManageUnit = async (unit: Unit) => {
    setSelectedUnitForManage(unit);
    setEditUnitName(unit.name);
    setEditUnitClassName(unit.class_name || '');
    setEditUnitEmail(unit.email || '');
    setManageUnitGrade(unit.grade || 'C');
    setManageModalTab('reports');
    setManageUnitModalOpen(true);

    // Fetch reports for this unit
    try {
      setLoadingUnitReports(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('unit_id', unit.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setManageUnitReports(data || []);
    } catch (err) {
      console.error('Error fetching unit reports:', err);
    } finally {
      setLoadingUnitReports(false);
    }
  };

  const handleUpdateUnitGradeDirectly = async () => {
    if (!selectedUnitForManage) return;
    try {
      const { error } = await supabase
        .from('units')
        .update({ grade: manageUnitGrade })
        .eq('id', selectedUnitForManage.id);

      if (error) throw error;
      alert('✅ Unit overall performance grade updated successfully.');
      await fetchRegisteredUnits();
    } catch (err: any) {
      alert('Failed to update grade: ' + err.message);
    }
  };

  const handleUpdateReportFromManager = async (
    reportId: string,
    unitId: string,
    newPoints: number,
    newStatus: string,
    oldPoints: number,
    oldStatus: string
  ) => {
    if (isNaN(newPoints) || newPoints < 0) {
      alert('Please enter a valid points number.');
      return;
    }

    try {
      const { error: repErr } = await supabase
        .from('reports')
        .update({
          points_awarded: newPoints,
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (repErr) throw repErr;

      // Update unit total_score difference if both old & new were approved
      if (oldStatus === 'approved' && newStatus === 'approved' && newPoints !== oldPoints) {
        const diff = newPoints - oldPoints;
        const { data: uData } = await supabase
          .from('units')
          .select('total_score')
          .eq('id', unitId)
          .single();

        const currentScore = uData?.total_score || 0;
        await supabase
          .from('units')
          .update({ total_score: currentScore + diff })
          .eq('id', unitId);
      }

      alert('✅ Report updated.');
      await fetchPendingReports();
      // Refresh modal reports
      if (selectedUnitForManage) handleOpenManageUnit(selectedUnitForManage);
    } catch (err: any) {
      alert('Failed to update report: ' + err.message);
    }
  };

  const handleSaveUnitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitForManage) return;

    setSavingUnitProfile(true);
    try {
      const updateData: Partial<Unit> = {
        name: editUnitName.trim(),
        class_name: editUnitClassName.trim()
      };
      if (editUnitEmail.trim()) updateData.email = editUnitEmail.trim();

      const { error } = await supabase
        .from('units')
        .update(updateData)
        .eq('id', selectedUnitForManage.id);

      if (error) throw error;

      alert('✅ Unit details updated successfully.');
      setManageUnitModalOpen(false);
      await fetchRegisteredUnits();
    } catch (err: any) {
      alert('Failed to update unit profile: ' + err.message);
    } finally {
      setSavingUnitProfile(false);
    }
  };

  const handleResetUnitStudents = async (unitId: string, unitName: string) => {
    if (
      !window.confirm(
        `⚠️ Are you sure you want to delete ALL students for ${unitName}?\nThis is typically done at the end of an academic year.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from('students').delete().eq('unit_id', unitId);
      if (error) throw error;
      alert(`✅ All students for ${unitName} have been cleared.`);
    } catch (err: any) {
      alert('Failed to reset students: ' + err.message);
    }
  };

  const handleDeleteUnitCascade = async (unitId: string, unitName: string) => {
    if (
      !window.confirm(
        `⚠️ WARNING: Are you sure you want to delete "${unitName}"?\n\nThis will permanently delete all members, students, reports, and messages belonging to this unit.\n\nTHIS ACTION CANNOT BE UNDONE.`
      )
    ) {
      return;
    }

    try {
      // 1. Delete reports
      await supabase.from('reports').delete().eq('unit_id', unitId);
      // 2. Delete students
      await supabase.from('students').delete().eq('unit_id', unitId);
      // 3. Delete messages
      await supabase.from('unit_messages').delete().eq('unit_id', unitId);
      // 4. Delete members
      await supabase.from('members').delete().eq('unit_id', unitId);
      // 5. Delete notifications
      await supabase.from('notifications').delete().eq('unit_id', unitId);
      // 6. Delete unit
      const { error } = await supabase.from('units').delete().eq('id', unitId);
      if (error) throw error;

      alert(`✅ Unit "${unitName}" and all related records deleted.`);
      await fetchRegisteredUnits();
      await fetchPendingReports();
      await fetchSupportMessages();
    } catch (err: any) {
      alert('Failed to delete unit: ' + err.message);
    }
  };

  const handleBulkResetPortal = async () => {
    if (
      !window.confirm(
        `🚨 CRITICAL ACTION: Are you sure you want to clear ALL students and reports from the entire portal?\n\nThis will reset the leaderboard for a new academic year. This cannot be undone.`
      )
    ) {
      return;
    }

    const doubleConfirm = window.prompt("Please type 'RESET' to confirm this action:");
    if (doubleConfirm !== 'RESET') return;

    try {
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      alert('✅ Portal has been reset for the new academic year.');
      await fetchPendingReports();
    } catch (err: any) {
      alert('Failed to reset portal: ' + err.message);
    }
  };

  if (isAdminAuthorized === null) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-maroon/20 border-t-maroon rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Checking Administrator Privileges...</p>
        </div>
      </div>
    );
  }

  if (isAdminAuthorized === false) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white rounded-3xl shadow-xl border border-red-100">
          <ShieldAlert className="w-14 h-14 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 text-sm mb-6">
            You do not have administrative privileges to access the AHSAS Command Center.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-maroon text-white font-bold rounded-xl hover:bg-red-900 transition shadow-lg"
          >
            Go to Unit Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Welcome Banner */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-900 text-white rounded-2xl shadow-xl p-6 border-l-4 border-maroon gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-maroon" />
            Admin Command Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Review activity submissions, assign scores, coordinate live support, and configure system rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/leaderboard"
            className="px-4 py-2 bg-maroon hover:bg-red-900 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            View Leaderboard
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-900/60 text-red-200 border border-red-700">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Master Admin Session
          </span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <AdminNavigation />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right / Main 2 Columns: Pending Reports, Chat, Notifications */}
        <div className="lg:col-span-2 space-y-6 lg:order-2">
          {/* Section 1: Pending Activity Reports */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-maroon" />
                Pending Activity Reports ({pendingReports.length})
              </h3>
              <button
                onClick={fetchPendingReports}
                className="text-xs text-gray-500 hover:text-maroon transition flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-[550px] overflow-y-auto bg-gray-50/50">
              {loadingReports ? (
                <div className="p-8 text-center text-xs text-gray-400">Loading reports...</div>
              ) : pendingReports.length > 0 ? (
                pendingReports.map((report) => (
                  <div key={report.id} className="p-6 bg-white hover:bg-gray-50 transition">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-800">
                            {(report as any).units?.name || 'Unit'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(report.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-maroon">{report.title}</h4>
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                          {report.description}
                        </p>

                        {report.file_url && (
                          <div className="mt-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200 inline-block">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                              Evidence Attachment
                            </span>
                            <a
                              href={report.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open Evidence File
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Points & Grade inputs */}
                      <div className="flex flex-col items-end gap-3 min-w-[200px] border-l border-gray-100 pl-4 w-full md:w-auto">
                        <div className="w-full flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                              Points
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0-100"
                              value={reportPoints[report.id] ?? ''}
                              onChange={(e) =>
                                setReportPoints({
                                  ...reportPoints,
                                  [report.id]: parseInt(e.target.value) || 0
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                              Grade
                            </label>
                            <select
                              value={reportGrades[report.id] ?? ''}
                              onChange={(e) =>
                                setReportGrades({
                                  ...reportGrades,
                                  [report.id]: e.target.value
                                })
                              }
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-green-500 bg-white"
                            >
                              <option value="">N/A</option>
                              <option value="A+">A+</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                              <option value="E">E</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex w-full gap-2">
                          <button
                            onClick={() => handleApproveReport(report.id, report.unit_id)}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            ✓ APPROVE
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(report.id)}
                            className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition"
                          >
                            ✗ REJECT
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">All Caught Up!</p>
                  <p className="text-xs text-gray-400 mt-0.5">There are no pending reports to review.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: WhatsApp-style Unit Support Messages */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[480px] max-h-[550px]">
            {/* Left Sidebar: Threads */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 bg-white flex flex-col">
              <div className="bg-maroon text-white p-3.5 flex justify-between items-center font-bold text-sm">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Chats
                </span>
                <button
                  onClick={fetchSupportMessages}
                  className="text-white/80 hover:text-white p-1 rounded transition"
                  title="Refresh chats"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search */}
              <div className="p-2.5 bg-gray-50 border-b border-gray-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search units..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-maroon"
                  />
                </div>
              </div>

              {/* Thread List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {filteredChatThreads.length > 0 ? (
                  filteredChatThreads.map((thread) => {
                    const isActive = thread.unitId === activeChatUnitId;
                    const latest = thread.latest;
                    const timeStr = new Date(latest.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={thread.unitId}
                        onClick={() => {
                          setActiveChatUnitId(thread.unitId);
                          setActiveChatUnitName(thread.unitName);
                        }}
                        className={`p-3 cursor-pointer hover:bg-gray-50 transition ${
                          isActive ? 'bg-maroon/5 border-l-4 border-maroon' : ''
                        }`}
                      >
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {thread.unitName}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                            {timeStr}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {latest.sender === 'admin' && (
                            <span className="text-maroon font-semibold mr-1">You:</span>
                          )}
                          {latest.message}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400 italic">No conversations.</div>
                )}
              </div>
            </div>

            {/* Right Pane: Active Thread */}
            <div className="flex-1 flex flex-col bg-gray-50">
              {activeChatUnitId ? (
                <>
                  {/* Chat Active Header */}
                  <div className="bg-white p-3 border-b border-gray-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-maroon/10 text-maroon font-bold flex items-center justify-center text-xs">
                        {activeChatUnitName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 leading-tight">
                          {activeChatUnitName}
                        </h4>
                        <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          Connected
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages List */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                    {activeMessages.map((msg) => {
                      const isAdmin = msg.sender === 'admin';
                      const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      if (isAdmin) {
                        return (
                          <div key={msg.id} className="flex flex-col items-end max-w-[80%] self-end">
                            <div className="bg-gradient-to-r from-maroon to-red-800 text-white rounded-2xl rounded-tr-none px-4 py-2 shadow-sm text-xs">
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                              <span className="block text-[9px] text-red-200 text-right mt-1">
                                {timeStr}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={msg.id} className="flex flex-col items-start max-w-[80%] self-start">
                            <div className="bg-white text-gray-800 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm border border-gray-200 text-xs">
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                              <span className="block text-[9px] text-gray-400 text-right mt-1">
                                {timeStr}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Reply Input */}
                  <form onSubmit={handleSendAdminReply} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                    <input
                      type="text"
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-grow rounded-full border border-gray-200 px-4 py-2 text-xs focus:outline-none focus:border-maroon"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !adminReplyText.trim()}
                      className="bg-maroon hover:bg-red-900 text-white p-2 rounded-full shadow-sm transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
                  <h4 className="font-bold text-gray-700 text-sm">Select a Conversation</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[260px]">
                    Choose a unit from the left panel to review message history and reply.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Broadcast Notification (Circular) */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-maroon text-white p-4 font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-300" />
              <span>Broadcast Official Notification / Circular</span>
            </div>
            <div className="p-6">
              {notifMessage && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs font-bold ${
                    notifMessage.type === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {notifMessage.message}
                </div>
              )}

              <form onSubmit={handlePostNotification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Circular Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Annual Student Conference Guidelines 2026"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-1 focus:ring-maroon focus:border-maroon"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Description / Content *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={notifDesc}
                    onChange={(e) => setNotifDesc(e.target.value)}
                    placeholder="Full instructions and notices..."
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-1 focus:ring-maroon focus:border-maroon"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Upload Document (PDF/Poster)
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setNotifFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-maroon file:text-white border border-gray-300 rounded-xl p-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Or Paste Document URL
                    </label>
                    <input
                      type="url"
                      value={notifUrl}
                      onChange={(e) => setNotifUrl(e.target.value)}
                      placeholder="https://example.com/circular.pdf"
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-1 focus:ring-maroon focus:border-maroon"
                    />
                  </div>
                </div>

                <div className="text-right pt-2">
                  <button
                    type="submit"
                    disabled={postingNotif}
                    className="px-6 py-2.5 bg-maroon text-white font-bold rounded-xl text-sm hover:bg-red-900 transition shadow-md disabled:opacity-50"
                  >
                    {postingNotif ? 'Broadcasting...' : 'Post Circular'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Left / Secondary 1 Column: System Control, Admin Mgmt, Fund, Registered Units */}
        <div className="lg:col-span-1 space-y-6 lg:order-1">
          {/* Section 4: System Control & Global Toggles */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-900 text-white p-4 font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-300" />
              <span>System Control &amp; Global Rules</span>
            </div>

            <div className="divide-y divide-gray-100">
              {/* Toggle 1: Unit Profile Editing */}
              <div className="p-4 flex items-center justify-between bg-gray-50/50">
                <div>
                  <span className="block text-xs font-bold text-gray-900">
                    Enable Unit Profile Editing
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Allow units to edit details &amp; members
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_unit_edit}
                  onChange={() => handleToggleSetting('allow_unit_edit', settings.allow_unit_edit)}
                  className="w-5 h-5 text-maroon rounded focus:ring-maroon cursor-pointer"
                />
              </div>

              {/* Toggle 2: Show Programs Page */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-gray-900">Show Programs Page</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Toggle visibility in navigation bar
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.show_programs_page}
                  onChange={() =>
                    handleToggleSetting('show_programs_page', settings.show_programs_page)
                  }
                  className="w-5 h-5 text-maroon rounded focus:ring-maroon cursor-pointer"
                />
              </div>

              {/* Toggle 3: Show Membership Page */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-gray-900">
                    Show Membership Directory
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Public student roster link in navbar
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.show_membership_page}
                  onChange={() =>
                    handleToggleSetting('show_membership_page', settings.show_membership_page)
                  }
                  className="w-5 h-5 text-maroon rounded focus:ring-maroon cursor-pointer"
                />
              </div>

              {/* Toggle 4: Student Registration */}
              <div className="p-4 flex items-center justify-between bg-gray-50/50">
                <div>
                  <span className="block text-xs font-bold text-gray-900">
                    Enable Student Registration
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Allows class units to enroll students
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_student_registration}
                  onChange={() =>
                    handleToggleSetting(
                      'allow_student_registration',
                      settings.allow_student_registration
                    )
                  }
                  className="w-5 h-5 text-maroon rounded focus:ring-maroon cursor-pointer"
                />
              </div>

              {/* Toggle 5: Show Fund Collection */}
              <div className="p-4 flex items-center justify-between bg-yellow-50/50">
                <div>
                  <span className="block text-xs font-bold text-gray-900">
                    💰 Show Fund Collection
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    Enable Fund section on homepage &amp; nav
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.show_fund_collection}
                  onChange={() =>
                    handleToggleSetting('show_fund_collection', settings.show_fund_collection)
                  }
                  className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Add Admin Form */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Create Admin Account
              </span>
              <form onSubmit={handleAddAdmin} className="space-y-2">
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="New Admin Email"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-maroon"
                />
                <div className="flex gap-2">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-maroon"
                  />
                  <button
                    type="submit"
                    disabled={addingAdmin}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {addingAdmin ? '...' : 'Add Admin'}
                  </button>
                </div>
              </form>
              {adminActionStatus && (
                <p
                  className={`text-[10px] mt-1 font-bold ${
                    adminActionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {adminActionStatus.message}
                </p>
              )}
            </div>

            {/* Admin Users List */}
            <div className="divide-y divide-gray-100 max-h-[180px] overflow-y-auto">
              {adminUsers.map((adm) => {
                const isMaster = MASTER_ADMINS.includes(adm.email);
                return (
                  <div key={adm.id} className="p-2.5 flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800 truncate pr-2">{adm.email}</span>
                    {isMaster ? (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold">
                        Master
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteAdmin(adm.email)}
                        className="text-[10px] text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Fund Collection Management */}
          {settings.show_fund_collection && (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-yellow-200 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white p-4 font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-200" /> Fund Collection Management
                </span>
              </div>
              <div className="p-5 space-y-4">
                {/* Custom searchable unit select */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Select Target Unit
                  </label>
                  <select
                    value={selectedFundUnitId}
                    onChange={(e) => setSelectedFundUnitId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-300 focus:ring-1 focus:ring-yellow-500 bg-gray-50"
                  >
                    <option value="">Choose a unit to manage...</option>
                    {fundUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.class_name ? `${u.class_name} (${u.name})` : u.name} — ₹
                        {(u.fund_amount || 0).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Unit Total Display */}
                <div className="bg-yellow-50/80 border border-yellow-200 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] font-bold text-yellow-800 uppercase">
                      Current Total
                    </span>
                    <span className="text-2xl font-black text-yellow-700 mt-0.5 block">
                      ₹{(selectedFundUnit?.fund_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 block truncate max-w-[120px]">
                      {selectedFundUnit?.name || 'No Unit'}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      {selectedFundUnit?.class_name || '—'}
                    </span>
                  </div>
                </div>

                {/* Add / Edit Actions */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={fundAddAmount}
                      onChange={(e) => setFundAddAmount(e.target.value)}
                      placeholder="Amount to add"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-1 focus:ring-yellow-500"
                    />
                    <button
                      onClick={handleAddFundAmount}
                      disabled={fundUpdating}
                      className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-xl transition shadow-sm whitespace-nowrap disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={fundEditTotal}
                      onChange={(e) => setFundEditTotal(e.target.value)}
                      placeholder="New total override"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-1 focus:ring-yellow-500"
                    />
                    <button
                      onClick={handleEditFundTotal}
                      disabled={fundUpdating}
                      className="px-3 py-2 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm whitespace-nowrap disabled:opacity-50"
                    >
                      Override
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Registered Units Management */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-900 text-white p-4 font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building className="w-5 h-5 text-gray-300" /> Registered Units (
                {registeredUnits.length})
              </span>
            </div>

            <div className="p-3 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <span className="text-[10px] font-bold text-red-800 uppercase">Year-End Reset</span>
              <button
                onClick={handleBulkResetPortal}
                className="text-[10px] bg-white border border-red-300 text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition font-bold"
              >
                Bulk Reset Portal
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
              {registeredUnits.map((unit) => (
                <div
                  key={unit.id}
                  onClick={() => handleOpenManageUnit(unit)}
                  className="p-3.5 flex justify-between items-center hover:bg-gray-50 transition cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-maroon transition truncate">
                        {unit.name}
                      </p>
                      <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold shrink-0">
                        {unit.class_name || 'N/A'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Grade: <span className="font-bold text-maroon">{unit.grade || '—'}</span> •
                      Score: {unit.total_score || 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDeleteUnitCascade(unit.id, unit.name)}
                      className="text-[10px] text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded font-bold transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Report Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Activity Report</h3>
            <p className="text-xs text-gray-500 mb-4">
              Please state why this report is being rejected so the unit can correct and re-submit.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Inadequate photographic evidence or missing date verification..."
              className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:ring-1 focus:ring-red-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRejection}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Unit Modal (Reports, Grades & Settings) */}
      {manageUnitModalOpen && selectedUnitForManage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-maroon p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black">
                  Manage Unit: {selectedUnitForManage.class_name || selectedUnitForManage.name}
                </h3>
                <p className="text-xs text-red-100 mt-0.5">
                  Performance grade, submitted reports, and unit details for {selectedUnitForManage.name}.
                </p>
              </div>
              <button
                onClick={() => setManageUnitModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
              <button
                onClick={() => setManageModalTab('reports')}
                className={`flex-1 py-3 px-4 text-center font-bold text-xs border-b-2 transition ${
                  manageModalTab === 'reports'
                    ? 'border-maroon text-maroon'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Activity Reports &amp; Grades
              </button>
              <button
                onClick={() => setManageModalTab('settings')}
                className={`flex-1 py-3 px-4 text-center font-bold text-xs border-b-2 transition ${
                  manageModalTab === 'settings'
                    ? 'border-maroon text-maroon'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚙️ Profile &amp; Settings
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
              {manageModalTab === 'reports' ? (
                <>
                  {/* Grade Controller */}
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">
                        Unit Overall Performance Grade
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Set the performance grade for this unit on the public leaderboard.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={manageUnitGrade}
                        onChange={(e) => setManageUnitGrade(e.target.value)}
                        className="rounded-xl border border-gray-300 py-1.5 px-3 text-xs font-bold"
                      >
                        <option value="A+">A+</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                      <button
                        onClick={handleUpdateUnitGradeDirectly}
                        className="bg-maroon hover:bg-red-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition"
                      >
                        Update Grade
                      </button>
                    </div>
                  </div>

                  {/* Reports List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                      Reports History ({manageUnitReports.length})
                    </h4>
                    {loadingUnitReports ? (
                      <p className="text-center text-xs text-gray-400 py-6">Loading reports...</p>
                    ) : manageUnitReports.length > 0 ? (
                      <div className="space-y-3">
                        {manageUnitReports.map((report) => (
                          <div
                            key={report.id}
                            className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col md:flex-row justify-between gap-4"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    report.status === 'approved'
                                      ? 'bg-green-100 text-green-800'
                                      : report.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {report.status.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(report.submitted_at).toLocaleDateString()}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-maroon">{report.title}</h5>
                              <p className="text-xs text-gray-600 mt-1">{report.description}</p>
                              {report.file_url && (
                                <a
                                  href={report.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold mt-2"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Evidence
                                </a>
                              )}
                            </div>

                            {/* Point & Status Controller */}
                            <div className="shrink-0 w-36 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-0 md:pl-3">
                              <div>
                                <label className="block text-[9px] font-bold text-gray-400 uppercase">
                                  Points
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  id={`edit-pts-${report.id}`}
                                  defaultValue={report.points_awarded || 0}
                                  className="w-full px-2 py-1 text-xs rounded border border-gray-300"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-gray-400 uppercase">
                                  Status
                                </label>
                                <select
                                  id={`edit-sts-${report.id}`}
                                  defaultValue={report.status}
                                  className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="approved">Approved</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </div>
                              <button
                                onClick={() => {
                                  const p = parseInt(
                                    (document.getElementById(`edit-pts-${report.id}`) as any)?.value
                                  );
                                  const s = (document.getElementById(`edit-sts-${report.id}`) as any)
                                    ?.value;
                                  handleUpdateReportFromManager(
                                    report.id,
                                    selectedUnitForManage.id,
                                    p,
                                    s,
                                    report.points_awarded || 0,
                                    report.status
                                  );
                                }}
                                className="w-full py-1 bg-maroon text-white font-bold text-[10px] rounded transition"
                              >
                                Save Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-gray-400 py-6">
                        No reports submitted by this unit.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveUnitProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                        Unit / Committee Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editUnitName}
                        onChange={(e) => setEditUnitName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                        Class Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editUnitClassName}
                        onChange={(e) => setEditUnitClassName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editUnitEmail}
                      onChange={(e) => setEditUnitEmail(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                    />
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      type="submit"
                      disabled={savingUnitProfile}
                      className="w-full py-2.5 bg-maroon text-white font-bold rounded-xl text-xs hover:bg-red-900 transition shadow-md disabled:opacity-50"
                    >
                      {savingUnitProfile ? 'Saving...' : 'Save Profile Changes'}
                    </button>

                    <div className="border-t border-gray-200 pt-4">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                        Danger Zone
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleResetUnitStudents(
                            selectedUnitForManage.id,
                            selectedUnitForManage.name
                          )
                        }
                        className="w-full py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold hover:bg-orange-100 transition"
                      >
                        Clear This Unit's Students (New Year Reset)
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
