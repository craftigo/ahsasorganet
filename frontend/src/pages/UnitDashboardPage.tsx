import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import { Unit, Member, Student, NotificationItem, UnitMessage } from '../../../shared/types';
import {
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  Upload,
  UserPlus,
  Trash2,
  Bell,
  Download,
  MessageSquare,
  X,
  Send,
  Edit,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';

export const UnitDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();

  // Unit State
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);

  // Activity Report Form State
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentDob, setStudentDob] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [studentFather, setStudentFather] = useState('');
  const [studentContact, setStudentContact] = useState('');
  const [studentDistrict, setStudentDistrict] = useState('');
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [studentStatus, setStudentStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Committee Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [submittingMember, setSubmittingMember] = useState(false);
  const [memberStatus, setMemberStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editProfileStatus, setEditProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Floating Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<UnitMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Fetch Unit Profile
  useEffect(() => {
    if (!user) return;

    const loadUnitData = async () => {
      try {
        setLoading(true);
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (unitError || !unitData) {
          console.error('Error fetching unit:', unitError);
          setLoading(false);
          return;
        }

        setUnit(unitData);

        // Pre-fill edit profile form
        setEditName(unitData.name || '');
        setEditClassName(unitData.class_name || '');
        setEditRegNo(unitData.reg_no || '');
        setEditContact(unitData.contact_info || '');
        setEditAddress(unitData.address || '');

        // Fetch associated data
        await Promise.all([
          fetchMembers(unitData.id),
          fetchStudents(unitData.id),
          fetchNotifications(),
          loadChatMessages(unitData.id)
        ]);
      } catch (err) {
        console.error('Failed to init unit dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUnitData();
  }, [user]);

  // Realtime & polling for Chat
  useEffect(() => {
    if (!unit?.id) return;

    // Realtime channel
    const channel = supabase
      .channel(`unit_chat:${unit.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'unit_messages',
          filter: `unit_id=eq.${unit.id}`
        },
        (payload) => {
          const newMsg = payload.new as UnitMessage;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    // 5s polling fallback when chat is open
    const pollInterval = setInterval(() => {
      if (isChatOpen) {
        loadChatMessages(unit.id);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [unit?.id, isChatOpen]);

  // Scroll chat to bottom
  useEffect(() => {
    if (isChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const fetchMembers = async (unitId: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMembers(data);
      // Check onboarding requirement
      if (data.length === 0) {
        // Incomplete committee
      }
    }
  };

  const fetchStudents = async (unitId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setStudents(data);
    }
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  };

  const loadChatMessages = async (unitId: string) => {
    const { data, error } = await supabase
      .from('unit_messages')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setChatMessages(data);
    }
  };

  // Submit Activity Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    setSubmittingReport(true);
    setReportStatus(null);

    try {
      let fileUrl = null;

      if (reportFile) {
        const fileExt = reportFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${unit.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('activity-images')
          .upload(filePath, reportFile);

        if (uploadError) {
          throw new Error('Image upload failed: ' + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('activity-images')
          .getPublicUrl(filePath);

        fileUrl = publicUrlData.publicUrl;
      }

      const fullDescription = reportCategory
        ? `[${reportCategory}] ${reportDescription}`
        : reportDescription;

      const { error: insertError } = await supabase.from('reports').insert([
        {
          unit_id: unit.id,
          title: reportTitle,
          description: fullDescription,
          file_url: fileUrl,
          status: 'pending'
        }
      ]);

      if (insertError) throw insertError;

      setReportStatus({
        type: 'success',
        message: 'Report submitted successfully! Waiting for admin review and point assignment.'
      });
      setReportTitle('');
      setReportCategory('');
      setReportDescription('');
      setReportFile(null);
    } catch (err: any) {
      setReportStatus({
        type: 'error',
        message: err.message || 'Failed to submit report. Please try again.'
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  // Register Student
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    setSubmittingStudent(true);
    setStudentStatus(null);

    try {
      const { error } = await supabase.from('students').insert([
        {
          unit_id: unit.id,
          name: studentName.trim(),
          dob: studentDob,
          address: studentAddress.trim(),
          father_name: studentFather.trim(),
          contact_number: studentContact.trim(),
          district: studentDistrict.trim()
        }
      ]);

      if (error) throw error;

      setStudentStatus({
        type: 'success',
        message: 'Student registered successfully!'
      });
      setStudentName('');
      setStudentDob('');
      setStudentAddress('');
      setStudentFather('');
      setStudentContact('');
      setStudentDistrict('');

      await fetchStudents(unit.id);
    } catch (err: any) {
      setStudentStatus({
        type: 'error',
        message: err.message || 'Failed to register student.'
      });
    } finally {
      setSubmittingStudent(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;
      if (unit) fetchStudents(unit.id);
    } catch (err: any) {
      alert('Failed to remove student: ' + err.message);
    }
  };

  // Add Committee Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !settings.allow_unit_edit) return;

    setSubmittingMember(true);
    setMemberStatus(null);

    try {
      const { error } = await supabase.from('members').insert([
        {
          unit_id: unit.id,
          name: newMemberName.trim(),
          designation: newMemberRole.trim()
        }
      ]);

      if (error) throw error;

      setMemberStatus({ type: 'success', message: 'Member added successfully.' });
      setNewMemberName('');
      setNewMemberRole('');
      await fetchMembers(unit.id);
    } catch (err: any) {
      setMemberStatus({ type: 'error', message: err.message || 'Failed to add member.' });
    } finally {
      setSubmittingMember(false);
    }
  };

  // Remove Committee Member
  const handleDeleteMember = async (memberId: string) => {
    if (!settings.allow_unit_edit) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
      if (unit) fetchMembers(unit.id);
    } catch (err: any) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !settings.allow_unit_edit) return;

    setSavingProfile(true);
    setEditProfileStatus(null);

    try {
      const payload: Partial<Unit> = {
        name: editName.trim(),
        class_name: editClassName.trim(),
        reg_no: editRegNo.trim(),
        contact_info: editContact.trim(),
        address: editAddress.trim()
      };

      const { error } = await supabase
        .from('units')
        .update(payload)
        .eq('id', unit.id);

      if (error) throw error;

      setUnit((prev) => (prev ? { ...prev, ...payload } : null));
      setEditProfileStatus({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setEditProfileStatus(null);
      }, 1500);
    } catch (err: any) {
      setEditProfileStatus({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Send Chat Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !unit) return;

    const messageText = newChatMessage.trim();
    setSendingChat(true);

    try {
      const { error } = await supabase.from('unit_messages').insert([
        {
          unit_id: unit.id,
          message: messageText,
          sender: 'unit'
        }
      ]);

      if (error) throw error;
      setNewChatMessage('');
      await loadChatMessages(unit.id);
    } catch (err: any) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-maroon/20 border-t-maroon rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading Unit Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
          <AlertCircle className="w-12 h-12 text-maroon mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Unit Associated</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Your account is authenticated, but no registered unit is linked to this account.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-maroon text-white font-bold rounded-xl hover:bg-red-900 transition shadow-lg"
          >
            Register Unit Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Welcome Banner */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-2xl shadow-sm p-6 border-l-4 border-maroon gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Welcome, {unit.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your activities, track your performance, and collaborate with administration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active Unit
          </span>
          {unit.class_name && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
              Class {unit.class_name}
            </span>
          )}
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Stats & Actions (1 col on lg) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Unit Report Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-maroon to-red-900 text-white p-4 font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-300" />
              <span>Unit Report Card</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm font-medium text-gray-500">Grade</span>
                <span className="text-2xl font-black text-maroon">{unit.grade || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm font-medium text-gray-500">Total Score</span>
                <span className="text-2xl font-bold text-gray-900">{unit.total_score || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Members</span>
                <span className="text-lg font-bold text-gray-700">{members.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <Link
            to="/leaderboard"
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transition hover:-translate-y-0.5 active:translate-y-0"
          >
            <Award className="w-5 h-5" />
            View Live Leaderboard
          </Link>

          {/* Quick Help Link */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500 flex items-center justify-between">
            <span>Need assistance?</span>
            <Link to="/help" className="font-bold text-maroon hover:underline flex items-center gap-1">
              Read Help Guide <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Middle Column: Activity Reporting, Students, Circulars (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Reporting Form */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-900 text-white p-4 font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              <span>Submit Activity Report</span>
            </div>
            <div className="p-6">
              {reportStatus && (
                <div
                  className={`mb-4 p-4 rounded-xl text-sm flex items-start gap-3 ${
                    reportStatus.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {reportStatus.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <span>{reportStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Activity Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g. Science Exhibition & Project Presentation"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition bg-white"
                    >
                      <option value="">Select Category</option>
                      <option value="Arts">Arts</option>
                      <option value="Sports">Sports</option>
                      <option value="Samajam">Samajam</option>
                      <option value="Competitions">Competitions</option>
                      <option value="Writing">Writing</option>
                      <option value="Programs">Programs</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Upload Evidence (Photo/Poster/PDF)
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReportFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 border border-gray-300 rounded-xl p-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Provide activity details, objectives, dates, and number of participants..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition"
                  />
                </div>

                <div className="text-right pt-2">
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-maroon text-white font-bold rounded-xl hover:bg-red-900 transition shadow-md shadow-maroon/20 disabled:opacity-50 text-sm"
                  >
                    {submittingReport ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Submit Report
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Student Management Section (Conditionally rendered based on global settings) */}
          {settings.allow_student_registration && (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-900 text-white p-4 font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>Student Roster Management</span>
              </div>
              <div className="p-6">
                {studentStatus && (
                  <div
                    className={`mb-4 p-4 rounded-xl text-sm flex items-start gap-3 ${
                      studentStatus.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                  >
                    {studentStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    )}
                    <span>{studentStatus.message}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterStudent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Student's name"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={studentDob}
                        onChange={(e) => setStudentDob(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Address *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={studentAddress}
                      onChange={(e) => setStudentAddress(e.target.value)}
                      placeholder="Residential address"
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Father's Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={studentFather}
                        onChange={(e) => setStudentFather(e.target.value)}
                        placeholder="Father's name"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Contact Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={studentContact}
                        onChange={(e) => setStudentContact(e.target.value)}
                        placeholder="Phone number"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                        District *
                      </label>
                      <input
                        type="text"
                        required
                        value={studentDistrict}
                        onChange={(e) => setStudentDistrict(e.target.value)}
                        placeholder="District"
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
                      />
                    </div>
                  </div>

                  <div className="text-right pt-2">
                    <button
                      type="submit"
                      disabled={submittingStudent}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md disabled:opacity-50 text-sm"
                    >
                      {submittingStudent ? 'Registering...' : 'Register Student'}
                    </button>
                  </div>
                </form>

                {/* Registered Students List */}
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-900">
                      Registered Students in this Class
                    </h4>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-bold">
                      {students.length} Total
                    </span>
                  </div>

                  {students.length > 0 ? (
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                      {students.map((student, idx) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400 w-6">
                              {idx + 1}.
                            </span>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{student.name}</p>
                              <p className="text-[11px] text-gray-500">
                                {student.district} • {student.contact_number} • Father: {student.father_name}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Remove Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No students registered yet. Fill out the form above to enroll students.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notice Board & Circulars Section */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-500" />
                Notice Board &amp; Official Circulars
              </h3>
              <span className="text-xs text-gray-400 font-medium">
                {notifications.length} announcements
              </span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => {
                  const isExpanded = expandedNotifId === notif.id;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => setExpandedNotifId(isExpanded ? null : notif.id)}
                      className="p-4 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-gray-900 hover:text-maroon transition">
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <p
                        className={`text-xs text-gray-600 mt-1 ${
                          isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                        }`}
                      >
                        {notif.description}
                      </p>

                      {isExpanded && notif.file_url && (
                        <div className="mt-3 pt-3 border-t border-dashed border-gray-100">
                          <a
                            href={notif.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold"
                          >
                            <Download className="w-4 h-4" /> Download Official Attachment
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-gray-400 italic">
                  No official announcements posted at this time.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Unit Details & Committee (1 col on lg) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Unit Basic Details */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-maroon to-red-900 text-white p-4 font-bold flex items-center justify-between">
              <span className="text-sm">Unit Details</span>
              {settings.allow_unit_edit && (
                <button
                  onClick={() => setIsEditProfileOpen(true)}
                  className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            <ul className="divide-y divide-gray-100 text-sm">
              <li className="p-4 flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Unit Name
                </span>
                <span className="text-gray-900 font-bold mt-0.5">{unit.name}</span>
              </li>
              <li className="p-4 flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Registration No
                </span>
                <span className="text-gray-800 font-medium mt-0.5">{unit.reg_no || 'N/A'}</span>
              </li>
              <li className="p-4 flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Class Name
                </span>
                <span className="text-gray-800 font-medium mt-0.5">
                  {unit.class_name || 'Not Specified'}
                </span>
              </li>
              <li className="p-4 flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Address / Location
                </span>
                <span className="text-gray-800 font-medium mt-0.5">{unit.address || '—'}</span>
              </li>
              {unit.contact_info && (
                <li className="p-4 flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Contact Information
                  </span>
                  <span className="text-gray-800 font-medium mt-0.5">{unit.contact_info}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Committee Members Section */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-900 text-white p-4 font-bold flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Committee Members
              </span>
              <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full font-bold">
                {members.length}
              </span>
            </div>

            {/* Add Member Form (if allow_unit_edit is enabled) */}
            {settings.allow_unit_edit && (
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <form onSubmit={handleAddMember} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Member Name"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-maroon focus:border-maroon"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      placeholder="Designation"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-1 focus:ring-maroon focus:border-maroon"
                    />
                    <button
                      type="submit"
                      disabled={submittingMember}
                      className="px-3 py-1.5 bg-maroon text-white text-xs font-bold rounded-lg hover:bg-red-900 transition disabled:opacity-50"
                    >
                      {submittingMember ? '...' : 'Add'}
                    </button>
                  </div>
                </form>
                {memberStatus && (
                  <p
                    className={`text-[10px] mt-1 font-bold ${
                      memberStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {memberStatus.message}
                  </p>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
              {members.length > 0 ? (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 flex justify-between items-center hover:bg-gray-50 transition"
                  >
                    <div>
                      <span className="block text-xs font-bold text-gray-900">{member.name}</span>
                      <span className="block text-[11px] text-gray-500">{member.designation}</span>
                    </div>
                    {settings.allow_unit_edit && (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-xs text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-gray-400 italic">
                  No members added yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-maroon p-5 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Edit className="w-5 h-5" /> Edit Profile Details
              </h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {editProfileStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    editProfileStatus.type === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {editProfileStatus.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-1 focus:ring-maroon focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-1 focus:ring-maroon focus:border-maroon"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Registration No
                  </label>
                  <input
                    type="text"
                    value={editRegNo}
                    onChange={(e) => setEditRegNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-1 focus:ring-maroon focus:border-maroon"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Contact Info
                  </label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-1 focus:ring-maroon focus:border-maroon"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-1 focus:ring-maroon focus:border-maroon"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-2.5 px-4 bg-maroon text-white font-bold rounded-xl text-sm hover:bg-red-900 transition shadow-md disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating WhatsApp-style Chat Widget (Help Desk) */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-40 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl transition duration-300 flex items-center justify-center hover:scale-105 active:scale-95 hover:shadow-red-600/30"
        title="Contact Administrator"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] sm:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-maroon to-red-900 text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative">
                <MessageSquare className="w-5 h-5 text-white" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-maroon" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white leading-tight">Admin Support</h4>
                <span className="text-[10px] text-red-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Live Help Desk
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-white hover:bg-white/10 p-1.5 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 flex flex-col">
            {chatMessages.length > 0 ? (
              chatMessages.map((msg) => {
                const isAdmin = msg.sender === 'admin';
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                if (isAdmin) {
                  return (
                    <div key={msg.id} className="flex flex-col items-start max-w-[80%] self-start">
                      <div className="bg-white text-gray-800 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm border border-gray-100 text-sm">
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <span className="block text-[9px] text-gray-400 text-right mt-1">
                          {timeStr}
                        </span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={msg.id} className="flex flex-col items-end max-w-[80%] self-end">
                      <div className="bg-gradient-to-r from-maroon to-red-800 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-md text-sm">
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <span className="block text-[9px] text-red-200 text-right mt-1">
                          {timeStr}
                        </span>
                      </div>
                    </div>
                  );
                }
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Send a message to the administrator. Replies will appear here in realtime.
                </p>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={newChatMessage}
              onChange={(e) => setNewChatMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-maroon focus:ring-1 focus:ring-maroon shadow-inner"
            />
            <button
              type="submit"
              disabled={sendingChat || !newChatMessage.trim()}
              className="bg-gradient-to-r from-maroon to-red-800 hover:from-red-950 hover:to-red-800 text-white p-2.5 rounded-full shadow-md transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
