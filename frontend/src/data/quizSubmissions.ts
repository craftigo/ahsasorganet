import { QuizSubmission } from '@shared/types';

const QUIZ_SUBMISSIONS_STORAGE_KEY = 'ahsas_quiz_submissions_local';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Retrieve all locally saved quiz submissions
 */
export function getLocalSubmissions(): QuizSubmission[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(QUIZ_SUBMISSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Quiz Submissions] Error reading local submissions:', err);
  }
  return [];
}

/**
 * Save or append a quiz submission to localStorage
 */
export function saveLocalSubmission(sub: QuizSubmission): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const existing = getLocalSubmissions();
    // Prevent duplicate entries by id or by (phone + submitted_at)
    const exists = existing.some(
      (item) => item.id === sub.id || (item.phone_number === sub.phone_number && item.submitted_at === sub.submitted_at)
    );

    const updated = exists
      ? existing.map((item) => (item.id === sub.id ? sub : item))
      : [sub, ...existing];

    storage.setItem(QUIZ_SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[Quiz Submissions] Error saving local submission:', err);
  }
}

/**
 * Delete a submission from localStorage by ID
 */
export function deleteLocalSubmission(id: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const existing = getLocalSubmissions();
    const updated = existing.filter((item) => item.id !== id);
    storage.setItem(QUIZ_SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[Quiz Submissions] Error deleting local submission:', err);
  }
}

/**
 * Merge remote Supabase submissions and locally saved submissions without duplicates
 */
export function mergeSubmissions(remote: QuizSubmission[], local: QuizSubmission[]): QuizSubmission[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const merged: QuizSubmission[] = [];

  // Remote entries first (priority)
  for (const item of remote) {
    if (item.id) seenIds.add(item.id);
    const key = `${item.phone_number}_${item.participant_name}_${item.score}`;
    seenKeys.add(key);
    merged.push(item);
  }

  // Add local entries that aren't already present
  for (const item of local) {
    if (item.id && seenIds.has(item.id)) continue;
    const key = `${item.phone_number}_${item.participant_name}_${item.score}`;
    if (seenKeys.has(key)) continue;

    merged.push(item);
  }

  // Sort by score descending, then time ascending
  return merged.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.time_taken_seconds || 0) - (b.time_taken_seconds || 0);
  });
}

