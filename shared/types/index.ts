// Shared TypeScript interfaces for AHSAS Portal

export type ReportStatus = 'pending' | 'approved' | 'rejected';
export type MessageSender = 'unit' | 'admin';
export type UnitGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';

export interface Unit {
  id: string;
  user_id: string | null;
  name: string;
  class_name: string | null;
  org_name?: string | null;
  reg_no?: string | null;
  cluster?: string | null;
  zone?: string | null;
  address?: string | null; // Used for committee name in onboarding
  contact_info?: string | null;
  email?: string | null;
  grade: UnitGrade | string;
  total_score: number;
  fund_amount: number;
  total_members: number;
  created_at: string;
}

export interface Report {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  points_awarded: number;
  status: ReportStatus;
  submitted_at: string;
  reviewed_at: string | null;
  units?: Pick<Unit, 'name' | 'grade' | 'class_name'>;
}

export interface Member {
  id: string;
  unit_id: string;
  name: string;
  designation: string;
  created_at: string;
}

export interface Student {
  id: string;
  unit_id: string;
  name: string;
  dob?: string | null;
  father_name?: string | null;
  contact_number?: string | null;
  district?: string | null;
  address?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  created_at: string;
}

export interface UnitMessage {
  id: string;
  unit_id: string;
  message: string;
  sender: MessageSender;
  created_at: string;
  units?: Pick<Unit, 'name'>;
}

export interface GlobalSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  category: string;
  hint?: string;
}

export interface QuizSubmission {
  id: string;
  participant_name: string;
  student_name: string;
  student_class: string;
  phone_number: string;
  place: string;
  score: number;
  total_questions: number;
  time_taken_seconds: number;
  answers: Record<string, number>;
  submitted_at: string;
  created_at?: string;
}

export interface QuizSubmissionInput {
  participant_name: string;
  student_name: string;
  student_class: string;
  phone_number: string;
  place: string;
  answers: Record<string, number>;
  time_taken_seconds: number;
}

// ============================================================================
// EDU FAMILIA – THARQIYA FAMILY MEET (Parent Meet Management Types)
// ============================================================================

export interface FormFieldItem {
  enabled: boolean;
  required: boolean;
  label: string;
}

export type FormFieldsConfig = Record<string, FormFieldItem>;

export interface ProgrammeItem {
  time: string;
  title: string;
  location: string;
}

export interface ParentMeetSettings {
  id: string;
  event_name: string;
  event_subtitle: string;
  organizer: string;
  venue: string;
  location: string;
  event_date: string;
  event_day: string;
  event_description: string;
  registration_enabled: boolean;
  registration_closing_date: string | null;
  max_registrations: number;
  max_attendees_per_reg: number;
  prevent_duplicate_phone: boolean;
  expo_enabled: boolean;
  expo_max_entries: number;
  meeting_enabled: boolean;
  food_enabled: boolean;
  food_requires_meeting: boolean;
  food_max_tokens_per_reg: number;
  whatsapp_enabled: boolean;
  whatsapp_api_status: 'unconfigured' | 'testing' | 'active';
  whatsapp_phone_number_id?: string;
  whatsapp_business_account_id?: string;
  whatsapp_access_token?: string;
  whatsapp_template_name?: string;
  form_fields_config: FormFieldsConfig;
  event_programme: ProgrammeItem[];
  public_announcements: string;
  created_at?: string;
  updated_at?: string;
}

export interface ParentRegistration {
  id: string;
  registration_number: string;
  parent_name: string;
  whatsapp_number: string;
  mobile_number?: string;
  email?: string;
  address?: string;
  student_name: string;
  student_class?: string;
  attendees_count: number;
  additional_details?: string;
  custom_fields?: Record<string, any>;
  qr_token: string;
  qr_token_hash?: string;
  pass_status: 'active' | 'revoked' | 'cancelled';
  whatsapp_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'simulated' | 'not_configured';
  whatsapp_sent_at?: string | null;
  whatsapp_error?: string | null;
  created_at: string;
  updated_at?: string;

