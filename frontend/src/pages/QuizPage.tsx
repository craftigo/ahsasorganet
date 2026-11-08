import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  RotateCcw,
  Sparkles,
  Home,
  User,
  Phone,
  MapPin,
  Lock,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import {
  QuizQuestion,
  getStoredQuestions,
  isQuizClosed,
  QUESTION_TIME_LIMIT_SECONDS,
  QUIZ_QUESTIONS_PER_SESSION
} from '../data/quizQuestions';
import { supabase } from '../lib/supabase';
import { saveLocalSubmission } from '../data/quizSubmissions';
import { QuizSubmission } from '@shared/types';

type QuizStep = 'intro' | 'active' | 'result';

interface RegistrationForm {
  participantName: string;
  studentName: string;
  studentClass: string;
  phoneNumber: string;
  place: string;
}

interface SessionQuestion {
  id: number;
  question: string;
  category: string;
  shuffledOptions: [string, string, string, string];
  shuffledToOriginalIndexMap: [number, number, number, number];
  correctAnswerIndexInShuffled: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function QuizPage(): JSX.Element {
  const [step, setStep] = useState<QuizStep>('intro');
  const [questions, setQuestions] = useState<QuizQuestion[]>(getStoredQuestions());
  const questionsRef = useRef<QuizQuestion[]>(questions);
  questionsRef.current = questions;

  // Randomized Session State (Unique question & option order per participant)
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([]);
  const sessionQuestionsRef = useRef<SessionQuestion[]>([]);
  sessionQuestionsRef.current = sessionQuestions;

  const [form, setForm] = useState<RegistrationForm>({
    participantName: '',
    studentName: '',
    studentClass: '',
    phoneNumber: '',
    place: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<RegistrationForm>>({});

  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmSubmitModalOpen, setConfirmSubmitModalOpen] = useState<boolean>(false);
  const [antiCheatNotice, setAntiCheatNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 30-Second Per-Question Timer State
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number>(QUESTION_TIME_LIMIT_SECONDS);
  const questionSecondsLeftRef = useRef<number>(QUESTION_TIME_LIMIT_SECONDS);
  questionSecondsLeftRef.current = questionSecondsLeft;

  // Try fetching latest questions from Supabase if online
  useEffect(() => {
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
        }
      } catch (err) {
        // Fallback to local default questions silently
      }
    };

    fetchRemoteQuestions();
  }, []);

  // References to eliminate stale closures in window event listeners
  const timerRef = useRef<any>(null);
  const noticeTimerRef = useRef<any>(null);
  const currentQuestionIndexRef = useRef<number>(currentQuestionIndex);
  currentQuestionIndexRef.current = currentQuestionIndex;

  const stepRef = useRef<QuizStep>(step);
  stepRef.current = step;

  const answersRef = useRef<Record<number, number>>(answers);
  answersRef.current = answers;

  const isSubmittingRef = useRef<boolean>(isSubmitting);
  isSubmittingRef.current = isSubmitting;

  const formRef = useRef<RegistrationForm>(form);
  formRef.current = form;

  const secondsElapsedRef = useRef<number>(secondsElapsed);
  secondsElapsedRef.current = secondsElapsed;

  const quizStartedAtRef = useRef<number>(0);
  const lastSkipTimeRef = useRef<number>(0);

  // Reset 30-second timer when question index changes
  useEffect(() => {
    if (step === 'active') {
      setQuestionSecondsLeft(QUESTION_TIME_LIMIT_SECONDS);
    }
  }, [currentQuestionIndex, step]);

