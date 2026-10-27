/**
 * Pure simulation logic for Focus Lock Classroom Kiosk & Admin Dashboard Simulator
 * (5-QADAM: AI TUTOR, GAMIFICATION & MULTI-TAB BROADCASTCHANNEL SYNC UPGRADE).
 *
 * Handles:
 * - Deterministic 6-digit TOTP (Time-based One-Time Password) generation rotating every 60s
 * - Monotonic SystemClock.elapsedRealtime() lock session tracking (immune to wall-clock tampering)
 * - Persistent localStorage state + Real-Time Multi-Tab BroadcastChannel synchronization
 * - BootCompletedReceiver simulation (keeps student locked across device reboot)
 * - Safe AI Tutor ("AI Ustoz") with strict academic guardrail filter
 * - Gamification & XP Leaderboard (+50 Focus XP & +10 Olmos every 10 peaceful mins; -100 XP on Tamper attempt)
 * - Interactive GPS Geofencing (100m radius Auto-Lock on Enter)
 * - Live Quiz broadcasting and student A/B/C/D answer evaluation
 * - NotificationBlocker Shield & Post-Lesson Missed Notifications Inbox
 * - Parent Telegram Bot Notification Builder (auto-triggered on >3 tamper attempts or lesson end)
 * - Admin Allowed Educational Tools Toggles (AI Ustoz, Kalkulyator, Lug'at, Daftar, PDF) & CSV Report Export
 */

export interface MissedNotificationItem {
  id: string;
  timestamp: string;
  appName: string;
  packageName: string;
  sender: string;
  previewText: string;
}

export interface StudentQuizSubmission {
  quizId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  answeredAt: string;
}

export interface AllowedToolsConfig {
  aiTutor: boolean;
  calculator: boolean;
  dictionary: boolean;
  notes: boolean;
  pdf: boolean;
}

export interface AiTutorMessage {
  id: string;
  sender: 'student' | 'ai_tutor';
  text: string;
  timestamp: string;
  blockedBySafetyFilter?: boolean;
  topicTag?: string;
}

export interface ParentTelegramMessage {
  id: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  triggerReason: 'TAMPER_THRESHOLD_EXCEEDED' | 'LESSON_COMPLETED' | 'MANUAL_TEACHER_SEND';
  focusedMinutes: number;
  focusScorePercent: number;
  tamperAttempts: number;
  messageText: string;
  sentAt: string;
}

export interface StudentDevice {
  id: string;
  fullName: string;
  seatNumber: string;
  deviceModel: string;
  parentTelegramChat: string;
  isLocked: boolean;
  batteryPercent: number;
  tamperAttempts: number;
  lockDurationMillis: number;
  startElapsedRealtime: number;
  lastActivePackage: string;
  /** Distance from the Learning Center in meters (0..250m). <= 100m is inside Geofence */
  distanceMeters: number;
  /** Notifications intercepted by NotificationBlocker.kt while locked */
  missedNotifications: MissedNotificationItem[];
  /** Latest Live Quiz response from this student */
  lastQuizSubmission: StudentQuizSubmission | null;
  /** Student's saved lesson notes (Konspekt / Daftar) persisted in localStorage */
  studyNotes: string;
  /** Active Classroom Session ID joined via QR Scan */
  connectedSessionId: string;
  /** Gamification: Focus XP points (+50 XP per 10 peaceful mins, -100 XP per tamper attempt) */
  focusXp: number;
  /** Gamification: Olmos / Coins earned */
  focusCoins: number;
  /** Peaceful focus minutes accumulated */
  peacefulMinutesAccrued: number;
  /** Built-in Safe AI Tutor chat history */
  aiTutorHistory: AiTutorMessage[];
}

export interface LeaderboardEntry {
  rank: number;
  student: StudentDevice;
  hasCrown: boolean;
  crownTier: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';
}

export interface TamperLogEntry {
  id: string;
  timestamp: string;
  studentId: string;
  studentName: string;
  appName: string;
  packageName: string;
  type:
    | 'APP_INTERCEPT'
    | 'CLOCK_TAMPER'
    | 'NOTIFICATION_BLOCKED'
    | 'TOTP_UNLOCK'
    | 'QR_SCAN_LOCK'
    | 'SESSION_START'
    | 'GEOFENCE_AUTO_LOCK'
    | 'GEOFENCE_EXIT'
    | 'LIVE_QUIZ_SENT'
    | 'LIVE_QUIZ_ANSWER'
    | 'BOOT_COMPLETED_RECEIVER'
    | 'TELEGRAM_PARENT_ALERT'
    | 'AI_TUTOR_SAFETY_BLOCK'
    | 'AI_TUTOR_QUERY'
    | 'GAMIFICATION_XP_REWARD';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
}

export interface TotpState {
  code: string;
  secondsRemaining: number;
  progressPercent: number;
  epochWindow: number;
}

export interface PhoneAppDefinition {
  id: string;
  name: string;
  packageName: string;
  category: 'BLOCKED_SOCIAL' | 'BLOCKED_SYSTEM' | 'ALLOWED_EDU';
  toolKey?: keyof AllowedToolsConfig;
  descriptionUz: string;
}

export interface LiveQuizQuestion {
  id: string;
  subject: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  sentAt: string;
}

export interface SessionAnalyticsReport {
  studentId: string;
  studentName: string;
  focusedMinutes: number;
  blockedNotificationsCount: number;
  tamperAttemptsCount: number;
  focusScorePercent: number;
  quizCorrect: boolean | null;
  completedAt: string;
  unlockReason: string;
}

