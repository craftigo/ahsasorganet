import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Ticket,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Lock,
  Phone,
  MessageSquare,
  User,
  Home,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EduDayPoster } from '../components/events/EduDayPoster';

interface FormState {
  fullName: string;
  place: string;
  instituteWorkplace: string;
  phoneNumber: string;
  whatsappNumber: string;
  sameAsPhone: boolean;
  tajweedKithabs: string;
}

const initialFormState: FormState = {
  fullName: '',
  place: '',
  instituteWorkplace: '',
  phoneNumber: '',
  whatsappNumber: '',
  sameAsPhone: false,
  tajweedKithabs: ''
};

export default function EduDayRegisterPage(): JSX.Element {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment UI state
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showDesktopUpiModal, setShowDesktopUpiModal] = useState(false);

  // File States
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Success State
  const [submittedRefNo, setSubmittedRefNo] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState<string>('');

  const paymentInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Max file size: 5MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const validatePhone = (phone: string): boolean => {
    // Allows 7 to 15 digits with optional leading +, spaces, or hyphens
    const clean = phone.replace(/[\s\-()]/g, '');
    return /^\+?[0-9]{7,15}$/.test(clean);
  };

  const handleInputChange = (field: keyof FormState, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'phoneNumber' && prev.sameAsPhone) {
        next.whatsappNumber = value;
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSameAsPhoneToggle = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      sameAsPhone: checked,
      whatsappNumber: checked ? prev.phoneNumber : prev.whatsappNumber
    }));
    if (errors.whatsappNumber) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.whatsappNumber;
        return updated;
      });
    }
  };

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    navigator.clipboard.writeText('alimuhammed0203@oksbi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDesktopUpiModal(false);
        setShowResetConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Generate NPCI-compliant universal UPI payment URL with exact amount (₹313.00)
  const getUpiUrl = () => {
    const payeeVpa = 'alimuhammed0203@oksbi';
    const payeeName = 'HAFIZ MUHAMMADALI THARQAWI';
    const amount = '313.00';
    const note = form.fullName.trim()
      ? `EDU DAY - ${form.fullName.trim().slice(0, 15)}`
      : 'EDU DAY Fee';

    return `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  const handleLaunchUpi = (e?: React.MouseEvent) => {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768 && 'ontouchstart' in window);

    if (!isMobile) {
      if (e) e.preventDefault();
      setShowDesktopUpiModal(true);
    }
  };

  // Payment Screenshot Selection
  const handlePaymentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        paymentFile: 'Unsupported format. Please upload JPEG, PNG, or WebP.'
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        paymentFile: 'File exceeds 5MB limit. Please select a smaller image.'
      }));
      return;
    }

    setPaymentFile(file);
    setPaymentPreview(URL.createObjectURL(file));
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.paymentFile;
      return updated;
    });
  };

  // Photo Selection
  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        photoFile: 'Unsupported format. Please upload JPEG, PNG, or WebP.'
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        photoFile: 'Photo exceeds 5MB limit. Please select a smaller image.'
      }));
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.photoFile;
      return updated;
    });
  };

  // Reset confirmation
  const handleConfirmReset = () => {
    setForm(initialFormState);
    setPaymentFile(null);
    setPaymentPreview(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrors({});
    setServerError(null);
    setShowResetConfirm(false);
    if (paymentInputRef.current) paymentInputRef.current.value = '';
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name is required (minimum 2 characters).';
    } else if (form.fullName.trim().length > 100) {
      newErrors.fullName = 'Full Name is too long (maximum 100 characters).';
    }

    if (!form.place.trim() || form.place.trim().length < 2) {
      newErrors.place = 'Place / Locality is required.';
    }

    if (!form.instituteWorkplace.trim() || form.instituteWorkplace.trim().length < 2) {
      newErrors.instituteWorkplace = 'Institute of Study / Workplace is required.';
    }

    if (!form.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required.';
    } else if (!validatePhone(form.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number (at least 7 digits).';
    }

    if (!form.whatsappNumber.trim()) {
      newErrors.whatsappNumber = 'WhatsApp number is required.';
    } else if (!validatePhone(form.whatsappNumber)) {
      newErrors.whatsappNumber = 'Please enter a valid WhatsApp number (at least 7 digits).';
    }

    if (form.tajweedKithabs.trim().length > 1000) {
      newErrors.tajweedKithabs = 'Tajweed Kithabs description must not exceed 1000 characters.';
    }

    if (!paymentFile) {
      newErrors.paymentFile = 'Fee Payment Screenshot is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Upload helper using rate-limited server-signed upload workflow
  const uploadToStorage = async (file: File, category: 'payment-proof' | 'applicant-photo'): Promise<string> => {
    // 1. Request short-lived signed upload URL and unpredictable server-generated path
    const prepResponse = await fetch('/api/edu-day/prepare-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size
      })
    });

    const prepResult = await prepResponse.json();

    if (!prepResponse.ok) {
      throw new Error(prepResult.error || 'Failed to prepare secure upload with the server.');
    }

    if (!prepResult.path || !prepResult.token) {
      throw new Error('Upload preparation did not return authorization credentials.');
    }

    // 2. Upload file binary directly to Supabase Storage using the signed token
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('edu-day-registration-files')
      .uploadToSignedUrl(prepResult.path, prepResult.token, file);

    if (uploadError) {
      throw new Error(`Secure storage upload failed: ${uploadError.message}`);
    }

    // Return the bucket-relative object path (stripping any accidental bucket prefix)
    const storedPath = uploadData?.path || prepResult.path;
    return storedPath.replace(/^edu-day-registration-files\//, '');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      // Scroll to first error
      window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('Preparing secure payment upload...');

    try {
      // 1. Upload payment screenshot via signed URL (MANDATORY)
      setUploadProgress('Uploading payment verification screenshot...');
      let paymentUrl = '';
      try {
        paymentUrl = await uploadToStorage(paymentFile!, 'payment-proof');
      } catch (uploadErr: any) {
        throw new Error(`Payment screenshot upload failed: ${uploadErr.message}`);
      }

      if (!paymentUrl) {
        throw new Error('Payment screenshot upload failed: No authorized storage path was received.');
      }

      // 2. Upload optional photo if provided via signed URL (OPTIONAL)
      let photoUrl: string | null = null;
      if (photoFile) {
        setUploadProgress('Uploading applicant photograph...');
        try {
          photoUrl = await uploadToStorage(photoFile, 'applicant-photo');
        } catch (uploadErr: any) {
          throw new Error(`Applicant photo upload failed: ${uploadErr.message}`);
        }
        if (!photoUrl) {
          throw new Error('Applicant photo upload failed: No authorized storage path was received.');
        }
      }

      // 3. Post to backend registration API
      setUploadProgress('Recording registration details...');
      const response = await fetch('/api/edu-day/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          place: form.place.trim(),
          institute_workplace: form.instituteWorkplace.trim(),
          phone_number: form.phoneNumber.trim(),
          whatsapp_number: form.whatsappNumber.trim(),
          tajweed_kithabs: form.tajweedKithabs.trim(),
          payment_screenshot_url: paymentUrl,
          applicant_photo_url: photoUrl
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Server rejected registration submission.');
      }

      // 4. Success State - ONLY on verified server response
      const verifiedRefNo = result.referenceNo || result.registration?.reference_no;
      if (!verifiedRefNo) {
        throw new Error('Registration was not confirmed by the database.');
      }

      setSubmittedRefNo(verifiedRefNo);
      setSubmittedName(form.fullName.trim());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Registration failed:', err);
      setServerError(err.message || 'An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  // =========================================================================
  // SUCCESS CONFIRMATION VIEW (Phase 8)
  // =========================================================================
  if (submittedRefNo) {
    return (
      <div className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden text-center">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-navy text-white p-8 sm:p-10 relative">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-xs border border-white/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full inline-block mb-2">
              Registration Recorded
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              Registration Submitted Successfully
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-2 max-w-md mx-auto">
              Your application for the <strong>JAZRIYYA ONE DAY WORKSHOP</strong> has been received by the organizing committee.
            </p>
          </div>

          {/* Reference Number Card */}
          <div className="p-8 sm:p-10 space-y-6">
            <div className="bg-amber-500/10 border-2 border-amber-400/50 rounded-2xl p-6 text-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                Official Reference Number
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-maroon mt-1 tracking-wider">
                {submittedRefNo}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Applicant: <strong className="text-gray-900">{submittedName}</strong>
              </p>
              <p className="text-[11px] text-amber-800 font-medium mt-1">
                Please take a screenshot or note this reference number for check-in verification on event day.
              </p>
            </div>

            {/* Official WhatsApp Group Join Card */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50/80 to-teal-500/10 border-2 border-emerald-500/40 rounded-2xl p-6 text-center shadow-xs">
              <div className="w-12 h-12 bg-[#25D366] text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                വർക്ക്‌ഷോപ്പ് വാട്സാപ്പ് ഗ്രൂപ്പിൽ ജോയിൻ ചെയ്യുക
              </h3>
              <p className="text-xs font-bold text-emerald-800 mt-0.5">
                Join the Official Workshop WhatsApp Group
              </p>
              <p className="text-xs text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
                വർക്ക്‌ഷോപ്പുമായി ബന്ധപ്പെട്ട പ്രധാന അറിയിപ്പുകൾ, പഠന കുറിപ്പുകൾ, ഷെഡ്യൂൾ വിവരങ്ങൾ എന്നിവ ലഭിക്കുന്നതിനായി താഴെ നൽകിയിരിക്കുന്ന ബട്ടൺ ക്ലിക്ക് ചെയ്ത് വാട്സാപ്പ് ഗ്രൂപ്പിൽ ജോയിൻ ചെയ്യുക.
              </p>
              <div className="mt-4">
                <a
                  href="https://chat.whatsapp.com/JssfLwYkPNuC2Fx01cw326?s=cl&p=a&mlu=4&ilr=4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-white text-sm sm:text-base bg-[#25D366] hover:bg-[#20ba59] active:scale-98 transition shadow-md hover:shadow-lg w-full sm:w-auto"
                >
                  <MessageSquare className="w-5 h-5 fill-current" />
                  <span>JOIN WHATSAPP GROUP</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Event Summary */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 text-left space-y-3 text-xs sm:text-sm">
              <div className="font-bold text-gray-900 pb-2 border-b border-gray-200 flex items-center justify-between">
                <span>EDU DAY — JAZRIYYA ONE DAY WORKSHOP</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Status: Submitted
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-maroon flex-shrink-0" />
                <span><strong>Date:</strong> 29 October 2026</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 text-maroon flex-shrink-0" />
                <span><strong>Time:</strong> 9:00 AM – 5:00 PM</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-maroon flex-shrink-0" />
                <span><strong>Venue:</strong> Darussalam Tharqiya Edu Village</span>
              </div>
              <div className="flex items-start gap-2 text-gray-600">
                <Building2 className="w-4 h-4 text-maroon flex-shrink-0 mt-0.5" />
                <div>
                  <span><strong>Organizers:</strong> Al Bayan Qur’an Academy &amp; AHSAS</span>
                  <p className="text-xs text-gray-500">A chapter of IRThIQA’</p>
                  <p className="text-xs text-gray-500">Alumni of Darussalam Tharqiya Edu Village</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 italic">
              Verification Note: Payment proof is subject to administrative verification prior to final seat badge issuance.
            </p>

            {/* Navigation Actions */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-maroon hover:bg-maroon-dark transition shadow-md"
              >
                <Home className="w-4 h-4" />
                <span>RETURN TO HOMEPAGE</span>
              </Link>

              <Link
                to="/edu-day"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition"
              >
                <span>VIEW EVENT DETAILS</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN REGISTRATION FORM VIEW
  // =========================================================================
  return (
    <div className="flex-grow bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/edu-day"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-maroon transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Event Details
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Anniversary Registration
          </span>
        </div>

        {/* Poster & Official Header Banner */}
        <div className="bg-gradient-to-br from-gray-950 via-[#1a1426] to-navy rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-amber-500/20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-3">
              <span className="text-xs font-black tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> COLLEGE ANNIVERSARY SPECIAL
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none text-white">
                EDU DAY
              </h1>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-300 tracking-wide">
                JAZRIYYA ONE DAY WORKSHOP
              </div>
              <div className="text-sm font-black tracking-widest text-gray-300 uppercase pt-1">
                REGISTRATION FORM
              </div>

              {/* Event Metadata Badges */}
              <div className="grid grid-cols-2 gap-2 pt-4 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Date</span>
                  <p className="font-bold text-white">29 October 2026</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Time</span>
                  <p className="font-bold text-white">9:00 AM – 5:00 PM</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 col-span-2">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Venue</span>
                  <p className="font-bold text-white">Darussalam Tharqiya Edu Village</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-300 uppercase font-semibold block">Organizers</span>
                    <p className="font-bold text-white text-xs">Al Bayan Qur’an Academy &amp; AHSAS</p>
                    <p className="text-[10px] text-amber-200/80">A chapter of IRThIQA’</p>
                    <p className="text-[10px] text-gray-400">Alumni of Darussalam Tharqiya Edu Village</p>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="text-[10px] text-amber-300 uppercase font-semibold block">Reg Fee</span>
                    <span className="text-base font-black text-amber-300">₹313</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 flex justify-center">
              <div className="w-full max-w-xs">
                <EduDayPoster showCaption={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Server / Validation Error Alert */}
        {serverError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Submission Error</p>
              <p className="text-xs text-red-700 mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        {/* Registration Form Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-6 sm:px-10 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">Applicant Details</h2>
              <p className="text-xs text-gray-500">Please provide accurate information for verification and attendance.</p>
            </div>
            <span className="text-xs font-semibold text-gray-400">* Required fields</span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-6">
            
            {/* Field 1: Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  maxLength={100}
                  value={form.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your official full name"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                    errors.fullName
                      ? 'border-red-400 bg-red-50/30 focus:ring-red-400'
                      : 'border-gray-300 focus:border-maroon focus:ring-maroon/20'
                  }`}
                />
              </div>
              {errors.fullName && <p className="text-xs text-red-600 mt-1 font-medium">{errors.fullName}</p>}
            </div>

            {/* Field 2 & 3: Place & Institute / Workplace */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Field 2: Place */}
              <div>
                <label htmlFor="place" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Place <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="place"
                    type="text"
                    required
                    maxLength={100}
                    value={form.place}
                    onChange={(e) => handleInputChange('place', e.target.value)}
                    placeholder="e.g. Kozhikode, Malappuram..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                      errors.place
                        ? 'border-red-400 bg-red-50/30 focus:ring-red-400'
                        : 'border-gray-300 focus:border-maroon focus:ring-maroon/20'
                    }`}
                  />
                </div>
                {errors.place && <p className="text-xs text-red-600 mt-1 font-medium">{errors.place}</p>}
              </div>

              {/* Field 3: Institute / Workplace */}
              <div>
                <label htmlFor="instituteWorkplace" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Institute of Study / Workplace <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="instituteWorkplace"
                    type="text"
                    required
                    maxLength={150}
                    value={form.instituteWorkplace}
                    onChange={(e) => handleInputChange('instituteWorkplace', e.target.value)}
                    placeholder="College, Dars, or Workplace name"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                      errors.instituteWorkplace
                        ? 'border-red-400 bg-red-50/30 focus:ring-red-400'
                        : 'border-gray-300 focus:border-maroon focus:ring-maroon/20'
                    }`}
                  />
                </div>
                {errors.instituteWorkplace && <p className="text-xs text-red-600 mt-1 font-medium">{errors.instituteWorkplace}</p>}
              </div>
            </div>

            {/* Field 4 & 5: Phone Number & WhatsApp Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Field 4: Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    required
                    value={form.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
                      errors.phoneNumber
                        ? 'border-red-400 bg-red-50/30 focus:ring-red-400'
                        : 'border-gray-300 focus:border-maroon focus:ring-maroon/20'
                    }`}
                  />
                </div>
                {errors.phoneNumber && <p className="text-xs text-red-600 mt-1 font-medium">{errors.phoneNumber}</p>}
              </div>

              {/* Field 5: WhatsApp Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="whatsappNumber" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sameAsPhone}
                      onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                      className="rounded text-maroon focus:ring-maroon w-3.5 h-3.5"
                    />
                    <span>Same as Phone</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    id="whatsappNumber"
                    type="tel"
                    required
                    disabled={form.sameAsPhone}
                    value={form.whatsappNumber}
                    onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 disabled:bg-gray-100 ${
                      errors.whatsappNumber
                        ? 'border-red-400 bg-red-50/30 focus:ring-red-400'
                        : 'border-gray-300 focus:border-maroon focus:ring-maroon/20'
                    }`}
                  />
                </div>
                {errors.whatsappNumber && <p className="text-xs text-red-600 mt-1 font-medium">{errors.whatsappNumber}</p>}
              </div>
            </div>

            {/* Field 6: Tajweed Kithabs Studied (Optional) */}
            <div>
              <label htmlFor="tajweedKithabs" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Which Tajweed Kithabs Have You Studied? <span className="text-gray-400 font-normal normal-case text-[11px]">(Optional)</span>
              </label>
              <div className="relative">
                <textarea
                  id="tajweedKithabs"
                  rows={3}
                  value={form.tajweedKithabs}
                  onChange={(e) => handleInputChange('tajweedKithabs', e.target.value)}
                  placeholder="Optional: Mention any Tajweed Kithabs you have studied (or leave blank if none)..."
                  className={`w-full p-3.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 resize-y ${
                    errors.tajweedKithabs
                      ? 'border-red-400 bg-red-50/30 focus:ring-red-400'
                      : 'border-gray-300 focus:border-maroon focus:ring-maroon/20'
                  }`}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Optional. You can list titles you have studied (e.g. Al-Jazariyyah, Tuhfat al-Atfal, etc.) or leave this blank.
              </p>
              {errors.tajweedKithabs && <p className="text-xs text-red-600 mt-1 font-medium">{errors.tajweedKithabs}</p>}
            </div>

            {/* Step 2: Payment Details & QR Code Section */}
            <div className="pt-6 border-t border-gray-100">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-emerald-500/10 rounded-3xl border border-amber-200/90 shadow-sm p-6 sm:p-8 mb-8 overflow-hidden relative">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 sm:gap-8">
                  
                  {/* Left: Official Payment QR Code */}
                  <div className="flex flex-col items-center flex-shrink-0 w-full md:w-auto">
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-amber-200/80 max-w-[240px] text-center">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 mb-2 flex items-center justify-center gap-1.5">
                        <QrCode className="w-4 h-4 text-amber-600" />
                        <span>Official Payment QR</span>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-inner p-1">
                        <img
                          src="/assets/edu_day_payment_qr.jpg"
                          alt="EDU DAY Payment QR Code - Hafiz Muhammadali Tharqawi"
                          className="w-48 h-auto object-contain mx-auto rounded-lg"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500 block mt-2.5">
                        Scan with any UPI App
                      </span>
                    </div>
                  </div>

                  {/* Right: Payment Details & Direct Actions */}
                  <div className="flex-1 space-y-4 w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-600 text-white shadow-sm flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Step 2: Pay Workshop Fee</span>
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Registration Fee</span>
                        <span className="text-2xl sm:text-3xl font-black text-amber-700">₹313</span>
                      </div>
                    </div>

                    {/* Beneficiary Name */}
                    <div className="p-3.5 bg-white/95 rounded-2xl border border-amber-200/70 shadow-xs">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                        Account / Beneficiary Name
                      </span>
                      <div className="font-extrabold text-sm sm:text-base text-gray-900 leading-snug">
                        HAFIZ MUHAMMADALI THARQAWI DARIMI HAJIYARPALLI
                      </div>
                    </div>

                    {/* UPI ID & Copy Action */}
                    <div className="p-3.5 bg-white/95 rounded-2xl border border-amber-200/70 shadow-xs flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-0.5">
                          Official UPI ID
                        </span>
                        <div className="font-mono font-black text-base text-amber-900 tracking-wide select-all">
                          alimuhammed0203@oksbi
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm flex-shrink-0 cursor-pointer ${
                          copiedUpi
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-900 hover:bg-black text-white'
                        }`}
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy UPI ID</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Direct UPI Payment Button (Single Universal UPI Button) */}
                    <div className="space-y-2 pt-1">
                      <a
                        href={getUpiUrl()}
                        onClick={handleLaunchUpi}
                        className="flex items-center justify-center gap-2.5 w-full py-3.5 sm:py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl text-sm sm:text-base font-extrabold shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] group cursor-pointer text-center"
                      >
                        <Zap className="w-5 h-5 text-amber-300 fill-amber-300 group-hover:scale-125 transition-transform flex-shrink-0" />
                        <span>Pay ₹313 via UPI</span>
                        <ExternalLink className="w-4 h-4 opacity-80 flex-shrink-0" />
                      </a>
                      <p className="text-[11px] text-gray-500 text-center font-medium">
                        Clicking this button will open your phone's UPI app directly with amount (₹313.00) pre-filled.
                      </p>
                    </div>

                    {/* Instructions List */}
                    <div className="bg-amber-100/70 rounded-xl p-3 text-xs text-amber-950 space-y-1 border border-amber-200/60">
                      <p className="font-bold text-[11px] uppercase tracking-wide text-amber-900">
                        How to complete payment:
                      </p>
                      <p className="text-[11px] text-gray-700">
                        1. Tap <strong>Pay ₹313 via UPI</strong> (or scan the QR code).
                      </p>
                      <p className="text-[11px] text-gray-700">
                        2. Complete payment in your UPI app and take a screenshot showing the <strong>Transaction ID / UTR</strong>.
                      </p>
                      <p className="text-[11px] text-gray-700">
                        3. Upload that screenshot in Step 3 below to complete your registration.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-black text-gray-900 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-maroon" /> Step 3: Upload Proof &amp; Complete Registration
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Uploaded documents are securely processed for registration validation and will not be displayed in public directories.
              </p>

              {/* Uploads Grid: Field 7 & Field 8 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Field 7: Fee Payment Screenshot (Required) */}
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Fee Payment Screenshot <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      Fee: ₹313
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Please upload the screenshot of your fee payment.
                  </p>

                  <input
                    ref={paymentInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePaymentFileSelect}
                  />

                  {paymentPreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-gray-300 bg-black max-h-48 flex items-center justify-center">
                        <img
                          src={paymentPreview}
                          alt="Fee payment preview"
                          className="max-h-48 w-auto object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate max-w-[180px] font-mono">
                          {paymentFile?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => paymentInputRef.current?.click()}
                          className="text-xs font-bold text-maroon hover:underline"
                        >
                          Replace Screenshot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => paymentInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 hover:border-maroon rounded-xl p-6 text-center transition group bg-white"
                    >
                      <Upload className="w-8 h-8 text-gray-400 group-hover:text-maroon mx-auto mb-2 transition" />
                      <span className="text-xs font-bold text-gray-700 block">
                        Select Payment Screenshot
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        JPEG, PNG, or WebP (Max 5MB)
                      </span>
                    </button>
                  )}
                  {errors.paymentFile && <p className="text-xs text-red-600 mt-2 font-medium">{errors.paymentFile}</p>}
                </div>

                {/* Field 8: Applicant Photo (Optional) */}
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Upload Your Photo <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-gray-400">
                      ID / Records
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload a clear photo of yourself for official administrative verification.
                  </p>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoFileSelect}
                  />

                  {photoPreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-gray-300 bg-black max-h-48 flex items-center justify-center">
                        <img
                          src={photoPreview}
                          alt="Applicant photo preview"
                          className="max-h-48 w-auto object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate max-w-[180px] font-mono">
                          {photoFile?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="text-xs font-bold text-maroon hover:underline"
                        >
                          Replace Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 hover:border-maroon rounded-xl p-6 text-center transition group bg-white"
                    >
                      <User className="w-8 h-8 text-gray-400 group-hover:text-maroon mx-auto mb-2 transition" />
                      <span className="text-xs font-bold text-gray-700 block">
                        Select Applicant Photo
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        JPEG, PNG, or WebP (Max 5MB)
                      </span>
                    </button>
                  )}
                  {errors.photoFile && <p className="text-xs text-red-600 mt-2 font-medium">{errors.photoFile}</p>}
                </div>

              </div>
            </div>

            {/* Upload Progress Indicator */}
            {uploadProgress && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>{uploadProgress}</span>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET FORM</span>
              </button>

              <button
                type="submit"
                id="submit-registration-btn"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-maroon via-maroon-dark to-navy hover:from-maroon-dark hover:to-navy text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-maroon/20 transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>SUBMITTING REGISTRATION...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>SUBMIT REGISTRATION</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">Reset Registration Form?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to clear all entered details and uploaded screenshots? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700"
              >
                Yes, Reset Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop / Laptop UPI Guidance Modal */}
      {showDesktopUpiModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
          onClick={() => setShowDesktopUpiModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 text-center space-y-4 relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prominent High-Contrast Close Button */}
            <button
              type="button"
              onClick={() => setShowDesktopUpiModal(false)}
              className="absolute right-4 top-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 flex items-center justify-center transition shadow-xs z-10 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900">Scan QR Code to Pay ₹313</h3>
              <p className="text-xs text-gray-500 mt-1">
                You are currently on a computer. Scan this official QR code using any UPI app on your phone:
              </p>
            </div>

            {/* QR Code in Modal */}
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 inline-block mx-auto shadow-inner">
              <img
                src="/assets/edu_day_payment_qr.jpg"
                alt="Payment QR"
                className="w-48 h-auto object-contain mx-auto rounded-xl shadow-xs"
              />
              <div className="mt-2.5 text-xs font-black text-amber-900 flex items-center justify-center gap-1">
                <span>Amount:</span>
                <span className="text-base text-amber-700">₹313.00</span>
                <span className="text-[10px] text-gray-500 font-normal">(Fixed Fee)</span>
              </div>
            </div>

            {/* Account Details in Modal */}
            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-[10px] uppercase font-bold">UPI ID:</span>
                <span className="font-mono font-bold text-gray-900 select-all">alimuhammed0203@oksbi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-[10px] uppercase font-bold">Payee Name:</span>
                <span className="font-semibold text-gray-800 text-[11px] truncate max-w-[210px]">
                  HAFIZ MUHAMMADALI THARQAWI
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyUpi}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                  copiedUpi ? 'bg-emerald-600 text-white' : 'bg-gray-900 hover:bg-black text-white'
                }`}
              >
                {copiedUpi ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUpi ? 'UPI ID Copied to Clipboard!' : 'Copy UPI ID'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDesktopUpiModal(false)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              >
                Close Window
              </button>

              <a
                href={getUpiUrl()}
                className="text-[11px] font-semibold text-amber-700 hover:underline block pt-1"
              >
                Have a UPI-compatible desktop app? Click here to launch UPI link
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
