import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseServer } from '../lib/supabaseServer';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { EduDayRegistrationInput, EduDayRegistrationStatus } from '../../shared/types';

export const eduDayRouter = Router();

// In-memory rate limiting maps separated by operation type (uploads vs registrations)
const uploadRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const registerRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isLocalOrDevelopment(ip: string): boolean {
  if (process.env.NODE_ENV !== 'production' || process.env.IS_TEST === 'true') {
    return true;
  }
  const cleanIp = ip.replace(/^.*:/, ''); // normalize IPv4-mapped IPv6 (::ffff:127.0.0.1 -> 127.0.0.1)
  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === 'localhost' ||
    cleanIp === '1' ||
    ip === '::1' ||
    ip === 'unknown'
  );
}

function checkRateLimit(ip: string, type: 'upload' | 'register' = 'upload'): boolean {
  if (isLocalOrDevelopment(ip)) {
    return true; // Bypass rate limiting during local development and testing
  }

  const map = type === 'upload' ? uploadRateLimitMap : registerRateLimitMap;
  const maxAttempts = type === 'upload' ? 60 : 30; // 60 uploads or 30 registrations per 10 minutes per IP
  const now = Date.now();
  const entry = map.get(ip);

  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Step 1 of Secure Upload Workflow: Request a short-lived signed upload URL.
 * Enforces rate limiting, MIME type validation, and generates unpredictable object paths.
 * POST /api/edu-day/prepare-upload
 */
eduDayRouter.post('/prepare-upload', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp, 'upload')) {
    res.status(429).json({
      error: 'Too many upload attempts. Please wait a few minutes before trying again.'
    });
    return;
  }

  const { category, file_name, mime_type, file_size } = req.body;

  if (!category || !['payment-proof', 'applicant-photo'].includes(category)) {
    res.status(400).json({ error: 'Invalid file category. Must be payment-proof or applicant-photo.' });
    return;
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!mime_type || !allowedMimes.includes(mime_type)) {
    res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP images are permitted.' });
    return;
  }

  const ext = (file_name?.split('.').pop() || 'jpg').toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
  if (!allowedExts.includes(ext)) {
    res.status(400).json({ error: 'Invalid file extension.' });
    return;
  }

  // Enforce server-side file size limit (5MB)
  if (file_size !== undefined && file_size !== null) {
    if (typeof file_size !== 'number' || isNaN(file_size) || file_size <= 0) {
      res.status(400).json({ error: 'Invalid file size provided.' });
      return;
    }
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file_size > MAX_FILE_SIZE) {
      res.status(400).json({ error: 'File size exceeds maximum allowed limit of 5MB.' });
      return;
    }
  }

  // Generate cryptographically unpredictable object path
  const randomHex = crypto.randomBytes(12).toString('hex');
  const folder = category === 'payment-proof' ? 'payment-proofs' : 'applicant-photos';
  const prefix = category === 'payment-proof' ? 'proof' : 'photo';
  const objectPath = `edu-day/${folder}/${prefix}_${Date.now()}_${randomHex}.${ext}`;

  try {
    const { data, error } = await supabaseServer.storage
      .from('edu-day-registration-files')
      .createSignedUploadUrl(objectPath);

    if (error) {
      const errMsg = (error.message || '').toLowerCase();
      const statusCode = (error as any).statusCode || (error as any).status;

      // Check if bucket does not exist or permissions are missing in Supabase
      if (
        statusCode === '404' ||
        statusCode === 404 ||
        statusCode === '403' ||
        statusCode === 403 ||
        errMsg.includes('not found') ||
        errMsg.includes('nosuchbucket') ||
        errMsg.includes('row-level security') ||
        errMsg.includes('violates') ||
        errMsg.includes('denied')
      ) {
        res.status(503).json({
          error: "Storage bucket 'edu-day-registration-files' has not yet been created or configured in Supabase. Please apply the migration (supabase/migrations/20261016_edu_day_registrations.sql) in your Supabase SQL Editor."
        });
        return;
      }

      console.error('[API] Storage signed URL generation error:', error);
      res.status(500).json({ error: 'Failed to prepare secure upload: ' + error.message });
      return;
    }

    res.json({
      success: true,
      path: objectPath,
      token: data.token,
      signedUrl: data.signedUrl
    });
  } catch (err: any) {
    console.error('[API] Unexpected upload preparation error:', err);
    res.status(500).json({ error: 'An unexpected server error occurred while preparing secure upload.' });
  }
});