export const GEOFENCE_RADIUS_METERS = 100;
export const DEFAULT_SESSION_ID = 'XONA-304';
export const XP_REWARD_PER_10_MIN = 50;
export const COINS_REWARD_PER_10_MIN = 10;
export const XP_PENALTY_ON_TAMPER = 100;

export const SAFE_AI_TUTOR_REFUSAL_MESSAGE =
  'Men faqat qoidani tushuntirib beraman, tayyor javobni aytmayman!';

export const DEFAULT_ALLOWED_TOOLS: AllowedToolsConfig = {
  aiTutor: true,
  calculator: true,
  dictionary: true,
  notes: true,
  pdf: true,
};

export const LIVE_QUIZ_TEMPLATES: Omit<LiveQuizQuestion, 'id' | 'sentAt'>[] = [
  {
    subject: 'Android Security',
    questionText:
      "Android'da foydalanuvchi telefon soatini o'zgartirsa ham aldanmaydigan monotonik vaqt metodi qaysi?",
    options: {
      A: 'SystemClock.elapsedRealtime()',
      B: 'System.currentTimeMillis()',
      C: 'Date().getTime()',
      D: 'Calendar.getInstance()',
    },
    correctOption: 'A',
  },
  {
    subject: 'IELTS Grammar',
    questionText:
      'Choose the correct form: "Neither the teacher nor the students ___ allowed to use phones during class."',
    options: {
      A: 'are',
      B: 'is',
      C: 'was',
      D: 'has been',
    },
    correctOption: 'A',
  },
  {
    subject: 'Matematika (Algebra)',
    questionText: 'Agar log₂(x) = 5 bo‘lsa, x ning qiymati nechaga teng?',
    options: {
      A: '32',
      B: '25',
      C: '10',
      D: '64',
    },
    correctOption: 'A',
  },
];

export const FAKE_TELEGRAM_MESSAGES: Array<{
  appName: string;
  packageName: string;
  sender: string;
  previewText: string;
}> = [
  {
    appName: 'Telegram',
    packageName: 'org.telegram.messenger',
    sender: 'Sinfdoshlar Guruhi',
    previewText: 'Darsdan keyin futbolga boramizmi? Tez javob yoz!',
  },
  {
    appName: 'Telegram',
    packageName: 'org.telegram.messenger',
    sender: 'Otabek (Kursdosh)',
    previewText: '2-masalaning javobini rasmga olib tashlab yubor!',
  },
  {
    appName: 'Instagram Direct',
    packageName: 'com.instagram.android',
    sender: '@jasur_official',
    previewText: 'Yangi Reels videoni ko‘rdingmi? 😂🔥',
  },
];

export const PHONE_APPS: PhoneAppDefinition[] = [
  // Blocked Social & System Apps
  {
    id: 'instagram',
    name: 'Instagram',
    packageName: 'com.instagram.android',
    category: 'BLOCKED_SOCIAL',
    descriptionUz: 'Ijtimoiy tarmoq (Bloklangan)',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    packageName: 'org.telegram.messenger',
    category: 'BLOCKED_SOCIAL',
    descriptionUz: 'Messenjer (Bloklangan)',
  },
  {
    id: 'settings',
    name: 'Settings',
    packageName: 'com.android.settings',
    category: 'BLOCKED_SYSTEM',
    descriptionUz: 'Tizim sozlamalari (Bloklangan)',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    packageName: 'com.zhiliaoapp.musically',
    category: 'BLOCKED_SOCIAL',
    descriptionUz: 'Qisqa videolar (Bloklangan)',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    category: 'BLOCKED_SOCIAL',
    descriptionUz: 'Video platforma (Bloklangan)',
  },
  // Allowed Internal Educational Tools (Controlled by Teacher Toggles)
  {
    id: 'ai_tutor',
    name: 'AI Ustoz',
    packageName: 'uz.edu.focuslock.aitutor',
    category: 'ALLOWED_EDU',
    toolKey: 'aiTutor',
    descriptionUz: 'Xavfsiz AI Dars Yordamchisi (Ruxsat etilgan)',
  },
  {
    id: 'calculator',
    name: 'Kalkulyator',
    packageName: 'uz.edu.focuslock.calculator',
    category: 'ALLOWED_EDU',
    toolKey: 'calculator',
    descriptionUz: 'Ilmiy kalkulyator (Ruxsat etilgan)',
  },
  {
    id: 'dictionary',
    name: "Lug'at",
    packageName: 'uz.edu.focuslock.dictionary',
    category: 'ALLOWED_EDU',
    toolKey: 'dictionary',
    descriptionUz: "Ingliz-O'zbek lug'ati (Ruxsat etilgan)",
  },
  {
    id: 'notes',
    name: 'Daftar',
    packageName: 'uz.edu.focuslock.notes',
    category: 'ALLOWED_EDU',
    toolKey: 'notes',
    descriptionUz: 'Dars konspekti daftari (Ruxsat etilgan)',
  },
  {
    id: 'pdf',
    name: 'PDF Kitob',
    packageName: 'uz.edu.focuslock.pdf',
    category: 'ALLOWED_EDU',
    toolKey: 'pdf',
    descriptionUz: "O'quv qo'llanma PDF (Ruxsat etilgan)",
  },
];