  // Timer Effect (Seconds elapsed + 30-second per-question countdown)
  useEffect(() => {
    if (step === 'active') {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);

        // Per-question 30-second countdown with auto-advance
        setQuestionSecondsLeft((prevSecs) => {
          if (prevSecs <= 1) {
            // 30 seconds reached 0! Auto advance to next question
            const currIdx = currentQuestionIndexRef.current;
            const qNum = currIdx + 1;
            const totalCount = sessionQuestionsRef.current.length || questionsRef.current.length;

            if (currIdx < totalCount - 1) {
              setCurrentQuestionIndex((curr) => curr + 1);
              setAntiCheatNotice(`⏰ 30 seconds expired for Question ${qNum}! Automatically advanced to next question.`);
              if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
              noticeTimerRef.current = setTimeout(() => {
                setAntiCheatNotice(null);
              }, 4000);
              return QUESTION_TIME_LIMIT_SECONDS;
            } else {
              // Time expired on final question -> Auto finish quiz
              setAntiCheatNotice('⏰ 30 seconds expired on final question. Auto-submitting quiz.');
              handleSubmitQuiz();
              return 0;
            }
          }
          return prevSecs - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [step]);

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Validate Registration Form
  const validateForm = (): boolean => {
    const errors: Partial<RegistrationForm> = {};
    if (!form.participantName.trim()) {
      errors.participantName = 'Please enter participant / parent name.';
    }
    if (!form.studentName.trim()) {
      errors.studentName = 'Please enter student name.';
    }
    // studentClass is optional as requested
    const cleanPhone = form.phoneNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phoneNumber = 'Please enter a valid 10-digit mobile number.';
    }
    if (!form.place.trim()) {
      errors.place = 'Please enter your place or city.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // 1. Shuffle all base questions so every participant gets a unique randomized question sequence
    const shuffledAll = shuffleArray(questionsRef.current);

    // 2. Select a unique mix of 15 questions per participant from the pool of 30
    const targetCount = Math.min(QUIZ_QUESTIONS_PER_SESSION || 15, shuffledAll.length);
    const selectedQuestions = shuffledAll.slice(0, targetCount);

    // 3. For each of the 15 questions, shuffle its 4 options so answers are never in a fixed position (A, B, C, D randomized)
    const sessionList: SessionQuestion[] = selectedQuestions.map((q) => {
      const originalIndices: [number, number, number, number] = [0, 1, 2, 3];
      const shuffledIndices = shuffleArray(originalIndices) as [number, number, number, number];
      const shuffledOptions = shuffledIndices.map((origIdx) => q.options[origIdx]) as [string, string, string, string];
      const correctAnswerIndexInShuffled = shuffledIndices.indexOf(q.correctAnswerIndex);

      return {
        id: q.id,
        question: q.question,
        category: q.category,
        shuffledOptions,
        shuffledToOriginalIndexMap: shuffledIndices,
        correctAnswerIndexInShuffled
      };
    });

    setSessionQuestions(sessionList);
    sessionQuestionsRef.current = sessionList;

    setSecondsElapsed(0);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setAntiCheatNotice(null);
    quizStartedAtRef.current = Date.now();
    lastSkipTimeRef.current = Date.now();
    setStep('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOption = (sessionQ: SessionQuestion, optIndex: number) => {
    // Map shuffled option index back to original question option index for consistent score verification
    const originalOptionIndex = sessionQ.shuffledToOriginalIndexMap[optIndex];
    setAnswers((prev) => ({
      ...prev,
      [sessionQ.id]: originalOptionIndex
    }));
  };

  const handleClearAnswer = (questionId: number) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  // Calculate score locally for fallback
  const calculateLocalScore = (currentAnswers: Record<number, number>): number => {
    let score = 0;
    const sessionList = sessionQuestionsRef.current;
    for (const sessionQ of sessionList) {
      const origQ = questionsRef.current.find((q) => q.id === sessionQ.id);
      if (origQ && currentAnswers[sessionQ.id] !== undefined && currentAnswers[sessionQ.id] === origQ.correctAnswerIndex) {
        score += 1;
      }
    }
    return score;
  };

  const handleSubmitQuiz = async () => {
    if (isSubmittingRef.current) return;
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    const currentAnswers = { ...answersRef.current };
    const score = calculateLocalScore(currentAnswers);
    const timeSpent = secondsElapsedRef.current;
    const currentForm = { ...formRef.current };
    const totalSessionQuestions = sessionQuestionsRef.current.length || QUIZ_QUESTIONS_PER_SESSION || 15;

    setSubmitError(null);

    const submissionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const submissionPayload: QuizSubmission = {
      id: submissionId,
      participant_name: currentForm.participantName.trim(),
      student_name: currentForm.studentName.trim(),
      student_class: currentForm.studentClass.trim(),
      phone_number: currentForm.phoneNumber.trim(),
      place: currentForm.place.trim(),
      score,
      total_questions: totalSessionQuestions,
      time_taken_seconds: timeSpent,
      answers: currentAnswers,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // 1. ALWAYS persist locally first so submission is guaranteed recorded
    saveLocalSubmission(submissionPayload);

    let savedRemote = false;

    try {
      // 2. First attempt to submit via Express Backend API
      try {
        const apiResponse = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_name: submissionPayload.participant_name,
            student_name: submissionPayload.student_name,
            student_class: submissionPayload.student_class,
            phone_number: submissionPayload.phone_number,
            place: submissionPayload.place,
            answers: submissionPayload.answers,
            time_taken_seconds: submissionPayload.time_taken_seconds,
            total_questions: submissionPayload.total_questions
          })
        });

        if (apiResponse.ok) {
          savedRemote = true;
        }
      } catch (networkErr) {
        // network error
      }

      // 3. Direct Supabase insert if backend API did not handle it
      if (!savedRemote) {
        try {
          const { error: sbError } = await supabase.from('quiz_submissions').insert(submissionPayload);
          if (!sbError) {
            savedRemote = true;
          } else {
            console.warn('[Quiz] Supabase insert warning (persisted locally):', sbError);
          }
        } catch (sbEx) {
          console.warn('[Quiz] Supabase insert exception (persisted locally):', sbEx);
        }
      }

      // Always advance to Thank You screen
      setConfirmSubmitModalOpen(false);
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[Quiz] Submission error:', err);
      // Even if network failed, local submission is preserved!
      setConfirmSubmitModalOpen(false);
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Manual Next Button (Strict forward-only)
  const handleProceedNext = () => {
    const totalCount = sessionQuestions.length || questions.length;
    if (currentQuestionIndex < totalCount - 1) {
      setQuestionSecondsLeft(QUESTION_TIME_LIMIT_SECONDS);
      setCurrentQuestionIndex((prev) => prev + 1);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } else {
      setConfirmSubmitModalOpen(true);
    }
  };

  // Anti-Cheat: Auto-skip question if user leaves the tab, unfocuses, or uses split-screen
  const handleAutoSkipQuestion = (reason: 'unfocus' | 'tab_switch') => {
    if (stepRef.current !== 'active' || isSubmittingRef.current) return;

    // Grace period: ignore during first 2.5 seconds of starting
    if (Date.now() - quizStartedAtRef.current < 2500) return;

    // Cooldown: prevent multiple triggers from blur + visibilitychange within 2 seconds
    if (Date.now() - lastSkipTimeRef.current < 2000) return;
    lastSkipTimeRef.current = Date.now();

    const currIdx = currentQuestionIndexRef.current;
    const qNum = currIdx + 1;
    const totalCount = sessionQuestionsRef.current.length || questionsRef.current.length;

    if (currIdx < totalCount - 1) {
      setQuestionSecondsLeft(QUESTION_TIME_LIMIT_SECONDS);
      setCurrentQuestionIndex(currIdx + 1);
      const noticeText =
        reason === 'unfocus'
          ? `Screen unfocus / split-screen switch detected! Question ${qNum} was automatically skipped to ensure fair competition.`
          : `Browser tab switch / minimize detected! Question ${qNum} was automatically skipped to ensure fair competition.`;

      setAntiCheatNotice(noticeText);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => {
        setAntiCheatNotice(null);
      }, 5500);
    } else {
      // User left on the very last question -> Auto finish quiz
      setAntiCheatNotice('Quiz auto-submitted because you navigated away on the final question.');
      handleSubmitQuiz();
    }
  };

  // Anti-Cheat Listeners Effect
  useEffect(() => {
    if (step !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleAutoSkipQuestion('tab_switch');
      }
    };

    const handleWindowBlur = () => {
      // Split screen tap on other app, or clicking outside browser
      handleAutoSkipQuestion('unfocus');
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step]);

  const activeQuestionsList: (SessionQuestion | QuizQuestion)[] = sessionQuestions.length > 0 ? sessionQuestions : questions;
  const answeredCount = Object.keys(answers).length;
  const currentQuestion = activeQuestionsList[currentQuestionIndex];
  const isCurrentQuestionAnswered =
    currentQuestion && answers[currentQuestion.id] !== undefined;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Quiz Top Header */}
      <header className="bg-slate-950/90 backdrop-blur-md border-b border-purple-900/40 sticky top-0 z-30 px-3 sm:px-4 py-2.5 sm:py-3 w-full max-w-full overflow-hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 w-full">
          <Link to="/" className="flex items-center gap-1.5 text-white hover:text-purple-300 transition shrink-0">
            <Home className="w-4 h-4 text-purple-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">AHSAS</span>
          </Link>

          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <h1 className="text-xs sm:text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-200 to-amber-300 truncate">
              EDU FAMILIA — Online Quiz
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {step === 'active' && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] sm:text-xs font-bold font-mono shadow-sm">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{formatTime(secondsElapsed)}</span>
              </div>
            )}
            <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-purple-600 text-white uppercase tracking-wider whitespace-nowrap">
              AL SUFFA
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 overflow-x-hidden box-border">
        {/* ===================================================================
            QUIZ CLOSED / EXPIRED WINDOW VIEW
        =================================================================== */}
        {step === 'intro' && isQuizClosed() && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-b from-purple-950/90 via-slate-950 to-slate-950 rounded-3xl p-8 sm:p-10 border border-purple-500/40 shadow-2xl text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-rose-950/80 border-2 border-rose-500 text-rose-400 mx-auto flex items-center justify-center shadow-2xl shadow-rose-500/20 mb-6">
                <Lock className="w-10 h-10" />
              </div>

              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-block mb-3">
                Registration Closed
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Quiz Window Closed
              </h2>

              <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-lg mx-auto leading-relaxed">
                The active window for the <strong>Edu Familia Online Quiz Competition</strong> was open for 24 hours (Sunday, 08 Nov 12:00 AM to Monday, 09 Nov 12:00 AM) and has now officially closed. Submissions are no longer accepted.
              </p>

              <div className="mt-8 p-6 rounded-2xl bg-purple-900/30 border border-purple-500/30 max-w-md mx-auto text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Organized By</span>
                <p className="text-sm font-extrabold text-white">
                  AHSAS • Class Unit Al Suffa (C3)
                </p>
                <p className="text-xs text-purple-200">
                  Darussalam Tharqiya Edu Village, Koyilandy, Calicut
                </p>
                <div className="pt-2 text-xs text-emerald-300 font-semibold">
                  Official evaluation and winner announcements are underway.
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition shadow-xl shadow-amber-400/25"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Home Portal</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 1: INTRO / REGISTRATION FORM
        =================================================================== */}
        {step === 'intro' && !isQuizClosed() && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Brand Logo & Event Info (Upgraded High-Impact Card) */}
            <div className="lg:col-span-5 bg-gradient-to-b from-purple-950/90 via-slate-950 to-slate-950 rounded-3xl p-6 sm:p-8 border border-purple-500/40 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Upgraded Logo Showcase */}
              <div className="w-full flex justify-center mb-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-purple-900/30 to-slate-900/90 border border-purple-500/30 shadow-xl relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-400 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition duration-500 pointer-events-none" />
                <img
                  src="/assets/edu_familia_logo.png"
                  alt="Edu Familia Official Logo"
                  className="w-full max-w-[280px] sm:max-w-[320px] h-auto object-contain drop-shadow-[0_12px_24px_rgba(255,255,255,0.3)] filter brightness-110"
                />
              </div>

              <div className="space-y-3 w-full text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400/10 border border-amber-400/30 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sunday, 08 Nov 2026 • Parents' Meet Special</span>
                </div>

                <h2 className="text-xl font-black text-white leading-tight">
                  Edu Familia Online Quiz Competition
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Organized by AHSAS Class Unit <strong>Al Suffa (C3)</strong> at Darussalam Tharqiya Edu Village for parents and guardians.
                </p>

                {/* Strict Rules Badges */}
                <div className="pt-3 border-t border-purple-900/40 text-xs text-slate-300 space-y-2.5">
                  <div className="flex items-start gap-2.5 text-purple-300 font-bold bg-purple-500/10 p-3 rounded-xl border border-purple-500/30">
                    <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>30 Seconds Per Question:</strong> Each question automatically advances after 30 seconds. Unanswered questions will be recorded as skipped.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-amber-300 font-bold bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Strict Forward-Only:</strong> Once you click Next or skip a question, you CANNOT go back to revisit or re-answer it.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-rose-300 font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Anti-Cheat Protection:</strong> Do not switch browser tabs, minimize, or use split-screen apps. Leaving or unfocusing the quiz screen will automatically skip the active question!
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Total <strong>{questions.length} Questions</strong> (30 seconds each)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Open from Sunday 12:00 AM to Monday 12:00 AM (24 Hours)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Participant Details Form */}
            <div className="lg:col-span-7 bg-slate-950/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-purple-500/20 shadow-2xl">
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Step 1 of 2</span>
                <h3 className="text-2xl font-black text-white mt-1">Participant Registration</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Please enter your details below before beginning the quiz.
                </p>
              </div>

              <form onSubmit={handleStartQuiz} className="space-y-4">
                {/* Participant / Parent's Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>Participant / Parent Name <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={form.participantName}
                    onChange={(e) => {
                      setForm({ ...form, participantName: e.target.value });
                      if (formErrors.participantName) setFormErrors({ ...formErrors, participantName: undefined });
                    }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none transition ${
                      formErrors.participantName
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-800 focus:border-purple-500'
                    }`}
                  />
                  {formErrors.participantName && (
                    <p className="text-xs text-rose-400 mt-1 font-medium">{formErrors.participantName}</p>
                  )}
                </div>

                {/* Student's Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Student's Name <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter student's full name"
                    value={form.studentName}
                    onChange={(e) => {
                      setForm({ ...form, studentName: e.target.value });
                      if (formErrors.studentName) setFormErrors({ ...formErrors, studentName: undefined });
                    }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none transition ${
                      formErrors.studentName
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-800 focus:border-purple-500'
                    }`}
                  />
                  {formErrors.studentName && (
                    <p className="text-xs text-rose-400 mt-1 font-medium">{formErrors.studentName}</p>
                  )}
                </div>

                {/* Student's Class / Unit (Optional as requested) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Student's Class / Unit <span className="text-slate-400 font-normal lowercase">(optional)</span></span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Al Suffa (C3), Grade 5, etc. (optional)"
                    value={form.studentClass}
                    onChange={(e) => {
                      setForm({ ...form, studentClass: e.target.value });
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 text-white text-sm focus:outline-none transition"
                  />
                </div>

                {/* Phone / WhatsApp Number */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-purple-400" />
                    <span>Mobile / WhatsApp Number <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={form.phoneNumber}
                    onChange={(e) => {
                      setForm({ ...form, phoneNumber: e.target.value });
                      if (formErrors.phoneNumber) setFormErrors({ ...formErrors, phoneNumber: undefined });
                    }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none transition ${
                      formErrors.phoneNumber
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-800 focus:border-purple-500'
                    }`}
                  />
                  {formErrors.phoneNumber && (
                    <p className="text-xs text-rose-400 mt-1 font-medium">{formErrors.phoneNumber}</p>
                  )}
                </div>

                {/* Place */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>Place / City <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Koyilandy / Calicut"
                    value={form.place}
                    onChange={(e) => {
                      setForm({ ...form, place: e.target.value });
                      if (formErrors.place) setFormErrors({ ...formErrors, place: undefined });
                    }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none transition ${
                      formErrors.place
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-800 focus:border-purple-500'
                    }`}
                  />
                  {formErrors.place && (
                    <p className="text-xs text-rose-400 mt-1 font-medium">{formErrors.place}</p>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl font-black text-gray-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition shadow-xl shadow-amber-400/20 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base cursor-pointer"
                  >
                    <span>START QUIZ NOW</span>
                    <ArrowRight className="w-5 h-5 text-gray-950" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 2: ACTIVE QUIZ VIEW (Strictly Forward-Only with Anti-Cheat)
        =================================================================== */}
        {step === 'active' && currentQuestion && (
          <div className="space-y-6">
            {/* Anti-Cheat Alert Banner (Displays when auto-skip is triggered) */}
            {antiCheatNotice && (
              <div className="p-4 rounded-2xl bg-rose-950/90 border-2 border-rose-500/80 text-rose-200 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-2xl animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="flex-grow leading-relaxed">{antiCheatNotice}</span>
              </div>
            )}

            {/* Top Status & Progress Bar */}
            <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-purple-500/20 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm font-semibold mb-3">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="px-3 py-1 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold">
                    Question {currentQuestionIndex + 1} of {activeQuestionsList.length}
                  </span>
                  <span className="text-slate-400 text-xs">
                    ({answeredCount} of {activeQuestionsList.length} Answered)
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{formatTime(secondsElapsed)}</span>
                  </div>

                  <button
                    onClick={() => setConfirmSubmitModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-gray-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition shadow-md cursor-pointer whitespace-nowrap"
                  >
                    Finish Quiz ({answeredCount}/{activeQuestionsList.length})
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(answeredCount / activeQuestionsList.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-slate-950/90 rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl space-y-6">
              <div className="flex items-center justify-between gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-900/50 text-purple-300 border border-purple-700/50">
                  {currentQuestion.category}
                </span>

                {isCurrentQuestionAnswered && (
                  <button
                    onClick={() => handleClearAnswer(currentQuestion.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Answer</span>
                  </button>
                )}
              </div>

              {/* Prominent 30-Second Question Timer */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      questionSecondsLeft <= 5
                        ? 'bg-rose-500 animate-ping'
                        : questionSecondsLeft <= 10
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`} />
                    <span className="text-slate-300 text-[11px] sm:text-xs">
                      Time for this question (30s limit):
                    </span>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs font-black font-mono flex items-center gap-1.5 transition ${
                    questionSecondsLeft <= 5
                      ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-pulse shadow-md shadow-rose-900/50'
                      : questionSecondsLeft <= 10
                      ? 'bg-amber-950 text-amber-300 border border-amber-500'
                      : 'bg-purple-950 text-purple-200 border border-purple-500/50'
                  }`}>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{questionSecondsLeft.toString().padStart(2, '0')}s / 30s</span>
                  </div>
                </div>

                {/* Shrinking 30-Second Progress Bar */}
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                      questionSecondsLeft <= 5
                        ? 'bg-gradient-to-r from-rose-500 to-red-600'
                        : questionSecondsLeft <= 10
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400'
                    }`}
                    style={{ width: `${(questionSecondsLeft / QUESTION_TIME_LIMIT_SECONDS) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed">
                  <span className="text-amber-400 mr-2">{currentQuestionIndex + 1}.</span>
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Options Grid (Randomized order per user and per question) */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                {('shuffledOptions' in currentQuestion
                  ? currentQuestion.shuffledOptions
                  : currentQuestion.options
                ).map((optionText, optIndex) => {
                  const isSelected =
                    'shuffledToOriginalIndexMap' in currentQuestion
                      ? answers[currentQuestion.id] !== undefined &&
                        currentQuestion.shuffledToOriginalIndexMap[optIndex] === answers[currentQuestion.id]
                      : answers[currentQuestion.id] === optIndex;

                  const optionLetters = ['A', 'B', 'C', 'D'];

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() =>
                        'shuffledToOriginalIndexMap' in currentQuestion
                          ? handleSelectOption(currentQuestion as SessionQuestion, optIndex)
                          : setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optIndex }))
                      }
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-900/80 to-purple-800/80 border-purple-400 text-white shadow-lg shadow-purple-900/40 ring-1 ring-purple-400 transform scale-[1.01]'
                          : 'bg-slate-900/70 border-slate-800 hover:border-purple-600/60 hover:bg-slate-900 text-slate-200'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition ${
                          isSelected
                            ? 'bg-amber-400 text-gray-950 shadow-md font-black'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {optionLetters[optIndex]}
                      </span>
                      <span className="text-sm sm:text-base font-semibold leading-relaxed flex-grow">
                        {optionText}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Navigation (Strictly Forward-Only — No Previous Button) */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Left indicator replacing Previous button */}
                <div className="flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Forward-Only Mode (Past questions locked)</span>
                  <span className="sm:hidden">Forward-Only Mode (Locked)</span>
                </div>

                {/* Right Action: Next or Finish */}
                {currentQuestionIndex < activeQuestionsList.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleProceedNext}
                    className={`w-full sm:w-auto justify-center px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg cursor-pointer ${
                      isCurrentQuestionAnswered
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <span>{isCurrentQuestionAnswered ? 'Next Question' : 'Skip & Next'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSubmitModalOpen(true)}
                    className="w-full sm:w-auto justify-center px-6 py-3 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-gray-950 transition flex items-center gap-2 shadow-xl shadow-amber-400/20 cursor-pointer"
                  >
                    <span>Finish Quiz</span>
                    <Send className="w-4 h-4 text-gray-950" />
                  </button>
                )}
              </div>
            </div>

            {/* Compact Current Question Indicator (Clean, Lightweight & Mobile-Friendly) */}
            <div className="bg-slate-950/70 rounded-2xl p-3.5 sm:p-4 border border-purple-500/20 shadow-md flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 text-gray-950 font-black flex items-center justify-center text-xs shadow-md shadow-amber-400/20 shrink-0">
                  {currentQuestionIndex + 1}
                </span>
                <div className="min-w-0">
                  <span className="text-white font-extrabold text-xs sm:text-sm block truncate">
                    Question {currentQuestionIndex + 1} of {activeQuestionsList.length}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {answeredCount} answered • {activeQuestionsList.length - (currentQuestionIndex + 1)} remaining
                  </span>
                </div>
              </div>

              {/* Progress Dots for the 15 questions */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-hidden">
                {activeQuestionsList.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentQuestionIndex
                        ? 'w-4 sm:w-5 bg-amber-400 ring-2 ring-amber-400/30'
                        : idx < currentQuestionIndex
                        ? 'w-1.5 sm:w-2 bg-emerald-500'
                        : 'w-1 sm:w-1.5 bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 3: COMPLETION / THANK YOU VIEW (Score Hidden as Requested)
        =================================================================== */}
        {step === 'result' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-b from-purple-950/90 via-slate-950 to-slate-950 rounded-3xl p-8 sm:p-10 border border-purple-500/40 shadow-2xl text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 text-gray-950 mx-auto flex items-center justify-center shadow-2xl shadow-emerald-400/30 mb-6 animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-emerald-950" />
              </div>

              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block mb-3">
                Quiz Submitted Successfully
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Thank You!
              </h2>

              <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
                <strong className="text-white">{form.participantName}</strong>, thank you for participating in the <strong>Edu Familia Online Quiz Competition</strong>.
              </p>

              {/* Secure Confirmation Card (Score hidden as requested) */}
              <div className="mt-8 p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-purple-900/40 via-slate-900/80 to-purple-900/30 border border-purple-500/30 max-w-md mx-auto text-center space-y-3 shadow-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Responses Securely Recorded</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your submissions have been successfully recorded in the evaluation system.
                </p>

                <div className="mt-3 p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold leading-relaxed">
                  📢 <strong>Note:</strong> Official results, top performers, and winner announcements will be published soon by the organizers.
                </div>
              </div>

              {/* Participant Details Summary */}
              <div className="mt-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 max-w-md mx-auto text-left space-y-1.5">
                <p><strong>Participant:</strong> {form.participantName}</p>
                <p>
                  <strong>Student:</strong> {form.studentName}
                  {form.studentClass ? ` (${form.studentClass})` : ''}
                </p>
                <p><strong>Mobile:</strong> {form.phoneNumber}</p>
                <p><strong>Place:</strong> {form.place}</p>
                <p><strong>Organizer:</strong> Al Suffa (C3) • Darussalam Tharqiya</p>
              </div>

              <div className="mt-8 flex justify-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition shadow-xl shadow-amber-400/25 transform hover:-translate-y-0.5"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Home Portal</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal before Final Submission */}
      {confirmSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-purple-900/50 border border-purple-500/50 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-white">Ready to Finish the Quiz?</h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              You have answered <strong className="text-amber-400">{answeredCount}</strong> of{' '}
              <strong className="text-white">{questions.length}</strong> questions.
              {answeredCount < questions.length && (
                <span className="block text-amber-300 font-semibold mt-1">
                  Note: {questions.length - answeredCount} unanswered questions will be marked as skipped.
                </span>
              )}
            </p>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmSubmitModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitQuiz}
                className="flex-1 py-3 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-gray-950 transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Error Modal */}
      {submitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-white">Submission Could Not Be Saved</h3>

            <p className="text-xs sm:text-sm text-rose-200 leading-relaxed bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
              {submitError}
            </p>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitQuiz}
                className="flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-400 to-yellow-400 text-gray-950 hover:from-amber-300 hover:to-yellow-300 transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Retrying...' : 'Retry Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Footer */}
      <footer className="bg-slate-950/80 border-t border-purple-900/30 py-4 px-4 text-center text-xs text-slate-500">
        <p>
          Edu Familia Online Quiz Competition • Anwarul Huda Students' Association (AHSAS) • Al Suffa (C3)
        </p>
      </footer>
    </div>
  );
}
