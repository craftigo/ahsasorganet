import QRCode from 'qrcode';
import { Resvg } from '@resvg/resvg-js';

export interface CardRenderData {
  registration_number: string;
  parent_name: string;
  student_name: string;
  student_class?: string;
  attendees_count: number;
  qr_token: string;
  event_name?: string;
  event_subtitle?: string;
  event_date?: string;
  event_day?: string;
  venue?: string;
  location?: string;
  expo_entered?: boolean;
  meeting_attended?: boolean;
  food_status?: string;
}

export async function generatePassCardSvg(data: CardRenderData): Promise<string> {
  const passUrl = `https://ahsasorganet.vercel.app/event/pass/${data.qr_token}`;

  // Generate crisp QR code data URL
  const qrDataUrl = await QRCode.toDataURL(passUrl, {
    width: 320,
    margin: 1,
    color: {
      dark: '#0369a1',
      light: '#ffffff'
    }
  });

  const eventName = data.event_name || 'EDU FAMILIA';
  const eventSubtitle = data.event_subtitle || 'THARQIYA FAMILY MEET';
  const eventDate = data.event_date || '09 November 2026';
  const eventDay = data.event_day || 'Monday';
  const venue = data.venue || 'Darussalam Tharqiya Edu Village';
  const location = data.location || 'Koyilandy, Calicut';

  // Checkpoint statuses
  const expoLabel = data.expo_entered ? 'Entry Approved ✓' : 'Not Entered Yet';
  const expoBg = data.expo_entered ? '#dcfce7' : '#f1f5f9';
  const expoColor = data.expo_entered ? '#15803d' : '#64748b';

  const meetLabel = data.meeting_attended ? 'Attendance Recorded ✓' : 'Pending Attendance';
  const meetBg = data.meeting_attended ? '#dcfce7' : '#fef3c7';
  const meetColor = data.meeting_attended ? '#15803d' : '#b45309';

  let foodLabel = 'Locked (Attend Meeting First)';
  let foodBg = '#ffe4e6';
  let foodColor = '#be123c';
  if (data.food_status === 'redeemed') {
    foodLabel = 'Redeemed ✓';
    foodBg = '#dcfce7';
    foodColor = '#15803d';
  } else if (data.meeting_attended || data.food_status === 'eligible') {
    foodLabel = 'Eligible (Ready to Redeem)';
    foodBg = '#e0f2fe';
    foodColor = '#0369a1';
  }

  // XML escape helpers
  const escapeXml = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const parentEsc = escapeXml(data.parent_name);
  const studentEsc = escapeXml(data.student_name);
  const classEsc = escapeXml(data.student_class || 'Standard');
  const regEsc = escapeXml(data.registration_number);
  const venueEsc = escapeXml(`${venue}, ${location}`);

  return `
<svg width="800" height="1140" viewBox="0 0 800 1140" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradients -->
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#075985" />
    </linearGradient>
    <linearGradient id="cardBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-3%" width="110%" height="108%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0369a1" flood-opacity="0.18" />
    </filter>
  </defs>

  <style>
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .font-serif { font-family: "Georgia", "Cambria", "Times New Roman", serif; }
    .font-mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
  </style>

  <!-- Background Canvas -->
  <rect width="800" height="1140" fill="#e0f2fe" />

  <!-- Main Card Container -->
  <rect x="30" y="30" width="740" height="1080" rx="28" fill="url(#cardBgGrad)" stroke="#7dd3fc" stroke-width="3" filter="url(#shadow)" />

  <!-- Top Blue Banner -->
  <path d="M 30 58 Q 30 30 58 30 L 742 30 Q 770 30 770 58 L 770 230 L 30 230 Z" fill="url(#skyGrad)" />

  <!-- Decorative circles in header -->
  <circle cx="100" cy="80" r="60" fill="#ffffff" opacity="0.06" />
  <circle cx="700" cy="180" r="90" fill="#ffffff" opacity="0.05" />

  <!-- Header Branding -->
  <text class="font-sans" x="400" y="70" text-anchor="middle" font-size="13" font-weight="800" fill="#bae6fd" letter-spacing="3.5">
    AHSAS • DARUSSALAM THARQIYA EDU VILLAGE
  </text>
  <text class="font-serif" x="400" y="125" text-anchor="middle" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="1">
    ${escapeXml(eventName)}
  </text>
  <text class="font-sans" x="400" y="162" text-anchor="middle" font-size="16" font-weight="800" fill="#e0f2fe" letter-spacing="3.5">
    ${escapeXml(eventSubtitle)}
  </text>

  <!-- Date Pill -->
  <rect x="250" y="180" width="300" height="34" rx="17" fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5" />
  <text class="font-sans" x="400" y="202" text-anchor="middle" font-size="13" font-weight="700" fill="#ffffff">
    ${escapeXml(eventDate)} • ${escapeXml(eventDay)}
  </text>

  <!-- QR Box Container -->
  <rect x="270" y="255" width="260" height="260" rx="20" fill="#ffffff" stroke="#bae6fd" stroke-width="2.5" />
  <image href="${qrDataUrl}" x="282" y="267" width="236" height="236" />

  <!-- Registration Number Pill -->
  <rect x="290" y="528" width="220" height="36" rx="18" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5" />
  <text class="font-mono" x="400" y="552" text-anchor="middle" font-size="17" font-weight="900" fill="#0369a1" letter-spacing="1.5">
    ${regEsc}
  </text>

  <text class="font-sans" x="400" y="582" text-anchor="middle" font-size="11" font-weight="700" fill="#64748b">
    Single Personal Pass: 1) Expo • 2) Meeting • 3) Food Token • 4) Kiosk Screen
  </text>

  <!-- Divider -->
  <line x1="70" y1="600" x2="730" y2="600" stroke="#e2e8f0" stroke-width="1.5" />

  <!-- Parent & Student Details Section -->
  <g transform="translate(70, 620)">
    <!-- Row 1: Parent -->
    <text class="font-sans" x="0" y="20" font-size="12" font-weight="800" fill="#64748b" letter-spacing="1">PARENT / GUARDIAN:</text>
    <text class="font-sans" x="660" y="20" text-anchor="end" font-size="18" font-weight="800" fill="#0f172a">${parentEsc}</text>
    <line x1="0" y1="35" x2="660" y2="35" stroke="#f1f5f9" stroke-width="1" />

    <!-- Row 2: Student -->
    <text class="font-sans" x="0" y="60" font-size="12" font-weight="800" fill="#64748b" letter-spacing="1">CHILD / STUDENT:</text>
    <text class="font-sans" x="660" y="60" text-anchor="end" font-size="16" font-weight="700" fill="#0f172a">${studentEsc}</text>
    <line x1="0" y1="75" x2="660" y2="75" stroke="#f1f5f9" stroke-width="1" />

    <!-- Row 3: Class & Attendees -->
    <text class="font-sans" x="0" y="100" font-size="12" font-weight="800" fill="#64748b" letter-spacing="1">CLASS / DEPARTMENT:</text>
    <text class="font-sans" x="250" y="100" font-size="14" font-weight="700" fill="#7e22ce">${classEsc}</text>

    <text class="font-sans" x="430" y="100" font-size="12" font-weight="800" fill="#64748b" letter-spacing="1">ATTENDEES:</text>
    <text class="font-sans" x="660" y="100" text-anchor="end" font-size="14" font-weight="800" fill="#047857">${data.attendees_count} Members</text>
    <line x1="0" y1="115" x2="660" y2="115" stroke="#f1f5f9" stroke-width="1" />

    <!-- Row 4: Venue -->
    <text class="font-sans" x="0" y="140" font-size="12" font-weight="800" fill="#64748b" letter-spacing="1">EVENT VENUE:</text>
    <text class="font-sans" x="660" y="140" text-anchor="end" font-size="13" font-weight="600" fill="#334155">${venueEsc}</text>
  </g>

  <!-- Live Activity Checkpoints Card -->
  <g transform="translate(60, 790)">
    <rect x="0" y="0" width="680" height="210" rx="18" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.5" />
    <text class="font-sans" x="24" y="28" font-size="11" font-weight="900" fill="#0369a1" letter-spacing="1.5">
      LIVE ADMISSION &amp; ACTIVITY CHECKPOINTS:
    </text>

    <!-- Checkpoint 1: Expo -->
    <g transform="translate(20, 42)">
      <rect x="0" y="0" width="640" height="42" rx="10" fill="#ffffff" stroke="#e0f2fe" stroke-width="1" />
      <text class="font-sans" x="16" y="26" font-size="13" font-weight="700" fill="#1e293b">1. Edu Expo Entrance</text>
      <rect x="460" y="8" width="165" height="26" rx="13" fill="${expoBg}" />
      <text class="font-sans" x="542" y="25" text-anchor="middle" font-size="11" font-weight="800" fill="${expoColor}">${expoLabel}</text>
    </g>

    <!-- Checkpoint 2: Meeting -->
    <g transform="translate(20, 94)">
      <rect x="0" y="0" width="640" height="42" rx="10" fill="#ffffff" stroke="#e0f2fe" stroke-width="1" />
      <text class="font-sans" x="16" y="26" font-size="13" font-weight="700" fill="#1e293b">2. Main Auditorium Meet</text>
      <rect x="440" y="8" width="185" height="26" rx="13" fill="${meetBg}" />
      <text class="font-sans" x="532" y="25" text-anchor="middle" font-size="11" font-weight="800" fill="${meetColor}">${meetLabel}</text>
    </g>

    <!-- Checkpoint 3: Food -->
    <g transform="translate(20, 146)">
      <rect x="0" y="0" width="640" height="42" rx="10" fill="#ffffff" stroke="#e0f2fe" stroke-width="1" />
      <text class="font-sans" x="16" y="26" font-size="13" font-weight="700" fill="#1e293b">3. Food Token Counter</text>
      <rect x="410" y="8" width="215" height="26" rx="13" fill="${foodBg}" />
      <text class="font-sans" x="517" y="25" text-anchor="middle" font-size="11" font-weight="800" fill="${foodColor}">${foodLabel}</text>
    </g>
  </g>

  <!-- Card Footer -->
  <g transform="translate(400, 1040)">
    <text class="font-sans" x="0" y="0" text-anchor="middle" font-size="11" font-weight="700" fill="#0369a1">
      Official Single Personal Pass • Powered by AHSAS Event Management System
    </text>
    <text class="font-sans" x="0" y="18" text-anchor="middle" font-size="10" font-weight="600" fill="#94a3b8">
      https://ahsasorganet.vercel.app/event/pass/${escapeXml(data.qr_token)}
    </text>
  </g>
</svg>
  `.trim();
}

export async function generatePassCardPng(data: CardRenderData): Promise<Buffer> {
  const svg = await generatePassCardSvg(data);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200 // Crisp 1200 x 1710 portrait high resolution
    }
  });
  const rendered = resvg.render();
  return rendered.asPng();
}