export const INITIAL_STUDENTS: StudentDevice[] = [
  {
    id: 'std-1',
    fullName: 'Aliyev Vali',
    seatNumber: 'A-01',
    deviceModel: 'Samsung Galaxy S23',
    parentTelegramChat: '@Aliyev_OtaOna_Bot (+998 90 123-45-67)',
    isLocked: true,
    batteryPercent: 78,
    tamperAttempts: 1,
    lockDurationMillis: 90 * 60 * 1000,
    startElapsedRealtime: 100_000,
    lastActivePackage: 'uz.edu.focuslock',
    distanceMeters: 28,
    missedNotifications: [
      {
        id: 'notif-init-1',
        timestamp: '11:32:10',
        appName: 'Telegram',
        packageName: 'org.telegram.messenger',
        sender: 'Sinfdoshlar Guruhi',
        previewText: 'Darsdan keyin futbolga boramizmi?',
      },
    ],
    lastQuizSubmission: null,
    studyNotes:
      "1-Mavzu: Android Security & Kiosk Mode.\n- SystemClock.elapsedRealtime() soat o'zgartirilsa ham aldanmaydi.\n- BootCompletedReceiver telefon qayta yonganda qulfni tiklaydi.",
    connectedSessionId: DEFAULT_SESSION_ID,
    focusXp: 550,
    focusCoins: 110,
    peacefulMinutesAccrued: 80,
    aiTutorHistory: [
      {
        id: 'ai-init-1',
        sender: 'ai_tutor',
        text: "Salom! Men Focus Lock Xavfsiz AI Ustoziman. Ingliz/Nemis tili grammatikasi yoki Matematika/Fizika formulalarini so'rang — qoidasini sodda tushuntirib beraman!",
        timestamp: '11:30:00',
        blockedBySafetyFilter: false,
        topicTag: 'Safe AI Tutor',
      },
    ],
  },
  {
    id: 'std-2',
    fullName: 'Karimov Jasur',
    seatNumber: 'A-02',
    deviceModel: 'Redmi Note 13 Pro',
    parentTelegramChat: '@Karimov_Parent (+998 93 456-78-90)',
    isLocked: true,
    batteryPercent: 84,
    tamperAttempts: 1,
    lockDurationMillis: 90 * 60 * 1000,
    startElapsedRealtime: 100_000,
    lastActivePackage: 'uz.edu.focuslock',
    distanceMeters: 42,
    missedNotifications: [],
    lastQuizSubmission: null,
    studyNotes: 'Matematika darsi formulalari: log2(32) = 5.',
    connectedSessionId: DEFAULT_SESSION_ID,
    focusXp: 450,
    focusCoins: 90,
    peacefulMinutesAccrued: 70,
    aiTutorHistory: [],
  },
  {
    id: 'std-3',
    fullName: 'Toshmatova Malika',
    seatNumber: 'A-03',
    deviceModel: 'Galaxy A54 5G',
    parentTelegramChat: '@Toshmatova_Oilasi (+998 99 777-11-22)',
    isLocked: true,
    batteryPercent: 92,
    tamperAttempts: 0,
    lockDurationMillis: 90 * 60 * 1000,
    startElapsedRealtime: 100_000,
    lastActivePackage: 'uz.edu.focuslock',
    distanceMeters: 18,
    missedNotifications: [],
    lastQuizSubmission: null,
    studyNotes: 'IELTS Academic Reading Vocabulary: resilient, monotonic, immutable.',
    connectedSessionId: DEFAULT_SESSION_ID,
    focusXp: 750,
    focusCoins: 150,
    peacefulMinutesAccrued: 90,
    aiTutorHistory: [],
  },
  {
    id: 'std-4',
    fullName: 'Rustamov Sardor',
    seatNumber: 'B-01',
    deviceModel: 'Pixel 8a',
    parentTelegramChat: '@Rustamov_Dad (+998 97 333-44-55)',
    isLocked: false,
    batteryPercent: 65,
    tamperAttempts: 2,
    lockDurationMillis: 0,
    startElapsedRealtime: 0,
    lastActivePackage: 'com.android.launcher3',
    distanceMeters: 145,
    missedNotifications: [],
    lastQuizSubmission: null,
    studyNotes: '',
    connectedSessionId: DEFAULT_SESSION_ID,
    focusXp: 250,
    focusCoins: 50,
    peacefulMinutesAccrued: 40,
    aiTutorHistory: [],
  },
  {
    id: 'std-5',
    fullName: 'Qodirova Zilola',
    seatNumber: 'B-02',
    deviceModel: 'Samsung S21 FE',
    parentTelegramChat: '@Qodirova_Mother (+998 91 888-99-00)',
    isLocked: true,
    batteryPercent: 71,
    tamperAttempts: 0,
    lockDurationMillis: 90 * 60 * 1000,
    startElapsedRealtime: 100_000,
    lastActivePackage: 'uz.edu.focuslock',
    distanceMeters: 55,
    missedNotifications: [],
    lastQuizSubmission: null,
    studyNotes: '',
    connectedSessionId: DEFAULT_SESSION_ID,
    focusXp: 650,
    focusCoins: 130,
    peacefulMinutesAccrued: 85,
    aiTutorHistory: [],
  },
];

/**
 * Evaluates a student's question to the Built-in Safe AI Tutor ("AI Ustoz").
 * Enforces the strict guardrail:
 * - If the student asks for ready-made homework/test answers or asks off-topic non-lesson questions,
 *   returns `SAFE_AI_TUTOR_REFUSAL_MESSAGE`:
 *   "Men faqat qoidani tushuntirib beraman, tayyor javobni aytmayman!"
 */