  // Joined / computed statuses
  expo_entry?: ExpoEntry | null;
  meeting_attendance?: MeetingAttendance | null;
  food_token?: FoodToken | null;
}

export interface ParentRegistrationInput {
  parent_name: string;
  whatsapp_number: string;
  mobile_number?: string;
  email?: string;
  address?: string;
  student_name: string;
  student_class?: string;
  attendees_count?: number;
  additional_details?: string;
  custom_fields?: Record<string, any>;
}

export interface ExpoEntry {
  id: string;
  registration_id: string;
  entry_timestamp: string;
  scanner_id?: string;
  staff_name?: string;
  notes?: string | null;
}

export interface MeetingAttendance {
  id: string;
  registration_id: string;
  attendance_timestamp: string;
  scanner_id?: string;
  staff_name?: string;
  notes?: string | null;
}

export interface FoodToken {
  id: string;
  registration_id: string;
  status: 'pending_meeting' | 'eligible' | 'redeemed';
  tokens_allocated: number;
  tokens_redeemed: number;
  redeemed_at?: string | null;
  scanner_id?: string | null;
  staff_name?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScannerStation {
  id: string;
  name: string;
  type: 'expo' | 'meeting' | 'food';
  access_key: string;
  is_active: boolean;
  assigned_staff_name?: string;
  total_scans: number;
  last_active_at?: string | null;
  created_at?: string;
}

export interface ScanLog {
  id: string;
  station_type: 'expo' | 'meeting' | 'food';
  station_id?: string;
  registration_id?: string | null;
  qr_token_masked?: string;
  result:
    | 'approved'
    | 'denied'
    | 'already_entered'
    | 'already_attended'
    | 'missing_meeting'
    | 'already_redeemed'
    | 'invalid_qr'
    | 'revoked';
  reason?: string;
  staff_name?: string;
  scanned_at: string;
  parent_name?: string;
  registration_number?: string;
}

export interface AuditLog {
  id: string;
  action:
    | 'override_expo_reset'
    | 'override_attendance_reset'
    | 'override_food_reset'
    | 'qr_regenerated'
    | 'registration_edited'
    | 'registration_deleted'
    | 'rule_change';
  registration_id?: string | null;
  performed_by: string;
  previous_status?: any;
  new_status?: any;
  mandatory_reason: string;
  created_at: string;
}

export interface WhatsAppLog {
  id: string;
  registration_id: string;
  phone_number: string;
  message_type: string;
  provider: string;
  status: 'sent' | 'delivered' | 'failed' | 'simulated';
  provider_response_id?: string | null;
  error_message?: string | null;
  payload_snapshot?: any;
  sent_at: string;
}

export interface ScanVerificationResult {
  success: boolean;
  result_code:
    | 'EXPO_APPROVED'
    | 'EXPO_ALREADY_ENTERED'
    | 'MEETING_APPROVED'
    | 'MEETING_ALREADY_ATTENDED'
    | 'FOOD_APPROVED'
    | 'FOOD_MISSING_MEETING'
    | 'FOOD_ALREADY_REDEEMED'
    | 'INVALID_QR'
    | 'REVOKED_QR'
    | 'REGISTRATION_NOT_FOUND'
    | 'UNAUTHORIZED_SCANNER';
  message: string;
  registration?: {
    id: string;
    registration_number: string;
    parent_name: string;
    student_name: string;
    student_class?: string;
    attendees_count: number;
    whatsapp_number: string;
  };
  details?: {
    original_timestamp?: string;
    scanner_id?: string;
    staff_name?: string;
    tokens_allocated?: number;
    tokens_redeemed?: number;
    expo_status?: boolean;
    meeting_status?: boolean;
    food_status?: string;
  };
}