/**
 * Public Registration Endpoint for EDU DAY — Jazriyya Workshop
 * POST /api/edu-day/register
 */
eduDayRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp, 'register')) {
    res.status(429).json({
      error: 'Too many registration attempts. Please wait a few minutes before trying again.'
    });
    return;
  }

  const {
    full_name,
    place,
    institute_workplace,
    phone_number,
    whatsapp_number,
    tajweed_kithabs,
    payment_screenshot_url,
    applicant_photo_url
  }: EduDayRegistrationInput = req.body;

  // Validation
  const errors: string[] = [];

  const STORAGE_PAYMENT_REGEX = /^(edu-day-registration-files\/)?edu-day\/payment-proofs\/proof_[0-9]+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i;
  const STORAGE_PHOTO_REGEX = /^(edu-day-registration-files\/)?edu-day\/applicant-photos\/photo_[0-9]+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i;
  const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('Full Name must be at least 2 characters.');
  } else if (full_name.trim().length > 100) {
    errors.push('Full Name must not exceed 100 characters.');
  }

  if (!place || typeof place !== 'string' || place.trim().length < 2) {
    errors.push('Place is required.');
  } else if (place.trim().length > 100) {
    errors.push('Place must not exceed 100 characters.');
  }

  if (!institute_workplace || typeof institute_workplace !== 'string' || institute_workplace.trim().length < 2) {
    errors.push('Institute of Study / Workplace is required.');
  } else if (institute_workplace.trim().length > 150) {
    errors.push('Institute of Study / Workplace must not exceed 150 characters.');
  }

  if (!phone_number || typeof phone_number !== 'string' || !PHONE_REGEX.test(phone_number.trim())) {
    errors.push('A valid Phone Number is required (minimum 7 digits).');
  }

  if (!whatsapp_number || typeof whatsapp_number !== 'string' || !PHONE_REGEX.test(whatsapp_number.trim())) {
    errors.push('A valid WhatsApp Number is required (minimum 7 digits).');
  }

  if (!tajweed_kithabs || typeof tajweed_kithabs !== 'string' || tajweed_kithabs.trim().length < 2) {
    errors.push('Please specify which Tajweed Kithabs you have studied.');
  } else if (tajweed_kithabs.trim().length > 1000) {
    errors.push('Tajweed Kithabs description must not exceed 1000 characters.');
  }

  // Payment Screenshot is required and must match authorized Storage path format
  if (!payment_screenshot_url || typeof payment_screenshot_url !== 'string') {
    errors.push('Fee Payment Screenshot is required.');
  } else if (!STORAGE_PAYMENT_REGEX.test(payment_screenshot_url.trim())) {
    errors.push('Fee Payment Screenshot must be an authorized file path generated by the secure upload workflow.');
  }

  // Applicant Photo is strictly optional:
  // Accept null, undefined, or empty string as valid omitted photo.
  // Validate against STORAGE_PHOTO_REGEX ONLY when a non-empty string is submitted.
  const trimmedPhoto = (typeof applicant_photo_url === 'string' && applicant_photo_url.trim().length > 0)
    ? applicant_photo_url.trim()
    : null;

  if (trimmedPhoto !== null) {
    if (!STORAGE_PHOTO_REGEX.test(trimmedPhoto)) {
      errors.push('Applicant Photo must be an authorized file path generated by the secure upload workflow.');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(' ') });
    return;
  }

  const cleanPaymentPath = payment_screenshot_url.trim().replace(/^edu-day-registration-files\//, '');
  const cleanPhotoPath = trimmedPhoto ? trimmedPhoto.replace(/^edu-day-registration-files\//, '') : null;

  // Generate unique human-readable reference number
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const referenceNo = `EDU-JAZ-2026-${randomSuffix}`;
  const nowIso = new Date().toISOString();

  // Enforce server-managed record: client cannot manipulate status or timestamps
  const registrationRecord = {
    reference_no: referenceNo,
    full_name: full_name.trim(),
    place: place.trim(),
    institute_workplace: institute_workplace.trim(),
    phone_number: phone_number.trim(),
    whatsapp_number: whatsapp_number.trim(),
    tajweed_kithabs: tajweed_kithabs.trim(),
    payment_screenshot_url: cleanPaymentPath,
    applicant_photo_url: cleanPhotoPath,
    status: 'submitted' as const,
    created_at: nowIso,
    updated_at: nowIso
  };

  try {
    const { data, error } = await supabaseServer
      .from('edu_day_registrations')
      .insert([registrationRecord])
      .select()
      .single();

    if (error) {
      // Check if table is missing in Supabase schema cache (pending migration approval)
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('[API] Database table edu_day_registrations does not exist yet. Migration 20261016_edu_day_registrations.sql must be applied in Supabase.');
        res.status(503).json({
          error: 'Database table `edu_day_registrations` has not yet been created in Supabase. Please apply the prepared migration (supabase/migrations/20261016_edu_day_registrations.sql) in your Supabase SQL Editor.'
        });
        return;
      }

      // Check if permission denied (e.g. anonymous client attempting insert because SUPABASE_SERVICE_ROLE_KEY is missing)
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
        console.error('[API] Database permission denied inserting into edu_day_registrations. SUPABASE_SERVICE_ROLE_KEY is likely missing.');
        res.status(503).json({
          error: 'Database permission denied: Registration submission requires SUPABASE_SERVICE_ROLE_KEY to be configured on the server to record registrations.'
        });
        return;
      }

      console.error('[API] Database insertion error:', error);
      res.status(500).json({
        error: 'Failed to record registration in database: ' + (error.message || 'Database error')
      });
      return;
    }

    res.status(201).json({
      success: true,
      referenceNo: data.reference_no,
      registration: data
    });
  } catch (err: any) {
    console.error('[API] Unexpected registration exception:', err);
    res.status(500).json({
      error: 'An unexpected server error occurred while processing registration.'
    });
  }
});