export function evaluateSafeAiTutorPrompt(
  rawPrompt: string,
  formattedTime: string
): {
  replyMessage: AiTutorMessage;
  blockedBySafetyFilter: boolean;
} {
  const normalized = rawPrompt.trim().toLowerCase();

  // Cheating / ready-answer / homework / off-topic patterns
  const cheatingOrOffTopicKeywords = [
    'uy vazifa',
    'uyga vazifa',
    'test javob',
    'tayyor yechib',
    'yechib ber',
    'javobini ayt',
    'javobini ber',
    'tayyor javob',
    'shpargalka',
    "ko'chirib",
    'variantni ayt',
    'futbol',
    'pubg',
    'free fire',
    'instagram',
    'tiktok',
    'kino',
    'serial',
    'musiqa',
  ];

  const isBlocked = cheatingOrOffTopicKeywords.some((kw) => normalized.includes(kw));

  if (isBlocked) {
    return {
      blockedBySafetyFilter: true,
      replyMessage: {
        id: `ai-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'ai_tutor',
        text: SAFE_AI_TUTOR_REFUSAL_MESSAGE,
        timestamp: formattedTime,
        blockedBySafetyFilter: true,
        topicTag: 'Xavfsizlik Filtri (Cheating Blocked)',
      },
    };
  }

  let explanation = '';
  let topicTag = 'Qoida Tushuntirishi';

  if (
    normalized.includes('present perfect') ||
    normalized.includes('ingliz') ||
    normalized.includes('have') ||
    normalized.includes('grammatika')
  ) {
    topicTag = 'Ingliz tili · Present Perfect';
    explanation =
      "QOIDA (Present Perfect): O'tgan zamonda boshlanib, natijasi hozirgi zamon bilan bog'liq bo'lgan ish-harakatni ifodalaydi. Formula: [Subject + have/has + V3 (Past Participle)]. Misol: 'I have learned the rule' (Qoidani o'rgandim — natija hozir mavjud). Kalit so'zlar: already, just, yet, ever, since, for.";
  } else if (
    normalized.includes('nemis') ||
    normalized.includes('artikl') ||
    normalized.includes('der die das') ||
    normalized.includes('dativ') ||
    normalized.includes('akkusativ')
  ) {
    topicTag = 'Nemis tili · Kasus & Artikllar';
    explanation =
      "QOIDA (Nemis tili — Akkusativ vs Dativ): 'Wohin?' (Qayerga? — harakat yo'nalishi) savoliga Akkusativ (den, die, das), 'Wo?' (Qayerda? — joylashuv) savoliga esa Dativ (dem, der, dem) ishlatiladi. Misol: 'Ich gehe in die Schule' (Akk.) / 'Ich bin in der Schule' (Dat.).";
  } else if (
    normalized.includes('kvadrat') ||
    normalized.includes('diskriminant') ||
    normalized.includes('tenglama') ||
    normalized.includes('matematika') ||
    normalized.includes('pifagor') ||
    normalized.includes('logarifm')
  ) {
    topicTag = 'Matematika · Formula va Qoida';
    explanation =
      "QOIDA (Kvadrat tenglama va Diskriminant): ax² + bx + c = 0 ko'rinishidagi tenglamaning diskriminanti D = b² - 4ac formula bilan topiladi. Agar D > 0 bo'lsa 2 ta ildiz: x₁,₂ = (-b ± √D) / (2a). Masalani o'zingiz shu formula asosida hisoblab ko'ring!";
  } else {
    topicTag = 'Akademik Qoida (Safe AI)';
    explanation = `QOIDA TUSHUNTIRISHI: "${rawPrompt.trim()}" mavzusida asosiy tushuncha — avvalo ta'rif va formulani aniqlab olib, berilgan qiymatlarni bosqichma-bosqich qo'yib chiqishdir. Men sizga yo'nalish va qoidani ko'rsataman, amaliy mashqni esa o'zingiz mustaqil bajaring!`;
  }

  return {
    blockedBySafetyFilter: false,
    replyMessage: {
      id: `ai-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'ai_tutor',
      text: explanation,
      timestamp: formattedTime,
      blockedBySafetyFilter: false,
      topicTag,
    },
  };
}

/**
 * Submits a question from a student to the Built-in Safe AI Tutor and updates student state & teacher logs.
 */
export function askStudentSafeAiTutor(
  students: StudentDevice[],
  targetStudentId: string,
  questionText: string,
  formattedTime: string
): {
  updatedStudents: StudentDevice[];
  replyMessage: AiTutorMessage;
  blockedBySafetyFilter: boolean;
  logEntry: TamperLogEntry;
} {
  const targetStudent = students.find((s) => s.id === targetStudentId) || students[0];
  const studentMsg: AiTutorMessage = {
    id: `ai-usr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    sender: 'student',
    text: questionText.trim(),
    timestamp: formattedTime,
  };

  const evaluation = evaluateSafeAiTutorPrompt(questionText, formattedTime);

  const updatedStudents = students.map((s) =>
    s.id === targetStudent.id
      ? {
          ...s,
          aiTutorHistory: [...s.aiTutorHistory, studentMsg, evaluation.replyMessage],
        }
      : s
  );

  const logEntry: TamperLogEntry = evaluation.blockedBySafetyFilter
    ? {
        id: `log-ai-block-${Date.now()}`,
        timestamp: formattedTime,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        appName: 'AI Ustoz (Xavfsizlik Filtri)',
        packageName: 'uz.edu.focuslock.aitutor',
        type: 'AI_TUTOR_SAFETY_BLOCK',
        severity: 'WARNING',
        message: `AI XAVFSIZLIK FILTRI: ${targetStudent.fullName} tayyor javob yoki darsdan tashqari narsa so'radi ("${questionText.slice(
          0,
          45
        )}"). AI Ustoz rad etdi!`,
      }
    : {
        id: `log-ai-ok-${Date.now()}`,
        timestamp: formattedTime,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        appName: 'AI Ustoz (Safe AI Tutor)',
        packageName: 'uz.edu.focuslock.aitutor',
        type: 'AI_TUTOR_QUERY',
        severity: 'INFO',
        message: `AI USTOZ: ${targetStudent.fullName} qoida bo'yicha savol so'radi ("${questionText.slice(
          0,
          45
        )}"). Qoida tushuntirildi.`,
      };

  return {
    updatedStudents,
    replyMessage: evaluation.replyMessage,
    blockedBySafetyFilter: evaluation.blockedBySafetyFilter,
    logEntry,
  };
}

/**
 * Awards +50 Focus XP and +10 Olmos/Coins for 10 minutes of peaceful locked focus without tampering.
 */
export function awardPeacefulFocusXp(
  students: StudentDevice[],
  formattedTime: string,
  targetStudentId?: string
): {
  updatedStudents: StudentDevice[];
  logEntry: TamperLogEntry;
} {
  const updatedStudents = students.map((s) => {
    const shouldAward = targetStudentId ? s.id === targetStudentId : s.isLocked;
    if (!shouldAward) return s;
    return {
      ...s,
      focusXp: s.focusXp + XP_REWARD_PER_10_MIN,
      focusCoins: s.focusCoins + COINS_REWARD_PER_10_MIN,
      peacefulMinutesAccrued: s.peacefulMinutesAccrued + 10,
    };
  });

  const targetName = targetStudentId
    ? students.find((s) => s.id === targetStudentId)?.fullName || 'O‘quvchi'
    : 'Intizomli o‘quvchilar';

  const logEntry: TamperLogEntry = {
    id: `log-xp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: formattedTime,
    studentId: targetStudentId || 'all',
    studentName: targetName,
    appName: 'Focus Gamification Engine',
    packageName: 'uz.edu.focuslock.gamification',
    type: 'GAMIFICATION_XP_REWARD',
    severity: 'INFO',
    message: `GAMIFIKATSIYA: ${targetName} 10 daqiqa tinch fokusda o'tirgani uchun +${XP_REWARD_PER_10_MIN} Focus XP va +${COINS_REWARD_PER_10_MIN} Olmos (Coin) oldi!`,
  };

  return {
    updatedStudents,
    logEntry,
  };
}

/**
 * Computes the sorted Top Focus Students Leaderboard (1st, 2nd, 3rd place get Crowns).
 */
export function getLeaderboardStudents(students: StudentDevice[]): LeaderboardEntry[] {
  const sorted = [...students].sort((a, b) => {
    if (b.focusXp !== a.focusXp) return b.focusXp - a.focusXp;
    if (a.tamperAttempts !== b.tamperAttempts) return a.tamperAttempts - b.tamperAttempts;
    return b.focusCoins - a.focusCoins;
  });

  return sorted.map((student, index) => {
    const rank = index + 1;
    const crownTier: LeaderboardEntry['crownTier'] =
      rank === 1 ? 'GOLD' : rank === 2 ? 'SILVER' : rank === 3 ? 'BRONZE' : 'NONE';
    return {
      rank,
      student,
      hasCrown: rank <= 3,
      crownTier,
    };
  });
}

/**
 * Generates a deterministic 6-digit TOTP code that rotates every 60 seconds.
 */
export function computeClassroomTotp(nowMs: number, secretSeed: number = 849201): TotpState {
  const totalSeconds = Math.floor(Math.max(0, nowMs) / 1000);
  const epochWindow = Math.floor(totalSeconds / 60);
  const secondsIntoWindow = totalSeconds % 60;
  const secondsRemaining = 60 - secondsIntoWindow;
  const progressPercent = Math.round((secondsRemaining / 60) * 100);

  let hash = 2166136261 ^ secretSeed;
  const input = epochWindow * 16777619;
  hash ^= input & 0xff;
  hash = Math.imul(hash, 16777619);
  hash ^= (input >> 8) & 0xff;
  hash = Math.imul(hash, 16777619);
  hash ^= (input >> 16) & 0xff;
  hash = Math.imul(hash, 16777619);
  hash ^= (input >> 24) & 0xff;
  hash = Math.imul(hash, 16777619);

  const positiveInt = (Math.abs(hash) % 900000) + 100000;
  const code = String(positiveInt).padStart(6, '0');

  return {
    code,
    secondsRemaining,
    progressPercent,
    epochWindow,
  };
}

/**
 * Verifies if an entered 6-digit PIN matches the current active TOTP code.
 */
export function verifyTotpPin(enteredPin: string, currentTotpCode: string): boolean {
  const normalizedPin = enteredPin.replace(/\s+/g, '').trim();
  const normalizedTarget = currentTotpCode.replace(/\s+/g, '').trim();
  return normalizedPin.length === 6 && normalizedPin === normalizedTarget;
}

/**
 * Calculates remaining lock time for a student strictly using monotonic SystemClock.elapsedRealtime().
 */
export function getStudentRemainingLockMillis(
  student: StudentDevice,
  currentElapsedRealtime: number
): number {
  if (!student.isLocked || student.lockDurationMillis <= 0) {
    return 0;
  }
  if (currentElapsedRealtime < student.startElapsedRealtime) {
    return student.lockDurationMillis;
  }
  const elapsed = currentElapsedRealtime - student.startElapsedRealtime;
  return Math.max(0, student.lockDurationMillis - elapsed);
}

/**
 * Simulates Android BootCompletedReceiver when a student reboots their phone during class.
 */
export function simulateStudentDeviceReboot(
  students: StudentDevice[],
  targetStudentId: string,
  currentElapsedRealtime: number,
  formattedTime: string
): {
  updatedStudents: StudentDevice[];
  bootLog: TamperLogEntry;
  remainingMsAfterBoot: number;
} {
  const targetStudent = students.find((s) => s.id === targetStudentId) || students[0];
  const remainingBeforeReboot = getStudentRemainingLockMillis(
    targetStudent,
    currentElapsedRealtime
  );
  const effectiveRemaining =
    targetStudent.isLocked && remainingBeforeReboot > 0
      ? remainingBeforeReboot
      : 90 * 60 * 1000;

  const updatedStudents = students.map((s) =>
    s.id === targetStudentId
      ? {
          ...s,
          isLocked: true,
          lockDurationMillis: effectiveRemaining,
          startElapsedRealtime: currentElapsedRealtime,
          lastActivePackage: 'uz.edu.focuslock',
        }
      : s
  );

  const bootLog: TamperLogEntry = {
    id: `log-boot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: formattedTime,
    studentId: targetStudent.id,
    studentName: targetStudent.fullName,
    appName: 'BootCompletedReceiver',
    packageName: 'android.intent.action.BOOT_COMPLETED',
    type: 'BOOT_COMPLETED_RECEIVER',
    severity: 'WARNING',
    message: `BootCompletedReceiver ishladi! ${targetStudent.fullName} telefonni o'chirib-yoqdi (Reboot), ammo qulf saqlanib qoldi va to'g'ridan-to'g'ri Qulf Ekraniga tushdi!`,
  };

  return {
    updatedStudents,
    bootLog,
    remainingMsAfterBoot: effectiveRemaining,
  };
}

/**
 * Filters PHONE_APPS so that disabled internal tools (AI Ustoz, Kalkulyator, Lug'at, Daftar, PDF)
 * immediately disappear from the student's phone screen when toggled off by the teacher.
 */
export function getVisiblePhoneApps(allowedTools: AllowedToolsConfig): PhoneAppDefinition[] {
  return PHONE_APPS.filter((app) => {
    if (app.category === 'ALLOWED_EDU' && app.toolKey) {
      return Boolean(allowedTools[app.toolKey]);
    }
    return true;
  });
}

/**
 * Generates a formatted Parent Telegram Bot Notification card.
 */
export function buildParentTelegramNotification(
  student: StudentDevice,
  plannedDurationMinutes: number,
  triggerReason: ParentTelegramMessage['triggerReason'],
  sentAt: string
): ParentTelegramMessage {
  const focusedMinutes = Math.max(1, plannedDurationMinutes);
  const rawPenalty = student.tamperAttempts * 5;
  const quizBonus = student.lastQuizSubmission?.isCorrect ? 2 : 0;
  const focusScorePercent = Math.max(50, Math.min(100, 100 - rawPenalty + quizBonus));

  const baseMessage = `Hurmatli ota-ona! Farzandingiz ${student.fullName} bugungi darsda ${focusedMinutes} daqiqa telefonini blokda saqladi. Diqqat ko'rsatkichi: ${focusScorePercent}%.`;

  const extraAlert =
    triggerReason === 'TAMPER_THRESHOLD_EXCEEDED'
      ? ` Diqqat: Dars vaqtida ${student.tamperAttempts} marta taqiqlangan ilovalarga (Instagram/Settings) kirishga urindi va Focus Lock tomonidan bloklandi.`
      : student.tamperAttempts > 0
      ? ` Qoidabuzarlik urinishlari: ${student.tamperAttempts} marta (barchasi bloklandi).`
      : ` Hech qanday qoidabuzarlik qayd etilmadi. Namuna ko'rsatdi!`;

  return {
    id: `tg-msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: student.id,
    studentName: student.fullName,
    parentPhone: student.parentTelegramChat,
    triggerReason,
    focusedMinutes,
    focusScorePercent,
    tamperAttempts: student.tamperAttempts,
    messageText: `${baseMessage}${extraAlert}`,
    sentAt,
  };
}

/**
 * Generates a CSV string for exporting classroom attendance, battery, XP, Coins, tamper attempts, and Focus Score.
 */
export function generateClassroomCsvExport(
  students: StudentDevice[],
  plannedDurationMinutes: number
): string {
  const headers = [
    'ID',
    'F.I.Sh',
    'Joy (Seat)',
    'Qurilma Modeli',
    'Holati',
    'Batareya (%)',
    'GPS Masofa (m)',
    'Focus XP',
    'Olmos (Coins)',
    'Qoidabuzarlik (Tamper)',
    'Bloklangan Xabarlar',
    'Diqqat Reytingi (Focus Score %)',
    'Sessiya ID',
  ];

  const rows = students.map((s) => {
    const score = Math.max(50, Math.min(100, 100 - s.tamperAttempts * 5));
    return [
      s.id,
      `"${s.fullName}"`,
      s.seatNumber,
      `"${s.deviceModel}"`,
      s.isLocked ? 'Qulflangan' : 'Bosh',
      String(s.batteryPercent),
      String(s.distanceMeters),
      String(s.focusXp),
      String(s.focusCoins),
      String(s.tamperAttempts),
      String(s.missedNotifications.length),
      `${score}% (${plannedDurationMinutes} daq)`,
      s.connectedSessionId,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Locks all students in the classroom with the specified duration (in minutes).
 */
export function lockAllStudents(
  students: StudentDevice[],
  durationMinutes: number,
  currentElapsedRealtime: number,
  sessionId: string = DEFAULT_SESSION_ID
): StudentDevice[] {
  const durationMillis = Math.max(1, durationMinutes) * 60 * 1000;
  return students.map((student) => ({
    ...student,
    isLocked: true,
    lockDurationMillis: durationMillis,
    startElapsedRealtime: currentElapsedRealtime,
    lastActivePackage: 'uz.edu.focuslock',
    distanceMeters: Math.min(student.distanceMeters, 45),
    connectedSessionId: sessionId,
  }));
}

/**
 * Unlocks all students in the classroom.
 */
export function unlockAllStudents(students: StudentDevice[]): StudentDevice[] {
  return students.map((student) => ({
    ...student,
    isLocked: false,
    lockDurationMillis: 0,
    startElapsedRealtime: 0,
  }));
}

/**
 * Evaluates GPS Geofence distance change (100m radius around Learning Center).
 */
export function evaluateGeofenceMovement(
  students: StudentDevice[],
  targetStudentId: string,
  newDistanceMeters: number,
  defaultDurationMinutes: number,
  currentElapsedRealtime: number,
  formattedTime: string
): {
  updatedStudents: StudentDevice[];
  autoLocked: boolean;
  insideGeofence: boolean;
  geofenceLog: TamperLogEntry | null;
} {
  const clampedDistance = Math.max(0, Math.min(250, Math.round(newDistanceMeters)));
  const insideGeofence = clampedDistance <= GEOFENCE_RADIUS_METERS;
  const student = students.find((s) => s.id === targetStudentId);

  if (!student) {
    return {
      updatedStudents: students,
      autoLocked: false,
      insideGeofence,
      geofenceLog: null,
    };
  }

  const wasOutside = student.distanceMeters > GEOFENCE_RADIUS_METERS;
  const shouldAutoLock = insideGeofence && (!student.isLocked || wasOutside);

  if (shouldAutoLock) {
    const durationMillis = Math.max(1, defaultDurationMinutes) * 60 * 1000;
    const updatedStudents = students.map((s) =>
      s.id === targetStudentId
        ? {
            ...s,
            distanceMeters: clampedDistance,
            isLocked: true,
            lockDurationMillis:
              s.isLocked && s.lockDurationMillis > 0 ? s.lockDurationMillis : durationMillis,
            startElapsedRealtime:
              s.isLocked && s.startElapsedRealtime > 0
                ? s.startElapsedRealtime
                : currentElapsedRealtime,
            lastActivePackage: 'uz.edu.focuslock',
          }
        : s
    );

    const geofenceLog: TamperLogEntry = {
      id: `log-geo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formattedTime,
      studentId: student.id,
      studentName: student.fullName,
      appName: 'GPS GeofenceBroadcastReceiver',
      packageName: 'uz.edu.focuslock.geofence',
      type: 'GEOFENCE_AUTO_LOCK',
      severity: 'INFO',
      message: `GPS GEOFENCE: ${student.fullName} o'quv markazi hududiga kirdi (${clampedDistance}m <= 100m). Telefon AVTOMATIK qulflandi (Auto-Lock on Enter)!`,
    };

    return {
      updatedStudents,
      autoLocked: true,
      insideGeofence: true,
      geofenceLog,
    };
  }

  const updatedStudents = students.map((s) =>
    s.id === targetStudentId ? { ...s, distanceMeters: clampedDistance } : s
  );

  let geofenceLog: TamperLogEntry | null = null;
  if (!insideGeofence && student.distanceMeters <= GEOFENCE_RADIUS_METERS) {
    geofenceLog = {
      id: `log-geo-exit-${Date.now()}`,
      timestamp: formattedTime,
      studentId: student.id,
      studentName: student.fullName,
      appName: 'GPS GeofenceBroadcastReceiver',
      packageName: 'uz.edu.focuslock.geofence',
      type: 'GEOFENCE_EXIT',
      severity: 'WARNING',
      message: `GPS GEOFENCE: ${student.fullName} 100m radiusdan tashqariga chiqdi (${clampedDistance}m).`,
    };
  }

  return {
    updatedStudents,
    autoLocked: false,
    insideGeofence,
    geofenceLog,
  };
}

/**
 * Evaluates when a student taps an app on their phone simulator.
 * If locked and app is blocked: increments tamperAttempts AND applies -100 Focus XP penalty!
 */
export function handleStudentAppAttempt(
  students: StudentDevice[],
  targetStudentId: string,
  app: PhoneAppDefinition,
  currentElapsedRealtime: number,
  formattedTime: string
): {
  updatedStudents: StudentDevice[];
  intercepted: boolean;
  alertLog: TamperLogEntry | null;
  newTamperCount: number;
  xpPenaltyApplied: number;
} {
  const targetStudent = students.find((s) => s.id === targetStudentId);
  if (!targetStudent) {
    return {
      updatedStudents: students,
      intercepted: false,
      alertLog: null,
      newTamperCount: 0,
      xpPenaltyApplied: 0,
    };
  }

  const remainingMs = getStudentRemainingLockMillis(targetStudent, currentElapsedRealtime);
  const isCurrentlyLocked = targetStudent.isLocked && remainingMs > 0;

  if (!isCurrentlyLocked || app.category === 'ALLOWED_EDU') {
    const updatedStudents = students.map((s) =>
      s.id === targetStudentId ? { ...s, lastActivePackage: app.packageName } : s
    );
    return {
      updatedStudents,
      intercepted: false,
      alertLog: null,
      newTamperCount: targetStudent.tamperAttempts,
      xpPenaltyApplied: 0,
    };
  }

  const nextTamperCount = targetStudent.tamperAttempts + 1;
  const nextFocusXp = Math.max(0, targetStudent.focusXp - XP_PENALTY_ON_TAMPER);

  const updatedStudents = students.map((s) =>
    s.id === targetStudentId
      ? {
          ...s,
          tamperAttempts: nextTamperCount,
          focusXp: nextFocusXp,
          lastActivePackage: 'uz.edu.focuslock',
        }
      : s
  );

  const alertLog: TamperLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: formattedTime,
    studentId: targetStudent.id,
    studentName: targetStudent.fullName,
    appName: app.name,
    packageName: app.packageName,
    type: 'APP_INTERCEPT',
    severity: 'CRITICAL',
    message: `DIQQAT! ${targetStudent.fullName} ${app.name}'ga kirishga urindi! (-${XP_PENALTY_ON_TAMPER} XP jarima!)`,
  };

  return {
    updatedStudents,
    intercepted: true,
    alertLog,
    newTamperCount: nextTamperCount,
    xpPenaltyApplied: XP_PENALTY_ON_TAMPER,
  };
}

/**
 * Intercepts a fake incoming notification (e.g., Telegram message) via NotificationBlocker.kt
 */
export function interceptIncomingNotification(
  students: StudentDevice[],
  targetStudentId: string,
  payload: { appName: string; packageName: string; sender: string; previewText: string },
  formattedTime: string
): {
  updatedStudents: StudentDevice[];
  blockedItem: MissedNotificationItem;
  logEntry: TamperLogEntry;
} {
  const blockedItem: MissedNotificationItem = {
    id: `missed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: formattedTime,
    appName: payload.appName,
    packageName: payload.packageName,
    sender: payload.sender,
    previewText: payload.previewText,
  };

  const targetStudent = students.find((s) => s.id === targetStudentId) || students[0];

  const updatedStudents = students.map((s) =>
    s.id === targetStudentId
      ? {
          ...s,
          missedNotifications: [blockedItem, ...s.missedNotifications],
        }
      : s
  );

  const logEntry: TamperLogEntry = {
    id: `log-notif-${Date.now()}`,
    timestamp: formattedTime,
    studentId: targetStudent.id,
    studentName: targetStudent.fullName,
    appName: payload.appName,
    packageName: payload.packageName,
    type: 'NOTIFICATION_BLOCKED',
    severity: 'WARNING',
    message: `NotificationBlocker xizmati: ${targetStudent.fullName} telefoniga kelgan ${payload.appName} xabari ("${payload.sender}") tutib qolindi va "O'tkazib yuborilgan xabarlar" qutisiga yashirildi.`,
  };

  return {
    updatedStudents,
    blockedItem,
    logEntry,
  };
}

/**
 * Evaluates a student's A/B/C/D answer to an active Live Quiz question.
 */
export function submitStudentLiveQuizAnswer(
  students: StudentDevice[],
  targetStudentId: string,
  quiz: LiveQuizQuestion,
  selectedOption: 'A' | 'B' | 'C' | 'D',
  formattedTime: string
): {
  updatedStudents: StudentDevice[];
  submission: StudentQuizSubmission;
  logEntry: TamperLogEntry;
} {
  const isCorrect = selectedOption === quiz.correctOption;
  const submission: StudentQuizSubmission = {
    quizId: quiz.id,
    selectedOption,
    isCorrect,
    answeredAt: formattedTime,
  };

  const targetStudent = students.find((s) => s.id === targetStudentId) || students[0];

  const updatedStudents = students.map((s) =>
    s.id === targetStudentId
      ? {
          ...s,
          lastQuizSubmission: submission,
          focusXp: isCorrect ? s.focusXp + 25 : s.focusXp,
          focusCoins: isCorrect ? s.focusCoins + 5 : s.focusCoins,
        }
      : s
  );

  const verdictText = isCorrect
    ? `${targetStudent.fullName} to'g'ri javob berdi (${selectedOption}) (+25 XP)`
    : `${targetStudent.fullName} noto'g'ri javob berdi (${selectedOption}, to'g'ri javob: ${quiz.correctOption})`;

  const logEntry: TamperLogEntry = {
    id: `log-quiz-ans-${Date.now()}`,
    timestamp: formattedTime,
    studentId: targetStudent.id,
    studentName: targetStudent.fullName,
    appName: `Live Quiz (${quiz.subject})`,
    packageName: 'uz.edu.focuslock.quiz',
    type: 'LIVE_QUIZ_ANSWER',
    severity: isCorrect ? 'INFO' : 'WARNING',
    message: `LIVE QUIZ: ${verdictText}`,
  };

  return {
    updatedStudents,
    submission,
    logEntry,
  };
}

/**
 * Calculates Session Analytics & Focus Score (0%..100%) when a lesson ends or unlocks.
 */
export function buildSessionAnalyticsReport(
  student: StudentDevice,
  plannedDurationMinutes: number,
  completedAt: string,
  unlockReason: string
): SessionAnalyticsReport {
  const focusedMinutes = Math.max(1, plannedDurationMinutes);
  const blockedNotificationsCount = student.missedNotifications.length;
  const tamperAttemptsCount = student.tamperAttempts;

  const rawPenalty = tamperAttemptsCount * 5;
  const quizBonus = student.lastQuizSubmission?.isCorrect ? 2 : 0;
  const focusScorePercent = Math.max(50, Math.min(100, 100 - rawPenalty + quizBonus));

  return {
    studentId: student.id,
    studentName: student.fullName,
    focusedMinutes,
    blockedNotificationsCount,
    tamperAttemptsCount,
    focusScorePercent,
    quizCorrect: student.lastQuizSubmission ? student.lastQuizSubmission.isCorrect : null,
    completedAt,
    unlockReason,
  };
}

/**
 * Formats milliseconds into MM:SS or HH:MM:SS tabular countdown string.
 */
export function formatCountdownClock(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
