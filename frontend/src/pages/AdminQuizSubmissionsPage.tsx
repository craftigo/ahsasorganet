import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Search,
  Download,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  MessageCircle,
  Check,
  BookOpen,
  Edit3,
  Plus,
  RotateCcw,
  Clock,
  Calendar,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  QUIZ_QUESTIONS,
  QuizQuestion,
  getStoredQuestions,
  saveStoredQuestions,
  resetStoredQuestions,
  getQuizWindowOverride,
  setQuizWindowOverride,
  QuizWindowMode,
  isQuizClosed
} from '../data/quizQuestions';
import {
  getLocalSubmissions,
  deleteLocalSubmission,
  mergeSubmissions
} from '../data/quizSubmissions';
import { QuizSubmission } from '@shared/types';

export const AdminQuizSubmissionsPage: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'submissions' | 'questions' | 'window'>('submissions');

  // Submissions State
  const [submissions, setSubmissions] = useState<QuizSubmission[]>(getLocalSubmissions());
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'time_asc' | 'date_desc'>('score_desc');
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Question Bank & Editor State
  const [questions, setQuestions] = useState<QuizQuestion[]>(getStoredQuestions());
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Dedicated Inline Quick-Add Question State
  const [showAddForm, setShowAddForm] = useState<boolean>(true);
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('General Knowledge');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [newOptA, setNewOptA] = useState<string>('');
  const [newOptB, setNewOptB] = useState<string>('');
  const [newOptC, setNewOptC] = useState<string>('');
  const [newOptD, setNewOptD] = useState<string>('');
  const [newCorrectIdx, setNewCorrectIdx] = useState<number>(0);
  const [isSubmittingNewQ, setIsSubmittingNewQ] = useState<boolean>(false);

  // Competition Window Override State
  const [windowMode, setWindowMode] = useState<QuizWindowMode>(getQuizWindowOverride());

  // Fetch Submissions (Combined Supabase + Local Storage)
  const fetchSubmissions = async () => {
    setLoading(true);
    const localEntries = getLocalSubmissions();

    try {
      let remoteEntries: QuizSubmission[] = [];

      // 1. First attempt to fetch from backend Express API
      try {
        const res = await fetch('/api/quiz/admin/submissions', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          remoteEntries = data.submissions || [];
        }
      } catch (apiErr) {
        // Express route unavailable, fallback to direct Supabase query
      }

      // 2. Direct Supabase query if Express route didn't return entries
      if (remoteEntries.length === 0) {
        try {
          const { data, error } = await supabase
            .from('quiz_submissions')
            .select('*')
            .order('score', { ascending: false })
            .order('time_taken_seconds', { ascending: true })
            .order('submitted_at', { ascending: true });

          if (!error && data) {
            remoteEntries = data as QuizSubmission[];
          }
        } catch (sbErr) {
          console.warn('Supabase submissions query notice:', sbErr);
        }
      }

      // 3. Merge Supabase entries with locally persisted entries
      const combined = mergeSubmissions(remoteEntries, localEntries);
      setSubmissions(combined);

      // 4. Background push any local submissions to Supabase if not yet synced
      if (localEntries.length > 0) {
        const remoteIds = new Set(remoteEntries.map((r) => r.id));
        for (const localSub of localEntries) {
          if (!remoteIds.has(localSub.id)) {
            supabase
              .from('quiz_submissions')
              .insert(localSub)
              .then(() => {}, () => {});
          }
        }
      }
    } catch (err: any) {
      console.error('Fetch submissions exception:', err);
      setSubmissions(localEntries);
    } finally {
      setLoading(false);
    }
  };

  // Sync questions from Supabase if table exists
  useEffect(() => {
    fetchSubmissions();

    const fetchRemoteQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_questions')
          .select('*')
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: QuizQuestion[] = data.map((item: any) => ({
            id: item.id,
            question: item.question,
            options: item.options,
            correctAnswerIndex: item.correct_answer_index ?? item.correctAnswerIndex ?? 0,
            category: item.category || 'General'
          }));
          setQuestions(mapped);
          saveStoredQuestions(mapped);
        }
      } catch (e) {
        // use local storage questions silently
      }
    };

    fetchRemoteQuestions();
  }, []);

  // Filter & Sort Submissions
  const filteredSubmissions = submissions
    .filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.participant_name?.toLowerCase().includes(q) ||
        s.student_name?.toLowerCase().includes(q) ||
        s.student_class?.toLowerCase().includes(q) ||
        s.phone_number?.toLowerCase().includes(q) ||
        s.place?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score_desc') {
        if (b.score !== a.score) return b.score - a.score;
        return a.time_taken_seconds - b.time_taken_seconds;
      }
      if (sortBy === 'score_asc') return a.score - b.score;
      if (sortBy === 'time_asc') return a.time_taken_seconds - b.time_taken_seconds;
      if (sortBy === 'date_desc') {
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      }
      return 0;
    });

  // Analytics Metrics
  const totalSubmissions = submissions.length;
  const highestScore = totalSubmissions > 0 ? Math.max(...submissions.map((s) => s.score)) : 0;
  const averageScore =
    totalSubmissions > 0
      ? (submissions.reduce((acc, cur) => acc + cur.score, 0) / totalSubmissions).toFixed(1)
      : '0';

  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder.toString().padStart(2, '0')}s`;
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) return;

    const headers = [
      'Rank',
      'Participant Name',
      'Student Name',
      'Class',
      'Phone Number',
      'Place',
      `Score (out of ${questions.length})`,
      'Percentage (%)',
      'Time Taken',
      'Submission Date & Time'
    ];

    const rows = filteredSubmissions.map((s, idx) => [
      idx + 1,
      `"${(s.participant_name || '').replace(/"/g, '""')}"`,
      `"${(s.student_name || '').replace(/"/g, '""')}"`,
      `"${(s.student_class || '').replace(/"/g, '""')}"`,
      `"${s.phone_number || ''}"`,
      `"${(s.place || '').replace(/"/g, '""')}"`,
      s.score,
      `${((s.score / (s.total_questions || questions.length)) * 100).toFixed(1)}%`,
      `"${formatTime(s.time_taken_seconds)}"`,
      `"${new Date(s.submitted_at).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Edu-Familia-Quiz-Submissions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Delete
  const handleDeleteSubmission = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      // 1. Delete from local storage
      deleteLocalSubmission(deletingId);

      // 2. Delete via backend Express API
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token || '';
        await fetch(`/api/quiz/admin/submissions/${deletingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // ignore
      }

      // 3. Delete directly from Supabase
      try {
        await supabase.from('quiz_submissions').delete().eq('id', deletingId);
      } catch (e) {
        // ignore
      }

      setSubmissions((prev) => prev.filter((item) => item.id !== deletingId));
      setDeleteModalOpen(false);
      setDeletingId(null);
      if (selectedSubmission?.id === deletingId) {
        setSelectedSubmission(null);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Question Bank Actions
  const categories = Array.from(new Set(questions.map((q) => q.category))).filter(Boolean);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.options.some((opt) => opt.toLowerCase().includes(questionSearch.toLowerCase())) ||
      q.category.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.id.toString() === questionSearch.trim();

    const matchesCat = selectedCategory === 'all' || q.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenEditQuestion = (q: QuizQuestion) => {
    setEditingQuestion({ ...q, options: [...q.options] as [string, string, string, string] });
    setEditModalOpen(true);
  };

  const handleAddNewQuestion = () => {
    const nextId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
    const newQ: QuizQuestion = {
      id: nextId,
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      category: 'General Knowledge'
    };
    setEditingQuestion(newQ);
    setEditModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    if (!editingQuestion.question.trim()) {
      alert('Please enter question text.');
      return;
    }
    if (editingQuestion.options.some((opt) => !opt.trim())) {
      alert('Please fill out all 4 options (A, B, C, D).');
      return;
    }

    setIsSavingQuestion(true);
    try {
      const exists = questions.some((q) => q.id === editingQuestion.id);
      const updatedList = exists
        ? questions.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
        : [...questions, editingQuestion].sort((a, b) => a.id - b.id);

      setQuestions(updatedList);
      saveStoredQuestions(updatedList);

      // Attempt Supabase upsert
      try {
        await supabase.from('quiz_questions').upsert({
          id: editingQuestion.id,
          question: editingQuestion.question.trim(),
          options: editingQuestion.options,
          correct_answer_index: editingQuestion.correctAnswerIndex,
          category: editingQuestion.category.trim(),
          updated_at: new Date().toISOString()
        });
      } catch (sbErr) {
        console.warn('Optional Supabase quiz_questions upsert notice:', sbErr);
      }

      setSaveNotice(`Question ${editingQuestion.id} successfully saved!`);
      setTimeout(() => setSaveNotice(null), 3500);
      setEditModalOpen(false);
      setEditingQuestion(null);
    } catch (err: any) {
      alert('Error saving question: ' + (err.message || 'Please retry.'));
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleResetToDefaults = () => {
    if (
      window.confirm(
        'Are you sure you want to restore the official 30 questions provided for Edu Familia? All custom edits will be reverted.'
      )
    ) {
      resetStoredQuestions();
      setQuestions(QUIZ_QUESTIONS);
      setSaveNotice('Questions reverted to official 30 questions!');
      setTimeout(() => setSaveNotice(null), 3500);
    }
  };

  // Add New Question from Inline Card
  const handleCreateInlineQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      alert('Please enter question text.');
      return;
    }
    if (!newOptA.trim() || !newOptB.trim() || !newOptC.trim() || !newOptD.trim()) {
      alert('Please provide all 4 options (A, B, C, D).');
      return;
    }

    const categoryName = (newCategory === 'Custom' ? customCategory.trim() : newCategory.trim()) || 'General Knowledge';
    const nextId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;

    const newQ: QuizQuestion = {
      id: nextId,
      question: newQuestionText.trim(),
      options: [newOptA.trim(), newOptB.trim(), newOptC.trim(), newOptD.trim()],
      correctAnswerIndex: newCorrectIdx,
      category: categoryName
    };

    setIsSubmittingNewQ(true);
    try {
      const updatedList = [...questions, newQ];
      setQuestions(updatedList);
      saveStoredQuestions(updatedList);

      // Attempt Supabase upsert
      try {
        await supabase.from('quiz_questions').upsert({
          id: newQ.id,
          question: newQ.question,
          options: newQ.options,
          correct_answer_index: newQ.correctAnswerIndex,
          category: newQ.category,
          updated_at: new Date().toISOString()
        });
      } catch (sbErr) {
        console.warn('Optional Supabase quiz_questions upsert notice:', sbErr);
      }

      setSaveNotice(`Question #${newQ.id} added successfully! Total questions: ${updatedList.length}`);
      setTimeout(() => setSaveNotice(null), 4000);

      // Reset form
      setNewQuestionText('');
      setNewOptA('');
      setNewOptB('');
      setNewOptC('');
      setNewOptD('');
      setNewCorrectIdx(0);
      setCustomCategory('');
    } catch (err: any) {
      alert('Error adding question: ' + (err.message || 'Please retry.'));
    } finally {
      setIsSubmittingNewQ(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: number) => {
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete Question #${questionId}?\n"${target.question.slice(0, 60)}..."`
    );
    if (!confirmed) return;

    try {
      const updatedList = questions.filter((q) => q.id !== questionId);
      setQuestions(updatedList);
      saveStoredQuestions(updatedList);

      try {
        await supabase.from('quiz_questions').delete().eq('id', questionId);
      } catch (sbErr) {
        console.warn('Supabase delete notice:', sbErr);
      }

      setSaveNotice(`Question #${questionId} deleted successfully. Remaining questions: ${updatedList.length}`);
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err: any) {
      alert('Error deleting question: ' + (err.message || 'Please retry.'));
    }
  };

  // Competition Window Override Action
  const handleSetWindowMode = (mode: QuizWindowMode) => {
    setQuizWindowOverride(mode);
    setWindowMode(mode);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin" className="text-xs font-bold text-gray-500 hover:text-purple-700 transition">
              ← Admin Command Center
            </Link>
          </div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>Edu Familia Quiz Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 uppercase">
              Al Suffa (C3)
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Review participant registrations, accurate scores, inspect answers, edit questions, and monitor live competition.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchSubmissions}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/quiz"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-xs"
          >
            <span>Open Live Quiz</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Global Notification Banner */}
      {saveNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'submissions'
              ? 'bg-purple-900 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Submissions & Rankings ({totalSubmissions})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-purple-900 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Question Bank & Editor ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('window')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'window'
              ? 'bg-purple-900 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Competition Schedule ({isQuizClosed() ? 'Closed' : 'Live'})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: SUBMISSIONS & LIVE RANKINGS
      ===================================================================== */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Participants</span>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 flex items-baseline gap-2">
                <span>{totalSubmissions}</span>
                <span className="text-xs font-bold text-purple-600">Entries</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Highest Score</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 flex items-baseline gap-1">
                <span>{highestScore}</span>
                <span className="text-sm text-gray-400 font-bold">/ {questions.length}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Average Score</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 flex items-baseline gap-1">
                <span>{averageScore}</span>
                <span className="text-sm text-gray-400 font-bold">/ {questions.length}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Questions</span>
              <div className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">
                <span>{questions.length}</span>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search participant, student, phone, place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportCSV}
                disabled={filteredSubmissions.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel/CSV</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-purple-500"
                >
                  <option value="score_desc">Highest Score First</option>
                  <option value="score_asc">Lowest Score First</option>
                  <option value="time_asc">Fastest Time First</option>
                  <option value="date_desc">Most Recent First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                <p className="text-xs font-semibold">Loading submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <HelpCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">No Submissions Found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchQuery ? 'No matching results for your search.' : 'No one has participated in the quiz yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center">Rank</th>
                      <th className="px-4 py-3">Participant & Place</th>
                      <th className="px-4 py-3">Student & Class</th>
                      <th className="px-4 py-3">Phone / WhatsApp</th>
                      <th className="px-4 py-3 text-center">Score</th>
                      <th className="px-4 py-3 text-center">Time</th>
                      <th className="px-4 py-3 text-center">Date & Time</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSubmissions.map((sub, index) => {
                      const cleanPhone = (sub.phone_number || '').replace(/\D/g, '');
                      const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}` : null;
                      const totalQ = sub.total_questions || questions.length;
                      const percentage = ((sub.score / totalQ) * 100).toFixed(0);

                      return (
                        <tr key={sub.id} className="hover:bg-purple-50/30 transition">
                          {/* Rank */}
                          <td className="px-4 py-3 text-center font-bold">
                            {index === 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-gray-950 text-xs font-black shadow-xs">
                                1
                              </span>
                            ) : index === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-gray-900 text-xs font-black">
                                2
                              </span>
                            ) : index === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black">
                                3
                              </span>
                            ) : (
                              <span className="text-gray-500 font-semibold">#{index + 1}</span>
                            )}
                          </td>

                          {/* Participant & Place */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{sub.participant_name}</div>
                            <div className="text-[11px] text-gray-500">{sub.place}</div>
                          </td>

                          {/* Student & Class */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{sub.student_name}</div>
                            {sub.student_class && (
                              <div className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                {sub.student_class}
                              </div>
                            )}
                          </td>

                          {/* Phone / WhatsApp */}
                          <td className="px-4 py-3">
                            <div className="font-mono text-gray-800">{sub.phone_number}</div>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition mt-0.5"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </td>

                          {/* Score */}
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-sm">
                              <span>{sub.score}</span>
                              <span className="text-[10px] text-emerald-600 font-bold">/ {totalQ}</span>
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 mt-0.5">({percentage}%)</div>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3 text-center font-mono text-gray-600">
                            {formatTime(sub.time_taken_seconds || 0)}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-center text-[11px] text-gray-500">
                            <div>{new Date(sub.submitted_at).toLocaleDateString()}</div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSubmission(sub)}
                                className="p-1.5 rounded-lg text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition cursor-pointer"
                                title="Review Answers"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingId(sub.id);
                                  setDeletingName(sub.participant_name);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Submission"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: QUESTION BANK & EDITOR (30 Questions)
      ===================================================================== */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* =================================================================
              DEDICATED QUICK-CREATE CARD: ADD NEW QUESTION & OPTIONS
          ================================================================= */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-50 via-white to-indigo-50/60 border-2 border-purple-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-700 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-gray-900">
                      Add New Question & Options
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-200/80 text-purple-900">
                      പുതിയ ചോദ്യം ചേർക്കുക
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add a new question with 4 options and mark the correct answer. Saves instantly to database.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-100/70 hover:bg-purple-200 transition cursor-pointer shrink-0"
              >
                <span>{showAddForm ? 'Hide Form' : 'Show Form'}</span>
                {showAddForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleCreateInlineQuestion} className="space-y-4 pt-2 border-t border-purple-100">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Category (വിഭാഗം) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {['General Knowledge', 'Holy Quran', 'Samastha History', 'Prophets & Companions', 'Kerala & Geography', 'Custom'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          newCategory === cat
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {cat === 'Custom' ? '+ Custom Category' : cat}
                      </button>
                    ))}
                  </div>

                  {newCategory === 'Custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom category name..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 w-full sm:w-80 px-3.5 py-2 text-xs rounded-xl border border-purple-300 focus:outline-none focus:border-purple-600 bg-white"
                    />
                  )}
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Question Text (ചോദ്യം മലയാളത്തിലോ ഇംഗ്ലീഷിലോ നൽകാം) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="ഉദാ: വിശുദ്ധ ഖുർആനിൽ പേരെടുത്ത് പരാമർശിക്കപ്പെട്ടിട്ടുള്ള ഒരേയൊരു സ്വഹാബി ആര്?"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-gray-900 text-xs sm:text-sm font-semibold focus:outline-none focus:border-purple-600 leading-relaxed shadow-2xs"
                  />
                </div>

                {/* 4 Options with Correct Answer Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      Options & Mark Correct Answer (ഓപ്ഷനുകളും ശരിയായ ഉത്തരവും) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500 font-medium">
                      Select which option is correct (A, B, C, or D)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { letter: 'A', value: newOptA, setter: setNewOptA, idx: 0 },
                      { letter: 'B', value: newOptB, setter: setNewOptB, idx: 1 },
                      { letter: 'C', value: newOptC, setter: setNewOptC, idx: 2 },
                      { letter: 'D', value: newOptD, setter: setNewOptD, idx: 3 }
                    ].map(({ letter, value, setter, idx }) => {
                      const isCorrect = newCorrectIdx === idx;

                      return (
                        <div
                          key={letter}
                          className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
                            isCorrect
                              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/30'
                              : 'bg-white border-gray-200 hover:border-purple-200'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name="newCorrectAnswerRadio"
                              checked={isCorrect}
                              onChange={() => setNewCorrectIdx(idx)}
                              className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                            />
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 border border-gray-300 text-gray-700'
                              }`}
                            >
                              {letter}
                            </span>
                          </label>

                          <input
                            type="text"
                            required
                            placeholder={`Option ${letter} text`}
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="flex-grow px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-xs font-medium focus:outline-none focus:border-purple-600"
                          />

                          {isCorrect && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shrink-0 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-gray-500 font-medium">
                    This will be added as <strong>Question #{questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1}</strong>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingNewQ}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmittingNewQ ? 'Adding Question...' : 'Add Question to Quiz (ചോദ്യം ചേർക്കുക)'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions or options..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Categories ({questions.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleAddNewQuestion}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                title="Restore default 30 questions"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-600" />
                <span>Reset to Official 30</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
                <BookOpen className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">No Questions Found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const letters = ['A', 'B', 'C', 'D'];

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs hover:border-purple-300 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-900 text-xs font-black flex items-center justify-center shrink-0">
                          {q.id}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          {q.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-relaxed">
                      {q.question}
                    </h3>

                    {/* 4 Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                              isCorrect
                                ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold shadow-xs'
                                : 'bg-gray-50/70 border-gray-200 text-gray-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-gray-300 text-gray-600'
                              }`}
                            >
                              {letters[optIdx]}
                            </span>
                            <span className="flex-grow leading-relaxed">{opt}</span>
                            {isCorrect && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white shrink-0 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: ACTIVE QUIZ WINDOW & DATABASE SETUP
      ===================================================================== */}
      {activeTab === 'window' && (
        <div className="space-y-6">
          {/* Window Status Card */}
          <div className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Schedule & Availability</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  Active 24-Hour Competition Window
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                  As announced on the official poster, the Edu Familia Quiz is open for 24 hours only. Outside this window, participants will see <strong>Registration Closed</strong>.
                </p>
              </div>

              {isQuizClosed() ? (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-300 shrink-0">
                  🔴 Registration Closed
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>🟢 Live & Accepting Entries</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/70">
                <span className="font-bold uppercase tracking-wider text-purple-700 block text-[10px]">Opens</span>
                <p className="text-sm font-extrabold text-gray-900 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Sunday, 08 Nov 2026 at 12:00 AM IST</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/70">
                <span className="font-bold uppercase tracking-wider text-purple-700 block text-[10px]">Closes</span>
                <p className="text-sm font-extrabold text-gray-900 mt-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Monday, 09 Nov 2026 at 12:00 AM IST</span>
                </p>
              </div>
            </div>

            {/* Quick Override Controls */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-700 block mb-2">Quiz Status Override Mode:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSetWindowMode('auto')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    windowMode === 'auto'
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Automated 24h Window (Recommended)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetWindowMode('force_open')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    windowMode === 'force_open'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Force Live (Testing Mode)
                </button>

                <button
                  type="button"
                  onClick={() => handleSetWindowMode('force_closed')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    windowMode === 'force_closed'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Force Closed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: EDIT OR ADD QUESTION
      =================================================================== */}
      {editModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Question Editor</span>
                <h3 className="text-xl font-black mt-0.5">
                  {editingQuestion.id ? `Question #${editingQuestion.id}` : 'New Question'}
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuestion} className="p-6 overflow-y-auto space-y-4 flex-grow text-xs">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samastha History, Holy Quran, General Knowledge"
                  value={editingQuestion.category}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-purple-600 font-medium"
                />
              </div>

              {/* Question Text (Malayalam supported) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Question Text (Malayalam / English) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="ചോദ്യം ഇവിടെ ടൈപ്പ് ചെയ്യുക..."
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:border-purple-600 font-semibold leading-relaxed"
                />
              </div>

              {/* 4 Options & Correct Answer Radio */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-gray-700">
                  Options & Mark Correct Answer <span className="text-rose-500">*</span>
                </label>

                {(['A', 'B', 'C', 'D'] as const).map((letter, optIdx) => {
                  const isChecked = editingQuestion.correctAnswerIndex === optIdx;

                  return (
                    <div
                      key={letter}
                      className={`p-3 rounded-2xl border transition flex items-center gap-3 ${
                        isChecked ? 'bg-emerald-50/70 border-emerald-400' : 'bg-gray-50/70 border-gray-200'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="radio"
                          name="correctOptionRadio"
                          checked={isChecked}
                          onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswerIndex: optIdx })}
                          className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                        />
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                            isChecked ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-700'
                          }`}
                        >
                          {letter}
                        </span>
                      </label>

                      <input
                        type="text"
                        required
                        placeholder={`Option ${letter} text`}
                        value={editingQuestion.options[optIdx] || ''}
                        onChange={(e) => {
                          const updatedOpts = [...editingQuestion.options] as [string, string, string, string];
                          updatedOpts[optIdx] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: updatedOpts });
                        }}
                        className="flex-grow px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-purple-600 font-medium"
                      />

                      {isChecked && (
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider shrink-0 hidden sm:inline">
                          ✓ Correct Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="px-6 py-2.5 rounded-xl font-black bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingQuestion ? 'Saving...' : 'Save Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: VIEW SUBMISSION ANSWERS DETAIL
      =================================================================== */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-900 to-indigo-950 text-white">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Answer Sheet Review</span>
                <h3 className="text-xl font-black mt-0.5">{selectedSubmission.participant_name}</h3>
                <p className="text-xs text-purple-200 mt-1">
                  Student: {selectedSubmission.student_name} {selectedSubmission.student_class ? `(${selectedSubmission.student_class})` : ''} • Place: {selectedSubmission.place}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-300">
                    {selectedSubmission.score} / {selectedSubmission.total_questions || questions.length}
                  </div>
                  <div className="text-[11px] text-purple-200">Time: {formatTime(selectedSubmission.time_taken_seconds)}</div>
                </div>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Questions Breakdown */}
            <div className="p-6 overflow-y-auto space-y-4 flex-grow bg-gray-50/50">
              <div className="flex items-center justify-between text-xs font-bold text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Correct Answers: {selectedSubmission.score}
                </span>
                <span className="text-rose-700 flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Incorrect / Skipped: {(selectedSubmission.total_questions || questions.length) - selectedSubmission.score}
                </span>
                <span className="text-gray-500">
                  Accuracy: {(((selectedSubmission.score) / (selectedSubmission.total_questions || questions.length)) * 100).toFixed(0)}%
                </span>
              </div>

              {questions.map((q) => {
                const userSelectedOption = selectedSubmission.answers?.[q.id];
                const isCorrect = userSelectedOption !== undefined && userSelectedOption === q.correctAnswerIndex;
                const isSkipped = userSelectedOption === undefined;
                const letters = ['A', 'B', 'C', 'D'];

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border text-xs transition ${
                      isCorrect
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : isSkipped
                        ? 'bg-gray-100 border-gray-300'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-bold text-gray-900 text-sm leading-relaxed">
                        <span className="text-purple-700 font-black mr-1">{q.id}.</span>
                        {q.question}
                      </span>
                      {isCorrect ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Correct
                        </span>
                      ) : isSkipped ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-500 text-white shrink-0">
                          Not Answered
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shrink-0 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Incorrect
                        </span>
                      )}
                    </div>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {q.options.map((opt, optIdx) => {
                        const isThisUserChoice = userSelectedOption === optIdx;
                        const isThisRightAnswer = q.correctAnswerIndex === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isThisRightAnswer
                                ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 font-bold'
                                : isThisUserChoice && !isThisRightAnswer
                                ? 'bg-rose-100/80 border-rose-400 text-rose-950 font-semibold'
                                : 'bg-white border-gray-200 text-gray-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isThisRightAnswer
                                  ? 'bg-emerald-600 text-white'
                                  : isThisUserChoice
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {letters[optIdx]}
                            </span>
                            <span className="flex-grow">{opt}</span>
                            {isThisRightAnswer && (
                              <span className="text-[10px] font-extrabold text-emerald-700 ml-auto shrink-0">
                                Correct Answer
                              </span>
                            )}
                            {isThisUserChoice && !isThisRightAnswer && (
                              <span className="text-[10px] font-extrabold text-rose-700 ml-auto shrink-0">
                                Selected
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-center text-gray-900">Delete Quiz Submission?</h4>
            <p className="text-xs text-center text-gray-500">
              The submission for <strong className="text-gray-800">{deletingName}</strong> will be permanently deleted from the database.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSubmission}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizSubmissionsPage;