/**
 * Health check endpoint for Edu Day module
 * GET /api/edu-day/status
 */
eduDayRouter.get('/status', async (_req: Request, res: Response) => {
  res.json({
    event: 'EDU DAY ANNIVERSARY',
    workshop: 'JAZRIYYA ONE DAY WORKSHOP',
    date: '2026-10-29',
    venue: 'Darussalam Tharqiya Edu Village',
    fee: 313,
    status: 'active'
  });
});

// ==============================================================================
// ADMIN MANAGEMENT ENDPOINTS (Strictly requires Authentication + Admin Role)
// ==============================================================================

/**
 * List registrations with pagination, search, status filters, sorting, and summary metrics.
 * GET /api/edu-day/admin/registrations
 */
eduDayRouter.get(
  '/admin/registrations',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '10', 10)));
      const search = (req.query.search as string) || '';
      const status = (req.query.status as string) || 'all';
      const sortBy = (req.query.sortBy as string) || 'created_at';
      const sortOrder = (req.query.sortOrder as string) || 'desc';

      // 1. Probe whether the table exists in Supabase schema cache
      const probeRes = await supabaseServer.from('edu_day_registrations').select('id').limit(1);

      // Detect if migration is pending (table not created in Supabase yet)
      if (
        probeRes.error &&
        (probeRes.error.code === 'PGRST205' || probeRes.error.message?.includes('Could not find the table'))
      ) {
        res.json({
          registrations: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          summary: { total: 0, submitted: 0, verified: 0, rejected: 0, attended: 0 },
          configurationPending: true,
          configurationMessage:
            'Database table `edu_day_registrations` has not yet been created in Supabase. Please apply migration 20261016_edu_day_registrations.sql in your Supabase SQL Editor.'
        });
        return;
      }

      if (probeRes.error) {
        throw probeRes.error;
      }

      // 2. Fetch genuine summary statistics across registration statuses
      const [totalCountRes, subCountRes, verCountRes, rejCountRes, attCountRes] = await Promise.all([
        supabaseServer.from('edu_day_registrations').select('*', { count: 'exact', head: true }),
        supabaseServer.from('edu_day_registrations').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabaseServer.from('edu_day_registrations').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
        supabaseServer.from('edu_day_registrations').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabaseServer.from('edu_day_registrations').select('*', { count: 'exact', head: true }).eq('status', 'attended')
      ]);

      const summary = {
        total: totalCountRes.count || 0,
        submitted: subCountRes.count || 0,
        verified: verCountRes.count || 0,
        rejected: rejCountRes.count || 0,
        attended: attCountRes.count || 0
      };

      // 2. Build filtered and paginated query
      let query = supabaseServer.from('edu_day_registrations').select('*', { count: 'exact' });

      // Apply status filter
      if (status && status !== 'all' && ['submitted', 'verified', 'rejected', 'attended'].includes(status)) {
        query = query.eq('status', status);
      }

      // Apply multi-field search filter (sanitized: strip commas to prevent PostgREST syntax issues)
      if (search && search.trim().length > 0) {
        const sanitizedSearch = search.trim().replace(/,/g, ' ');
        query = query.or(
          `full_name.ilike.%${sanitizedSearch}%,reference_no.ilike.%${sanitizedSearch}%,phone_number.ilike.%${sanitizedSearch}%,whatsapp_number.ilike.%${sanitizedSearch}%,institute_workplace.ilike.%${sanitizedSearch}%,place.ilike.%${sanitizedSearch}%`
        );
      }

      // Apply sorting
      const validSortFields = ['created_at', 'full_name', 'reference_no'];
      const fieldToSort = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const isAsc = sortOrder.toLowerCase() === 'asc';
      query = query.order(fieldToSort, { ascending: isAsc });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      const totalFiltered = count || 0;
      const totalPages = Math.ceil(totalFiltered / limit);

      res.json({
        registrations: data || [],
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages
        },
        summary,
        configurationPending: false
      });
    } catch (err: any) {
      console.error('[API] Admin registrations list error:', err);
      res.status(500).json({
        error: 'Failed to fetch registrations: ' + (err.message || 'Server error')
      });
    }
  }
);

