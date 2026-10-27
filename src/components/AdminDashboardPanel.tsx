import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  QrCode,
  KeyRound,
  Battery,
  AlertTriangle,
  Play,
  Volume2,
  VolumeX,
  Terminal,
  Trash2,
  UserCheck,
  Clock,
  Copy,
  Check,
  HelpCircle,
  Send,
  BarChart3,
  CheckCircle2,
  Sliders,
  Download,
  MessageSquareShare,
  Calculator,
  BookOpen,
  FileText,
  NotebookPen,
  GraduationCap,
  Crown,
  Zap,
  Gem,
} from 'lucide-react';
import {
  StudentDevice,
  TamperLogEntry,
  TotpState,
  LiveQuizQuestion,
  LIVE_QUIZ_TEMPLATES,
  SessionAnalyticsReport,
  AllowedToolsConfig,
  ParentTelegramMessage,
  getStudentRemainingLockMillis,
  formatCountdownClock,
  getLeaderboardStudents,
} from '../utils/focusLockEngine';

interface AdminDashboardPanelProps {
  students: StudentDevice[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  selectedDurationMinutes: number;
  onChangeDurationMinutes: (minutes: number) => void;
  sessionId: string;
  onLockAllStudents: () => void;
  onUnlockAllStudents: () => void;
  onOpenQrModal: () => void;
  onSendLiveQuiz: (quizTemplateIndex: number, customQuestionText?: string) => void;
  activeQuiz: LiveQuizQuestion | null;
  lastQuizResultBanner: string | null;
  lastSessionReport: SessionAnalyticsReport | null;
  onOpenSessionReportModal: () => void;
  allowedTools: AllowedToolsConfig;
  onToggleAllowedTool: (toolKey: keyof AllowedToolsConfig) => void;
  parentTelegramMessages: ParentTelegramMessage[];
  onSendParentTelegramReport: () => void;
  onExportCsvReport: () => void;
  totpState: TotpState;
  elapsedRealtimeMs: number;
  logs: TamperLogEntry[];
  onClearLogs: () => void;
  activeRedAlert: TamperLogEntry | null;
  onDismissRedAlert: () => void;
  isSoundMuted: boolean;
  onToggleSoundMute: () => void;
}

const DURATION_PRESETS = [
  { label: '90 daqiqa (Standart dars)', value: 90 },
  { label: '45 daqiqa (1 para)', value: 45 },
  { label: '1 daqiqa (Tezkor test)', value: 1 },
];

export const AdminDashboardPanel: React.FC<AdminDashboardPanelProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  selectedDurationMinutes,
  onChangeDurationMinutes,
  sessionId,
  onLockAllStudents,
  onUnlockAllStudents,
  onOpenQrModal,
  onSendLiveQuiz,
  activeQuiz,
  lastQuizResultBanner,
  lastSessionReport,
  onOpenSessionReportModal,
  allowedTools,
  onToggleAllowedTool,
  parentTelegramMessages,
  onSendParentTelegramReport,
  onExportCsvReport,
  totpState,
  elapsedRealtimeMs,
  logs,
  onClearLogs,
  activeRedAlert,
  onDismissRedAlert,
  isSoundMuted,
  onToggleSoundMute,
}) => {
  const [copiedTotp, setCopiedTotp] = useState(false);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number>(0);
  const [customQuizQuestion, setCustomQuizQuestion] = useState<string>('');

  const lockedCount = students.filter(
    (s) => s.isLocked && getStudentRemainingLockMillis(s, elapsedRealtimeMs) > 0
  ).length;
  const totalTamperCount = students.reduce((acc, s) => acc + s.tamperAttempts, 0);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const latestParentMsg = parentTelegramMessages[0] || null;

  const handleCopyTotp = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(totpState.code).catch(() => {});
    }
    setCopiedTotp(true);
    setTimeout(() => setCopiedTotp(false), 1800);
  };

  return (
    <section
      aria-label="O'qituvchi Boshqaruv Paneli (Admin Dashboard)"
      className="flex flex-col gap-5 bg-slate-900/70 border border-slate-800 rounded-xl p-5"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-medium text-indigo-400">
            1-QISM · CHAP PANEL · REAL-TIME NAZORAT · SESSIYA: {sessionId}
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            O&apos;qituvchi Boshqaruv Paneli (Admin Dashboard)
          </h2>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono tabular-nums">
          <span>
            Qulflangan: <strong className="text-emerald-400">{lockedCount}/{students.length}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Qoidabuzarlik: <strong className="text-rose-400">{totalTamperCount} ta</strong>
          </span>
          <button
            type="button"
            onClick={onExportCsvReport}
            data-testid="export-csv-btn"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>CSV Eksport</span>
          </button>
          <button
            type="button"
            onClick={onToggleSoundMute}
            aria-label={isSoundMuted ? "Ovozli ogohlantirishni yoqish" : "Ovozli ogohlantirishni o'chirish"}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSoundMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>Ovoz o&apos;chiq</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sirena faol</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Critical Visual Alert Banner (Flashing Red Alarm) */}
      {activeRedAlert && (
        <div
          role="alert"
          data-testid="teacher-critical-alert"
          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-rose-950 border-2 border-rose-500 text-rose-100 shadow-lg animate-pulse"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-rose-300">
                REAL-TIME TREVOGA (WEB AUDIO ALARM) · {activeRedAlert.timestamp}
              </div>
              <p className="text-sm md:text-base font-bold text-white mt-0.5">
                {activeRedAlert.message}
              </p>
              <p className="text-xs text-rose-200/90 mt-1">
                FocusAccessibilityService 0ms da <code className="font-mono">{activeRedAlert.packageName}</code> oynasini ushladi va GLOBAL_ACTION_HOME orqali blokladi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissRedAlert}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tushunarli
          </button>
        </div>
      )}

      {/* Live Quiz Answer Notification Banner on Teacher Screen */}
      {lastQuizResultBanner && (
        <div
          data-testid="teacher-quiz-result-banner"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-950/80 border border-emerald-500/70 text-xs text-emerald-100"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-white text-sm">{lastQuizResultBanner}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 shrink-0">LIVE QUIZ NATIJASI</span>
        </div>
      )}

      {/* Classroom Action Controls & TOTP Generator */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left 7 cols: Duration Picker + Lock All + QR Button + End Lesson Report */}
        <div className="xl:col-span-7 flex flex-col justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/90">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Dars davomiyligini tanlang (SystemClock.elapsedRealtime() + localStorage)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_PRESETS.map((preset) => {
                const isSelected = selectedDurationMinutes === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onChangeDurationMinutes(preset.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono font-semibold text-sm text-white tabular-nums">
                      {preset.value} daqiqa
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {preset.value === 1 ? 'Test rejimi' : preset.value === 45 ? '1 akademik soat' : "To'liq juftlik"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onLockAllStudents}
              data-testid="lock-all-btn"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Barchani Bloklash</span>
            </button>

            <button
              type="button"
              onClick={onOpenQrModal}
              data-testid="show-qr-btn"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Kirish QR-kodini chiqarish</span>
            </button>

            <button
              type="button"
              data-testid="end-lesson-report-btn"
              onClick={onUnlockAllStudents}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Darsni yakunlash</span>
            </button>
          </div>
        </div>

        {/* Right 5 cols: Favqulodda Ochish Kodi (TOTP) Generator */}
        <div className="xl:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 whitespace-nowrap">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Favqulodda Ochish Kodi (TOTP)</span>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums whitespace-nowrap shrink-0">
              {totpState.secondsRemaining}s qoldi
            </span>
          </div>

          <div className="my-3 flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5">
            <div
              data-testid="totp-pin-display"
              className="text-2xl font-mono font-bold tracking-widest text-white tabular-nums whitespace-nowrap"
            >
              {totpState.code.slice(0, 3)} {totpState.code.slice(3, 6)}
            </div>
            <button
              type="button"
              onClick={handleCopyTotp}
              aria-label="TOTP PIN-kodni nusxalash"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedTotp ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nusxalandi</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nusxalash</span>
                </>
              )}
            </button>
          </div>

          <div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  totpState.secondsRemaining <= 10 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${totpState.progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Har 60 soniyada yangilanuvchi 6 xonali maxfiy PIN. O&apos;quvchi telefonini ochish uchun ishlating.
            </p>
          </div>
        </div>
      </div>

      {/* 4. ADMIN SOZLAMALARI: Ruxsat etilgan ichki o'quv vositalari (Toggle Switches) */}
      <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Sliders className="w-4 h-4 shrink-0" />
            <span>4. ADMIN SOZLAMALARI — Ruxsat Etilgan Ichki Vositalar (Toggle Switches)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            O&apos;chirilgan vosita o&apos;quvchi ekranidan darhol yo&apos;qoladi
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { key: 'aiTutor' as const, label: 'AI Ustoz', icon: GraduationCap },
            { key: 'calculator' as const, label: 'Kalkulyator', icon: Calculator },
            { key: 'dictionary' as const, label: "Lug'at", icon: BookOpen },
            { key: 'notes' as const, label: 'Daftar', icon: NotebookPen },
            { key: 'pdf' as const, label: 'PDF Kitob', icon: FileText },
          ].map(({ key, label, icon: Icon }) => {
            const enabled = allowedTools[key];
            return (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={enabled}
                data-testid={`admin-toggle-${key}`}
                onClick={() => onToggleAllowedTool(key)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  enabled
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      enabled ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <span className="text-xs font-semibold truncate">{label}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                    enabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {enabled ? 'ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LIVE QUIZ (Dars vaqtida sinfga tezkor savol yuborish) */}
      <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>2. LIVE QUIZ — Sinfga Tezkor Savol Yuborish (Qulflangan ekranda A, B, C, D test)</span>
          </div>
          {activeQuiz && (
            <span className="text-[11px] font-mono text-emerald-400">
              Faol savol yuborilgan ({activeQuiz.sentAt})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-5">
            <label htmlFor="quiz-template-select" className="sr-only">
              Tayyor savol shabloni
            </label>
            <select
              id="quiz-template-select"
              value={selectedQuizIndex}
              onChange={(e) => setSelectedQuizIndex(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {LIVE_QUIZ_TEMPLATES.map((tpl, index) => (
                <option key={tpl.subject} value={index}>
                  {index + 1}. {tpl.subject}: {tpl.questionText.slice(0, 42)}...
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="custom-quiz-input" className="sr-only">
              Maxsus savol matni (ixtiyoriy)
            </label>
            <input
              id="custom-quiz-input"
              type="text"
              value={customQuizQuestion}
              onChange={(e) => setCustomQuizQuestion(e.target.value)}
              placeholder="Yoki o'z savolingizni yozing (ixtiyoriy)..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-3 flex">
            <button
              type="button"
              data-testid="send-live-quiz-btn"
              onClick={() => {
                onSendLiveQuiz(selectedQuizIndex, customQuizQuestion.trim() || undefined);
                setCustomQuizQuestion('');
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sinfga savol yuborish</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. OTA-ONALAR UCHUN TELEGRAM BOT XABARNOMASI (PARENT ALERT PREVIEW) */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-sky-500/40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
            <MessageSquareShare className="w-4 h-4 shrink-0" />
            <span>3. Ota-onaga Hisobot Yuborish (Telegram Bot — @FocusLockParentBot)</span>
          </div>
          <button
            type="button"
            data-testid="send-parent-telegram-btn"
            onClick={onSendParentTelegramReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{selectedStudent.fullName} ota-onasiga yuborish</span>
          </button>
        </div>

        {latestParentMsg ? (
          <div
            data-testid="parent-telegram-preview-card"
            className="p-3.5 rounded-xl bg-slate-900 border border-sky-500/50 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-sky-400 font-semibold">
                Telegram Bot · Qabul qiluvchi: {latestParentMsg.parentPhone}
              </span>
              <span className="text-slate-400">
                {latestParentMsg.triggerReason === 'TAMPER_THRESHOLD_EXCEEDED'
                  ? 'AVTO-OGOHLANTIRISH (>3 urinish)'
                  : latestParentMsg.triggerReason === 'LESSON_COMPLETED'
                  ? 'DARS YAKUNI AVTO-HISOBOT'
                  : 'O‘QITUVCHI HISOBOTI'}{' '}
                · {latestParentMsg.sentAt}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
              &ldquo;{latestParentMsg.messageText}&rdquo;
            </p>
          </div>
        ) : null}
      </div>

      {/* Inline Session Analytics Summary Card */}
      {lastSessionReport && (
        <div
          data-testid="teacher-session-analytics-card"
          className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <BarChart3 className="w-4 h-4" />
              <span>DARS HISOBOTI ({lastSessionReport.studentName})</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono tabular-nums">
              <span>Fokusda: <strong className="text-white">{lastSessionReport.focusedMinutes} daq</strong></span>
              <span>·</span>
              <span>Bloklangan xabar: <strong className="text-emerald-400">{lastSessionReport.blockedNotificationsCount} ta</strong></span>
              <span>·</span>
              <span>Qoidabuzarlik: <strong className="text-rose-400">{lastSessionReport.tamperAttemptsCount} marta</strong></span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">
                Focus Score: {lastSessionReport.focusScorePercent}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSessionReportModal}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            To&apos;liq hisobotni ko&apos;rish
          </button>
        </div>
      )}

      {/* Classroom Student Roster Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Xonadagi O&apos;quvchilar Ro&apos;yxati (Simulyatsiya uchun o&apos;quvchini tanlang)</span>
          </div>
          <span className="text-xs text-slate-400">
            localStorage&apos;da avtomatik saqlanadi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-400 bg-slate-900/30">
                <th className="py-2.5 px-4">O&apos;quvchi F.I.Sh.</th>
                <th className="py-2.5 px-3">Holati</th>
                <th className="py-2.5 px-3">Qolgan vaqt</th>
                <th className="py-2.5 px-3">Focus XP · Olmos</th>
                <th className="py-2.5 px-3 text-right">Batareya</th>
                <th className="py-2.5 px-4 text-right">Qoidabuzarlik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {students.map((student) => {
                const remainingMs = getStudentRemainingLockMillis(student, elapsedRealtimeMs);
                const isCurrentlyLocked = student.isLocked && remainingMs > 0;
                const isSelected = student.id === selectedStudentId;
                const rankEntry = getLeaderboardStudents(students).find(
                  (e) => e.student.id === student.id
                );

                return (
                  <tr
                    key={student.id}
                    onClick={() => onSelectStudent(student.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/50 hover:bg-indigo-950/70'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {rankEntry && rankEntry.hasCrown && (
                          <Crown
                            className={`w-3.5 h-3.5 shrink-0 fill-current ${
                              rankEntry.crownTier === 'GOLD'
                                ? 'text-amber-400'
                                : rankEntry.crownTier === 'SILVER'
                                ? 'text-slate-300'
                                : 'text-amber-600'
                            }`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(student.id);
                          }}
                          className="font-semibold text-slate-100 hover:text-indigo-300 text-left cursor-pointer"
                        >
                          {student.fullName}
                        </button>
                        <span className="text-slate-500 font-mono">· {student.seatNumber}</span>
                        {isSelected && (
                          <span className="text-[11px] font-medium text-indigo-400">
                            (Faol)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {student.deviceModel} · GPS: {student.distanceMeters}m
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                      {isCurrentlyLocked ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Qulflangan</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-400">
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Bo&apos;sh</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-300 tabular-nums whitespace-nowrap">
                      {isCurrentlyLocked ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {formatCountdownClock(remainingMs)}
                        </span>
                      ) : (
                        <span className="text-slate-500">00:00</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {student.focusXp} XP
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="inline-flex items-center gap-1 text-cyan-300">
                          <Gem className="w-3 h-3 text-cyan-400" />
                          {student.focusCoins}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                        {student.batteryPercent}%
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      {student.tamperAttempts > 0 ? (
                        <span className="inline-flex items-center justify-end gap-1 font-bold text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {student.tamperAttempts} marta
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Security & Tamper Logs */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Terminal className="w-4 h-4 text-rose-400" />
            <span>Jonli Loglar (localStorage · BootReceiver · Telegram Bot)</span>
          </div>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Loglarni tozalash</span>
            </button>
          )}
        </div>

        <div
          data-testid="live-tamper-logs"
          className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs"
        >
          {logs.length === 0 ? (
            <div className="py-6 px-4 text-center text-slate-500 font-sans text-xs">
              Hozircha qoidabuzarlik qayd etilmadi. O&apos;ng tomondagi o&apos;quvchi telefonida Instagram, Telegram yoki Settings ustiga bosib ko&apos;ring.
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className={`px-4 py-2.5 flex items-start justify-between gap-3 ${
                  entry.severity === 'CRITICAL'
                    ? 'bg-rose-950/35 text-rose-200'
                    : entry.severity === 'WARNING'
                    ? 'bg-amber-950/25 text-amber-200'
                    : 'text-slate-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 tabular-nums">[{entry.timestamp}]</span>
                    <span
                      className={`font-bold ${
                        entry.severity === 'CRITICAL'
                          ? 'text-rose-400'
                          : entry.severity === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {entry.message}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Qurilma: {entry.studentName} · Paket: {entry.packageName}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 shrink-0">
                  {entry.type}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
