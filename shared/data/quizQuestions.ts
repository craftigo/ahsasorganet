// 30 Official Questions Data for Edu Familia Online Quiz Competition
// Organized by AHSAS • Al Suffa (C3) • Darussalam Tharqiya Edu Village

export const QUESTION_TIME_LIMIT_SECONDS = 30;
export const QUIZ_QUESTIONS_PER_SESSION = 15;

// Active Quiz Window: Sunday 08 Nov 2026 12:00 AM IST to Monday 09 Nov 2026 12:00 AM IST (24 hours)
export const QUIZ_START_TIME_ISO = '2026-11-08T00:00:00+05:30';
export const QUIZ_END_TIME_ISO = '2026-11-09T00:00:00+05:30';

export type QuizWindowMode = 'auto' | 'force_open' | 'force_closed';

function getStorage(): any {
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

export function getQuizWindowOverride(): QuizWindowMode {
  const storage = getStorage();
  if (storage) {
    const val = storage.getItem('ahsas_quiz_window_override') as QuizWindowMode;
    if (val === 'force_open' || val === 'force_closed') return val;
  }
  return 'auto';
}

export function setQuizWindowOverride(mode: QuizWindowMode): void {
  const storage = getStorage();
  if (storage) {
    if (mode === 'auto') {
      storage.removeItem('ahsas_quiz_window_override');
    } else {
      storage.setItem('ahsas_quiz_window_override', mode);
    }
  }
}

export function isQuizOpen(now = Date.now()): boolean {
  const override = getQuizWindowOverride();
  if (override === 'force_open') return true;
  if (override === 'force_closed') return false;

  const start = new Date(QUIZ_START_TIME_ISO).getTime();
  const end = new Date(QUIZ_END_TIME_ISO).getTime();
  return now >= start && now < end;
}

export function isQuizClosed(now = Date.now()): boolean {
  const override = getQuizWindowOverride();
  if (override === 'force_closed') return true;
  if (override === 'force_open') return false;

  const end = new Date(QUIZ_END_TIME_ISO).getTime();
  return now >= end;
}

export function isQuizUpcoming(now = Date.now()): boolean {
  const override = getQuizWindowOverride();
  if (override === 'force_open' || override === 'force_closed') return false;

  const start = new Date(QUIZ_START_TIME_ISO).getTime();
  return now < start;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number; // 0: Option A, 1: Option B, 2: Option C, 3: Option D
  category: string;
  hint?: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // =========================================================================
  // QUIZ – SESSION 1 (Questions 1 to 15)
  // =========================================================================
  {
    id: 1,
    question: "കേരളത്തിലൂടെ ഒഴുകുന്ന ഏറ്റവും നീളം കൂടിയ നദി ഏതാണ്?",
    options: ["ഭാരതപ്പുഴ", "പമ്പ", "ചാലിയാർ", "പെരിയാർ"],
    correctAnswerIndex: 3, // D) പെരിയാർ
    category: "General Knowledge"
  },
  {
    id: 2,
    question: "വിശുദ്ധ ഖുർആനിൽ പേരെടുത്ത് പരാമർശിക്കപ്പെട്ടിട്ടുള്ള ഒരേയൊരു സ്വഹാബി ആര്?",
    options: ["അബൂബക്കർ സിദ്ദീഖ് (റ)", "സൈദ് ബ്നു ഹാരിസ (റ)", "ഉസ്മാൻ ബ്നു അഫ്ഫാൻ (റ)", "ബിലാൽ ബ്നു റബാഹ് (റ)"],
    correctAnswerIndex: 1, // B) സൈദ് ബ്നു ഹാരിസ (റ)
    category: "Holy Quran"
  },
  {
    id: 3,
    question: "സമസ്ത കേരള ഇസ്ലാം മത വിദ്യാഭ്യാസ ബോർഡ് രൂപീകൃതമായ വർഷം ഏത്?",
    options: ["1945", "1951", "1954", "1962"],
    correctAnswerIndex: 1, // B) 1951
    category: "Samastha History"
  },
  {
    id: 4,
    question: "സൂര്യപ്രകാശത്തിൽ നിന്ന് മനുഷ്യശരീരത്തിന് നേരിട്ട് ഉത്പാദിപ്പിക്കാൻ കഴിയുന്ന പ്രധാന വിറ്റാമിൻ ഏതാണ്?",
    options: ["വിറ്റാമിൻ A", "വിറ്റാമിൻ C", "വിറ്റാമിൻ D", "വിറ്റാമിൻ B"],
    correctAnswerIndex: 2, // C) വിറ്റാമിൻ D
    category: "General Science"
  },
  {
    id: 5,
    question: "ഇസ്ലാമിക ചരിത്രത്തിൽ ഒരേയൊരു സ്ത്രീയുടെ പേരിൽ നാമകരണം ചെയ്യപ്പെട്ടിട്ടുള്ള സൂറത്ത് ഏതാണ്?",
    options: ["ആസ്യ", "മർയം", "ഫാത്തിമ", "ഖദീജ"],
    correctAnswerIndex: 1, // B) മർയം
    category: "Holy Quran"
  },
  {
    id: 6,
    question: "സമസ്തയുടെ വിദ്യാർത്ഥി സംഘടനയായ SKSSF രൂപീകരിക്കപ്പെട്ട വർഷം ഏത്?",
    options: ["1985", "1987", "1989", "1991"],
    correctAnswerIndex: 2, // C) 1989
    category: "Samastha History"
  },
  {
    id: 7,
    question: "'കേരളത്തിന്റെ സുഗന്ധവ്യഞ്ജനങ്ങളുടെ കലവറ' എന്നറിയപ്പെടുന്ന ജില്ല ഏതാണ്?",
    options: ["വയനാട്", "ഇടുക്കി", "കോഴിക്കോട്", "കാസർഗോഡ്"],
    correctAnswerIndex: 1, // B) ഇടുക്കി
    category: "Kerala GK"
  },
  {
    id: 8,
    question: "ബദർ യുദ്ധം നടന്നത് ഏത് ഹിജ്റ വർഷത്തിലായിരുന്നു?",
    options: ["ഹിജ്റ 1", "ഹിജ്റ 2", "ഹിജ്റ 3", "ഹിജ്റ 5"],
    correctAnswerIndex: 1, // B) ഹിജ്റ 2
    category: "Islamic History"
  },
  {
    id: 9,
    question: "പട്ടിക്കാട് ജാമിഅ നൂരിയ്യ അറബിയ്യ സ്ഥാപിതമായ വർഷം ഏത്?",
    options: ["1955", "1963", "1970", "1982"],
    correctAnswerIndex: 1, // B) 1963
    category: "Samastha History"
  },
  {
    id: 10,
    question: "മലയാള ഭാഷയുടെ പിതാവ് എന്നറിയപ്പെടുന്നത് ആര്?",
    options: ["കുഞ്ചൻ നമ്പ്യാർ", "ചെറുശ്ശേരി", "തുഞ്ചത്തെഴുത്തച്ഛൻ", "വള്ളത്തോൾ നാരായണമേനോൻ"],
    correctAnswerIndex: 2, // C) തുഞ്ചത്തെഴുത്തച്ഛൻ
    category: "Malayalam Literature"
  },
  {
    id: 11,
    question: "പ്രവാചകൻ മുഹമ്മദ് നബി (സ്വ) യുടെ ജീവിതത്തിലെ അവസാനത്തെ യുദ്ധം ഏതായിരുന്നു?",
    options: ["ഹുനൈൻ യുദ്ധം", "മുഅ്ത യുദ്ധം", "തബൂക്ക് യുദ്ധം", "ഖൻദഖ് യുദ്ധം"],
    correctAnswerIndex: 2, // C) തബൂക്ക് യുദ്ധം
    category: "Prophetic Biography (Seerah)"
  },
  {
    id: 12,
    question: "സമസ്തയുടെ ഔദ്യോഗിക മുഖപത്രമായ 'അൽ ബയാൻ' പ്രസിദ്ധീകരണം ആരംഭിച്ച വർഷം ഏത്?",
    options: ["1926", "1929", "1932", "1948"],
    correctAnswerIndex: 1, // B) 1929
    category: "Samastha History"
  },
  {
    id: 13,
    question: "ഇന്ത്യൻ ഭരണഘടനയുടെ ശിൽപി എന്നറിയപ്പെടുന്നത് ആര്?",
    options: ["ഡോ. ബി.ആർ. അംബേദ്കർ", "ജവഹർലാൽ നെഹ്റു", "ഡോ. രാജേന്ദ്രപ്രസാദ്", "സർദാർ വല്ലഭായ് പട്ടേൽ"],
    correctAnswerIndex: 0, // A) ഡോ. ബി.ആർ. അംബേദ്കർ
    category: "Indian Constitution"
  },
  {
    id: 14,
    question: "1926-ൽ സമസ്തയുടെ രൂപീകരണത്തിൽ പ്രധാന പങ്കുവഹിച്ച പ്രഥമ സെക്രട്ടറി ആരായിരുന്നു?",
    options: ["പി.വി. മുഹമ്മദ് മുസ്ലിയാർ", "പറവണ്ണ മുഹ്യിദ്ദീൻ കുട്ടി മുസ്ലിയാർ", "കെ.വി. മുഹമ്മദ് മുസ്ലിയാർ", "മൗലാനാ അബ്ദുൽ ബാരി മുസ്ലിയാർ"],
    correctAnswerIndex: 0, // A) പി.വി. മുഹമ്മദ് മുസ്ലിയാർ
    category: "Samastha History"
  },
  {
    id: 15,
    question: "വിശുദ്ധ ഖുർആനിൽ ഏറ്റവും കൂടുതൽ തവണ പേരെടുത്ത് പരാമർശിക്കപ്പെട്ടിട്ടുള്ള പ്രവാചകൻ ആര്?",
    options: ["ഇബ്രാഹിം നബി (അ)", "ഈസാ നബി (അ)", "മൂസാ നബി (അ)", "ആദം നബി (അ)"],
    correctAnswerIndex: 2, // C) മൂസാ നബി (അ)
    category: "Prophetic History"
  },

  // =========================================================================
  // QUIZ – SESSION 2 (Questions 16 to 30)
  // =========================================================================
  {
    id: 16,
    question: "ഖൻദഖ് യുദ്ധം നടന്നത് ഏത് ഹിജ്റ വർഷത്തിലാണ്?",
    options: ["ഹിജ്റ 3", "ഹിജ്റ 4", "ഹിജ്റ 5", "ഹിജ്റ 7"],
    correctAnswerIndex: 2, // C) ഹിജ്റ 5
    category: "Islamic History"
  },
  {
    id: 17,
    question: "ഇന്ത്യയുടെ ദേശീയ ജലജീവി ഏതാണ്?",
    options: ["നീലത്തിമിംഗലം", "ഗംഗാ ഡോൾഫിൻ", "കടലാമ", "കട്ട്ല മത്സ്യം"],
    correctAnswerIndex: 1, // B) ഗംഗാ ഡോൾഫിൻ
    category: "National GK"
  },
  {
    id: 18,
    question: "സമസ്തയുടെ വിദ്യാഭ്യാസ ബോർഡിന് കീഴിലുള്ള മുഅല്ലിംകളുടെ ക്ഷേമത്തിനായി പ്രവർത്തിക്കുന്ന സംഘടന ഏതാണ്?",
    options: ["SYS", "SKJMCC", "സമസ്ത കേരള ജംഇയ്യത്തുൽ മുഅല്ലിമീൻ", "SKSSF"],
    correctAnswerIndex: 2, // C) സമസ്ത കേരള ജംഇയ്യത്തുൽ മുഅല്ലിമീൻ
    category: "Samastha History"
  },
  {
    id: 19,
    question: "ഇസ്ലാമിക ചരിത്രത്തിലെ ആദ്യത്തെ രക്തസാക്ഷി ആരാണ്?",
    options: ["ഹംസ (റ)", "യാസിർ (റ)", "സുമയ്യ (റ)", "അമ്മാർ ബ്നു യാസിർ (റ)"],
    correctAnswerIndex: 2, // C) സുമയ്യ (റ)
    category: "Islamic History"
  },
  {
    id: 20,
    question: "ഇന്ത്യയിലെ ആദ്യത്തെ സമ്പൂർണ്ണ ഡിജിറ്റൽ സംസ്ഥാനം ഏതാണ്?",
    options: ["മഹാരാഷ്ട്ര", "കർണാടക", "തമിഴ്നാട്", "കേരളം"],
    correctAnswerIndex: 3, // D) കേരളം
    category: "General Knowledge"
  },
  {
    id: 21,
    question: "സമസ്ത കേരള ഇസ്ലാം മത വിദ്യാഭ്യാസ ബോർഡിന് കീഴിൽ നിലവിൽ ഏകദേശം എത്ര അംഗീകൃത മദ്രസകൾ പ്രവർത്തിക്കുന്നുണ്ട്?",
    options: ["5,000-ത്തിന് മുകളിൽ", "8,000-ത്തിന് മുകളിൽ", "10,000-ത്തിന് മുകളിൽ", "15,000-ത്തിന് മുകളിൽ"],
    correctAnswerIndex: 2, // C) 10,000-ത്തിന് മുകളിൽ
    category: "Samastha Education"
  },
  {
    id: 22,
    question: "കേരളത്തിൽ ആദ്യമായി സമ്പൂർണ്ണ സാക്ഷരത നേടിയ ജില്ല ഏതാണ്?",
    options: ["കോട്ടയം", "എറണാകുളം", "തിരുവനന്തപുരം", "മലപ്പുറം"],
    correctAnswerIndex: 0, // A) കോട്ടയം
    category: "Kerala GK"
  },
  {
    id: 23,
    question: "ഇസ്ലാമിക ചരിത്രത്തിലെ ആദ്യത്തെ വനിതാ കർമ്മശാസ്ത്ര പണ്ഡിതയായി വിശേഷിപ്പിക്കപ്പെടുന്നത് ആരെയാണ്?",
    options: ["ഫാത്തിമ (റ)", "ഖദീജ (റ)", "ആയിശ (റ)", "സുമയ്യ (റ)"],
    correctAnswerIndex: 2, // C) ആയിശ (റ)
    category: "Islamic History"
  },
  {
    id: 24,
    question: "സമസ്ത കേരള ഇസ്ലാം മത വിദ്യാഭ്യാസ ബോർഡിന്റെ ആസ്ഥാന കാര്യാലയം സ്ഥിതി ചെയ്യുന്നത് എവിടെയാണ്?",
    options: ["കോഴിക്കോട് ഫ്രാൻസിസ് റോഡ്", "മലപ്പുറം ചേളാരി", "പട്ടിക്കാട്", "വാളക്കുളം"],
    correctAnswerIndex: 1, // B) മലപ്പുറം ചേളാരി
    category: "Samastha Headquarters"
  },
  {
    id: 25,
    question: "'എന്റെ സത്യാന്വേഷണ പരീക്ഷണങ്ങൾ' ആരുടെ ആത്മകഥയാണ്?",
    options: ["സുഭാഷ് ചന്ദ്രബോസ്", "സ്വാമി വിവേകാനന്ദൻ", "മഹാത്മാ ഗാന്ധി", "മൗലാനാ അബുൽ കലാം ആസാദ്"],
    correctAnswerIndex: 2, // C) മഹാത്മാ ഗാന്ധി
    category: "Indian History"
  },
  {
    id: 26,
    question: "'അല്ലാഹുവിന്റെ വാൾ' (സെയ്ഫുല്ല) എന്ന അപരനാമത്തിൽ അറിയപ്പെടുന്ന സ്വഹാബി ആരാണ്?",
    options: ["ഖാലിദ് ബ്നു വലീദ് (റ)", "അലി ബ്നു അബീത്വാലിബ് (റ)", "സഅ്ദ് ബ്നു അബീവഖാസ് (റ)", "ഉമർ ബ്നുൽ ഖത്താബ് (റ)"],
    correctAnswerIndex: 0, // A) ഖാലിദ് ബ്നു വലീദ് (റ)
    category: "Islamic History"
  },
  {
    id: 27,
    question: "SKSSF-ന്റെ ഔദ്യോഗിക മുഖവാരിക ഏതാണ്?",
    options: ["സുന്നി അഫ്ക്കാർ", "സത്യധാര", "അൽ ബയാൻ", "പ്രബോധനം"],
    correctAnswerIndex: 1, // B) സത്യധാര
    category: "Samastha Publications"
  },
  {
    id: 28,
    question: "മലയാളത്തിലെ ആദ്യത്തെ ലക്ഷണമൊത്ത നോവലായി കണക്കാക്കപ്പെടുന്ന കൃതി ഏതാണ്?",
    options: ["കുന്തലത", "ഇന്ദുലേഖ", "ബാല്യകാലസഖി", "ശാരദ"],
    correctAnswerIndex: 1, // B) ഇന്ദുലേഖ
    category: "Malayalam Literature"
  },
  {
    id: 29,
    question: "ഹിജ്റയ്ക്ക് ശേഷം പ്രവാചകൻ മുഹമ്മദ് നബി (സ്വ) ആദ്യമായി നിർമ്മിച്ച പള്ളി ഏതാണ്?",
    options: ["മസ്ജിദുന്നബവി", "മസ്ജിദുൽ ഹറാം", "മസ്ജിദുൽ ഖിബ്ലത്തൈൻ", "മസ്ജിദു ഖുബാഅ്"],
    correctAnswerIndex: 3, // D) മസ്ജിദു ഖുബാഅ്
    category: "Prophetic History"
  },
  {
    id: 30,
    question: "'ഖുതുബുസ്സമാൻ' എന്ന സ്ഥാനപ്പേരിൽ അറിയപ്പെട്ടിരുന്ന സമസ്തയുടെ മുൻ പ്രസിഡന്റ് ആരായിരുന്നു?",
    options: ["ശംസുൽ ഉലമ ഇ.കെ അബൂബക്കർ മുസ്ലിയാർ", "സയ്യിദ് അബ്ദുറഹ്മാൻ ബാഫഖി തങ്ങൾ", "പാണക്കാട് സയ്യിദ് മുഹമ്മദലി ശിഹാബ് തങ്ങൾ", "കണ്ണിയത്ത് അഹ്മദ് മുസ്ലിയാർ"],
    correctAnswerIndex: 3, // D) കണ്ണിയത്ത് അഹ്മദ് മുസ്ലിയാർ
    category: "Samastha Leaders"
  }
];

export const QUIZ_QUESTIONS_STORAGE_KEY = 'ahsas_custom_quiz_questions';

/**
 * Retrieves the active questions:
 * 1. Checks localStorage for custom edited questions
 * 2. If valid array exists, returns that
 * 3. Falls back to default official QUIZ_QUESTIONS
 */
export function getStoredQuestions(): QuizQuestion[] {
  const storage = getStorage();
  if (storage) {
    try {
      const stored = storage.getItem(QUIZ_QUESTIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading stored quiz questions:', e);
    }
  }
  return QUIZ_QUESTIONS;
}

/**
 * Saves customized questions to localStorage
 */
export function saveStoredQuestions(questions: QuizQuestion[]): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(QUIZ_QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
    } catch (e) {
      console.error('Error saving stored quiz questions:', e);
    }
  }
}

/**
 * Resets questions back to official defaults
 */
export function resetStoredQuestions(): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(QUIZ_QUESTIONS_STORAGE_KEY);
    } catch (e) {
      console.error('Error resetting stored quiz questions:', e);
    }
  }
}