/**
 * Retrieve complete details of a single registration
 * GET /api/edu-day/admin/registrations/:id
 */
eduDayRouter.get(
  '/admin/registrations/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Registration ID is required.' });
      return;
    }

    try {
      const { data, error } = await supabaseServer
        .from('edu_day_registrations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(404).json({ error: 'Registration not found.' });
          return;
        }
        throw error;
      }

      res.json({ registration: data });
    } catch (err: any) {
      console.error('[API] Admin registration fetch error:', err);
      res.status(500).json({ error: 'Failed to retrieve registration: ' + (err.message || 'Server error') });
    }
  }
);

/**
 * Generate a short-lived signed download URL for private documents
 * GET /api/edu-day/admin/registrations/:id/files/:fileType
 */
eduDayRouter.get(
  '/admin/registrations/:id/files/:fileType',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id, fileType } = req.params;

    if (!['payment-proof', 'applicant-photo'].includes(fileType)) {
      res.status(400).json({ error: 'Invalid file type. Must be payment-proof or applicant-photo.' });
      return;
    }

    try {
      const { data: reg, error: regError } = await supabaseServer
        .from('edu_day_registrations')
        .select('id, reference_no, payment_screenshot_url, applicant_photo_url')
        .eq('id', id)
        .single();

      if (regError || !reg) {
        res.status(404).json({ error: 'Registration record not found.' });
        return;
      }

      const rawPath = fileType === 'payment-proof' ? reg.payment_screenshot_url : reg.applicant_photo_url;

      if (!rawPath) {
        res.status(404).json({
          error:
            fileType === 'applicant-photo'
              ? 'No applicant photo was uploaded for this registration.'
              : 'No payment screenshot is associated with this registration.'
        });
        return;
      }

      // Security check: Verify path strictly belongs to the expected folder structure
      const cleanPath = rawPath.trim().replace(/^edu-day-registration-files\//, '');
      const expectedPrefix = fileType === 'payment-proof' ? 'edu-day/payment-proofs/' : 'edu-day/applicant-photos/';

      if (!cleanPath.startsWith(expectedPrefix)) {
        res.status(403).json({ error: 'Access denied: Invalid or untrusted file path pattern.' });
        return;
      }

      // Generate short-lived signed URL (300 seconds = 5 minutes)
      const { data: signedData, error: signedError } = await supabaseServer.storage
        .from('edu-day-registration-files')
        .createSignedUrl(cleanPath, 300);

      if (signedError) {
        const errMsg = (signedError.message || '').toLowerCase();
        if (errMsg.includes('not found') || errMsg.includes('bucket')) {
          res.status(503).json({
            error: 'Storage bucket `edu-day-registration-files` has not yet been created in Supabase.'
          });
          return;
        }
        throw signedError;
      }

      const fileName = cleanPath.split('/').pop() || `${reg.reference_no}_${fileType}.jpg`;

      res.json({
        success: true,
        signedUrl: signedData.signedUrl,
        expiresIn: 300,
        fileName
      });
    } catch (err: any) {
      console.error('[API] Admin signed URL error:', err);
      res.status(500).json({ error: 'Failed to generate secure file access: ' + (err.message || 'Server error') });
    }
  }
);

