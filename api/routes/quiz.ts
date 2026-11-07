import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabaseServer';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { QUIZ_QUESTIONS, isQuizClosed } from '../../shared/data/quizQuestions';

export const quizRouter = Router();

/**
 * Public Quiz Submission
 * POST /api/quiz/submit
 */
quizRouter.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if quiz time window has closed
    if (isQuizClosed()) {
      res.status(403).json({
        error: 'Registration is closed. The Edu Familia Quiz Competition active window has ended.'
      });
      return;
    }
    const {
      participant_name,
      student_name,
      student_class,
      phone_number,
      place,
      answers,
      time_taken_seconds
    } = req.body;

    // Validation
    const errors: string[] = [];
    if (!participant_name || typeof participant_name !== 'string' || !participant_name.trim()) {
      errors.push('Participant/Parent name is required.');
    }
    if (!student_name || typeof student_name !== 'string' || !student_name.trim()) {
      errors.push('Student name is required.');
    }
    // student_class is optional as requested
    const sanitizedStudentClass = typeof student_class === 'string' && student_class.trim() ? student_class.trim() : '';
    if (!phone_number || typeof phone_number !== 'string' || phone_number.replace(/\D/g, '').length < 7) {
      errors.push('A valid contact/WhatsApp phone number is required.');
    }
    if (!place || typeof place !== 'string' || !place.trim()) {
      errors.push('Place/City is required.');
    }

    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(' ') });
      return;
    }

    // Load dynamic questions from database if available, fallback to defaults
    let activeQuestions = QUIZ_QUESTIONS;
    try {
      const { data: dbQuestions, error: dbErr } = await supabaseServer
        .from('quiz_questions')
        .select('*')
        .order('id', { ascending: true });

      if (!dbErr && dbQuestions && dbQuestions.length > 0) {
        activeQuestions = dbQuestions.map((item: any) => ({
          id: item.id,
          question: item.question,
          options: item.options,
          correctAnswerIndex: item.correct_answer_index ?? item.correctAnswerIndex ?? 0,
          category: item.category || 'General'
        }));
      }
    } catch (dbEx) {
      console.warn('[Quiz API] Using default QUIZ_QUESTIONS:', dbEx);
    }

    // Compute score securely server-side
    const sanitizedAnswers = typeof answers === 'object' && answers !== null ? answers : {};
    let computedScore = 0;

    for (const q of activeQuestions) {
      const chosen = sanitizedAnswers[q.id];
      if (chosen !== undefined && Number(chosen) === q.correctAnswerIndex) {
        computedScore += 1;
      }
    }

    const payload = {
      participant_name: participant_name.trim(),
      student_name: student_name.trim(),
      student_class: sanitizedStudentClass,
      phone_number: phone_number.trim(),
      place: place.trim(),
      score: computedScore,
      total_questions: activeQuestions.length,
      time_taken_seconds: Number(time_taken_seconds) || 0,
      answers: sanitizedAnswers,
      submitted_at: new Date().toISOString()
    };

    const { data, error } = await supabaseServer
      .from('quiz_submissions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[Quiz API] Database insert error:', error);
      res.status(500).json({
        error: 'Failed to record quiz submission in database. ' + (error.message || '')
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully!',
      score: computedScore,
      total_questions: activeQuestions.length,
      time_taken_seconds: payload.time_taken_seconds,
      submission: data
    });
  } catch (err: any) {
    console.error('[Quiz API] Submit exception:', err);
    res.status(500).json({ error: 'Server error while submitting quiz: ' + (err.message || 'Unknown error') });
  }
});

/**
 * Admin: Get all quiz submissions
 * GET /api/quiz/admin/submissions
 */
quizRouter.get('/admin/submissions', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let query = supabaseServer
      .from('quiz_submissions')
      .select('*')
      .order('score', { ascending: false })
      .order('time_taken_seconds', { ascending: true })
      .order('submitted_at', { ascending: true });

    if (search) {
      query = query.or(
        `participant_name.ilike.%${search}%,student_name.ilike.%${search}%,phone_number.ilike.%${search}%,place.ilike.%${search}%,student_class.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Quiz API] Fetch error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    const submissions = data || [];

    // Calculate Summary Metrics
    const totalCount = submissions.length;
    const avgScore = totalCount > 0 ? (submissions.reduce((acc, cur) => acc + (cur.score || 0), 0) / totalCount).toFixed(1) : '0';
    const topScore = totalCount > 0 ? Math.max(...submissions.map((s) => s.score || 0)) : 0;

    res.json({
      success: true,
      submissions,
      summary: {
        total: totalCount,
        averageScore: Number(avgScore),
        highestScore: topScore,
        totalQuestions: QUIZ_QUESTIONS.length
      }
    });
  } catch (err: any) {
    console.error('[Quiz API] Admin fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch quiz submissions: ' + (err.message || '') });
  }
});

/**
 * Admin: Delete a submission
 * DELETE /api/quiz/admin/submissions/:id
 */
quizRouter.delete('/admin/submissions/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Submission ID is required.' });
      return;
    }

    const { error } = await supabaseServer
      .from('quiz_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Submission successfully deleted.'
    });
  } catch (err: any) {
    console.error('[Quiz API] Admin delete error:', err);
    res.status(500).json({ error: 'Failed to delete submission: ' + (err.message || '') });
  }
});

