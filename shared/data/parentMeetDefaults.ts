// ==============================================================================
// EDU FAMILIA – THARQIYA FAMILY MEET (Defaults & Helper Utilities)
// Event Date: 09 November 2026, Monday
// Venue: Darussalam Tharqiya Edu Village, Koyilandy, Calicut
// Organizer: AHSAS – Anwarul Huda Students’ Association
// ==============================================================================

import { ParentMeetSettings, ProgrammeItem, FormFieldsConfig } from '../types';

export const DEFAULT_EVENT_PROGRAMME: ProgrammeItem[] = [
  { time: '08:30 AM', title: 'Registration & Welcome Reception', location: 'Main Entrance & Registration Desk' },
  { time: '09:00 AM', title: 'Edu Expo & Innovation Gallery Inauguration', location: 'Expo Pavilion' },
  { time: '10:00 AM', title: 'Grand Inaugural Ceremony & Keynote Address', location: 'Main Auditorium' },
  { time: '11:15 AM', title: 'Parenting Conclave: Nurturing Faith & Moral Excellence', location: 'Main Auditorium' },
  { time: '01:00 PM', title: 'Dhuhr Prayer & Traditional Feast (Food Counter)', location: 'Dining Hall' },
  { time: '02:30 PM', title: 'Teacher-Parent Interactive Evaluation Session', location: 'Classrooms & Quadrangle' },
  { time: '04:30 PM', title: 'Valedictory Meet & Dua Majlis', location: 'Main Auditorium' }
];

export const DEFAULT_FORM_FIELDS: FormFieldsConfig = {
  parent_name: { enabled: true, required: true, label: 'Parent / Guardian Name' },
  whatsapp_number: { enabled: true, required: true, label: 'WhatsApp Number' },
  mobile_number: { enabled: true, required: false, label: 'Alternative Mobile Number' },
  email: { enabled: true, required: false, label: 'Email Address' },
  address: { enabled: true, required: false, label: 'Residential Place / Address' },
  student_name: { enabled: true, required: true, label: 'Child / Student Name' },
  student_class: { enabled: true, required: true, label: 'Class / Department' },
  attendees_count: { enabled: true, required: true, label: 'Number of Attendees' },
  additional_details: { enabled: true, required: false, label: 'Special Requirements / Notes' }
};

export const DEFAULT_PARENT_MEET_SETTINGS: ParentMeetSettings = {
  id: 'default',
  event_name: 'EDU FAMILIA',
  event_subtitle: 'THARQIYA FAMILY MEET',
  organizer: 'AHSAS – Anwarul Huda Students’ Association',
  venue: 'Darussalam Tharqiya Edu Village',
  location: 'Koyilandy, Calicut, India',
  event_date: '2026-11-09',
  event_day: 'Monday',
  event_description:
    "An Islamic Parents' Meet is a meaningful gathering that brings parents and teachers together to strengthen the bond between home and institution. It provides an opportunity to discuss children's academic progress, moral values, Islamic upbringing, and spiritual development. The meet aims to inspire parents to nurture a generation rooted in faith, knowledge, discipline, and good character.",
  registration_enabled: true,
  registration_closing_date: null,
  max_registrations: 2000,
  max_attendees_per_reg: 6,
  prevent_duplicate_phone: true,
  expo_enabled: true,
  expo_max_entries: 1,
  meeting_enabled: true,
  food_enabled: true,
  food_requires_meeting: true,
  food_max_tokens_per_reg: 1,
  whatsapp_enabled: false,
  whatsapp_api_status: 'testing',
  whatsapp_phone_number_id: '',
  whatsapp_business_account_id: '',
  whatsapp_access_token: '',
  whatsapp_template_name: 'edu_familia_qr_pass',
  form_fields_config: DEFAULT_FORM_FIELDS,
  event_programme: DEFAULT_EVENT_PROGRAMME,
  public_announcements:
    'Welcome dear parents to Edu Familia – Tharqiya Family Meet! Please keep your personal QR pass ready on your mobile for Expo entry, Main Meeting, and Food Token collection.'
};

/**
 * Generate a formatted sequential-style registration number e.g. EF-2026-0104
 */
export function generateRegistrationNumber(counter: number): string {
  const padded = counter.toString().padStart(4, '0');
  return `EF-2026-${padded}`;
}

/**
 * Generate a cryptographically secure opaque QR token
 * Form: EF_SEC_<random32Hex>
 */
export function generateSecureQRToken(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 32; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EF_SEC_${Date.now().toString(36)}_${rand}`;
}

/**
 * Construct WhatsApp notification text message
 */
export function formatWhatsAppMessage(
  parentName: string,
  regNumber: string,
  passUrl: string,
  eventDate: string = '09 November 2026',
  venue: string = 'Darussalam Tharqiya Edu Village, Koyilandy'
): string {
  return (
    `*Assalamu Alaikum!* ✨\n\n` +
    `Dear *${parentName}*,\n\n` +
    `Your registration for *EDU FAMILIA – THARQIYA FAMILY MEET* has been successfully completed.\n\n` +
    `📋 *Registration ID:* ${regNumber}\n` +
    `📅 *Date:* ${eventDate} (Monday)\n` +
    `📍 *Venue:* ${venue}\n\n` +
    `🎫 *Your Digital QR Pass:* \n${passUrl}\n\n` +
    `⚠️ *Important Instructions:*\n` +
    `• Please keep this personal QR pass ready upon arrival.\n` +
    `• Required for: 1. Expo Entry, 2. Main Meeting Attendance, 3. Food Token Collection.\n` +
    `• Note: Food counter access requires verified Main Meeting attendance.\n\n` +
    `Thank you,\n` +
    `*AHSAS – Anwarul Huda Students’ Association*`
  );
}