/**
 * Update registration verification status
 * PATCH /api/edu-day/admin/registrations/:id/status
 */
eduDayRouter.patch(
  '/admin/registrations/:id/status',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: EduDayRegistrationStatus[] = ['submitted', 'verified', 'rejected', 'attended'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabaseServer
        .from('edu_day_registrations')
        .update({
          status,
          updated_at: nowIso
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(404).json({ error: 'Registration not found.' });
          return;
        }
        throw error;
      }

      res.json({
        success: true,
        registration: data
      });
    } catch (err: any) {
      console.error('[API] Admin status update error:', err);
      res.status(500).json({ error: 'Failed to update status: ' + (err.message || 'Server error') });
    }
  }
);

/**
 * Permanently delete a registration and safely clean up associated private files
 * DELETE /api/edu-day/admin/registrations/:id
 */
eduDayRouter.delete(
  '/admin/registrations/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Registration ID is required.' });
      return;
    }

    try {
      // 1. Fetch record first to identify associated private files
      const { data: reg, error: fetchErr } = await supabaseServer
        .from('edu_day_registrations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !reg) {
        res.status(404).json({ error: 'Registration not found or already deleted.' });
        return;
      }

      // 2. Identify associated files
      const filesToDelete: string[] = [];
      if (reg.payment_screenshot_url) {
        const cleanPayment = reg.payment_screenshot_url.replace(/^edu-day-registration-files\//, '').trim();
        if (cleanPayment.startsWith('edu-day/payment-proofs/')) {
          filesToDelete.push(cleanPayment);
        }
      }

      if (reg.applicant_photo_url) {
        const cleanPhoto = reg.applicant_photo_url.replace(/^edu-day-registration-files\//, '').trim();
        if (cleanPhoto.startsWith('edu-day/applicant-photos/')) {
          filesToDelete.push(cleanPhoto);
        }
      }

      // 3. Delete database record
      const { error: dbDeleteErr } = await supabaseServer
        .from('edu_day_registrations')
        .delete()
        .eq('id', id);

      if (dbDeleteErr) {
        throw dbDeleteErr;
      }

      // 4. Safely clean up associated files in storage
      if (filesToDelete.length > 0) {
        try {
          const { error: storageRemoveErr } = await supabaseServer.storage
            .from('edu-day-registration-files')
            .remove(filesToDelete);

          if (storageRemoveErr) {
            console.warn('[API] Storage file removal warning for deleted registration:', storageRemoveErr);
          }
        } catch (storageException) {
          console.warn('[API] Non-fatal storage exception during deletion cleanup:', storageException);
        }
      }

      res.json({
        success: true,
        message: `Registration ${reg.reference_no} (${reg.full_name}) and associated private files permanently deleted.`
      });
    } catch (err: any) {
      console.error('[API] Admin delete registration error:', err);
      res.status(500).json({ error: 'Failed to delete registration: ' + (err.message || 'Server error') });
    }
  }
);
