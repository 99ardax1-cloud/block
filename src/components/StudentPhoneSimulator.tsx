import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Battery,
  Wifi,
  QrCode,
  KeyRound,
  BellOff,
  Clock,
  Instagram,
  Send,
  Settings,
  Video,
  Youtube,
  BookOpen,
  FastForward,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Inbox,
  BarChart3,
  Power,
  Camera,
  Calculator,
  NotebookPen,
  FileText,
  GraduationCap,
  Zap,
  Gem,
} from 'lucide-react';
import {
  StudentDevice,
  PhoneAppDefinition,
  LiveQuizQuestion,
  SessionAnalyticsReport,
  AllowedToolsConfig,
  getVisiblePhoneApps,
  getStudentRemainingLockMillis,
  formatCountdownClock,
} from '../utils/focusLockEngine';

interface StudentPhoneSimulatorProps {
  student: StudentDevice;
  allStudents?: StudentDevice[];
  onSelectStudent?: (studentId: string) => void;
  sessionId: string;
  onChangeRoomCode?: (newRoomCode: string) => void;
  isStudentOnlyMode?: boolean;
  onExitStudentOnlyModeOnDesktop?: () => void;
  allowedTools: AllowedToolsConfig;
  elapsedRealtimeMs: number;
  wallClockOffsetMinutes: number;
  activeQuiz: LiveQuizQuestion | null;
  onAnswerLiveQuiz: (option: 'A' | 'B' | 'C' | 'D') => void;
  onAttemptOpenApp: (app: PhoneAppDefinition) => void;
  onUpdateStudyNotes: (notes: string) => void;
  onAskSafeAiTutor: (questionText: string) => void;
  onAttemptClockTamper: (minutesForward: number) => void;
  onSendFakeTelegramNotification: () => void;
  notificationShieldBanner: string | null;
  onSubmitTotpPin: (enteredPin: string) => { success: boolean; message: string };
  onScanClassroomQr: () => void;
  onSimulateReboot: () => void;
  lastInterceptFeedback: string | null;
  lastSessionReport: SessionAnalyticsReport | null;
}

export const StudentPhoneSimulator: React.FC<StudentPhoneSimulatorProps> = ({
  student,
  allStudents,
  onSelectStudent,
  sessionId,
  onChangeRoomCode,
  isStudentOnlyMode = false,
  onExitStudentOnlyModeOnDesktop,
  allowedTools,
  elapsedRealtimeMs,
  wallClockOffsetMinutes,
  activeQuiz,
  onAnswerLiveQuiz,
  onAttemptOpenApp,
  onUpdateStudyNotes,
  onAskSafeAiTutor,
  onAttemptClockTamper,
  onSendFakeTelegramNotification,
  notificationShieldBanner,
  onSubmitTotpPin,
  onScanClassroomQr,
  onSimulateReboot,
  lastInterceptFeedback,
  lastSessionReport,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [activeAllowedApp, setActiveAllowedApp] = useState<PhoneAppDefinition | null>(null);

  // Safe AI Tutor input state
  const [aiQuestionInput, setAiQuestionInput] = useState('');

  // Reboot simulation state (3 seconds black screen "Android Booting..." -> "BootCompletedReceiver ishladi!")
  const [isRebooting, setIsRebooting] = useState(false);
  const [bootReceiverBanner, setBootReceiverBanner] = useState<string | null>(null);

  // Camera QR Scanner animation state
  const [isCameraScanning, setIsCameraScanning] = useState(false);

  // Simple calculator state inside phone when Kalkulyator is opened
  const [calcExpr, setCalcExpr] = useState('12 * 8 = 96');

  const remainingMs = getStudentRemainingLockMillis(student, elapsedRealtimeMs);
  const isLocked = student.isLocked && remainingMs > 0;

  const visibleApps = getVisiblePhoneApps(allowedTools);

  const hasAnsweredCurrentQuiz =
    activeQuiz && student.lastQuizSubmission?.quizId === activeQuiz.id;

  const baseDate = new Date(2026, 9, 26, 11, 35, 0);
  const tamperedDate = new Date(baseDate.getTime() + wallClockOffsetMinutes * 60 * 1000);
  const wallClockStr = `${String(tamperedDate.getHours()).padStart(2, '0')}:${String(
    tamperedDate.getMinutes()
  ).padStart(2, '0')}`;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSubmitTotpPin(pinInput);
    setPinStatus({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    if (res.success) {
      setPinInput('');
    }
  };

  const handleAiTutorFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestionInput.trim()) return;
    onAskSafeAiTutor(aiQuestionInput.trim());
    setAiQuestionInput('');
  };

  const handleTriggerReboot = () => {
    if (isRebooting) return;
    setIsRebooting(true);
    setActiveAllowedApp(null);
    setBootReceiverBanner(null);

    setTimeout(() => {
      onSimulateReboot();
      setIsRebooting(false);
      setBootReceiverBanner(
        "BootCompletedReceiver ishladi! Telefon yonganda to'g'ridan-to'g'ri Qulf Ekraniga (Block Screen) tushdi!"
      );
    }, 3000);
  };

  const handleTriggerCameraQrScan = () => {
    if (isCameraScanning) return;
    setIsCameraScanning(true);
    setTimeout(() => {
      onScanClassroomQr();
      setIsCameraScanning(false);
    }, 1200);
  };

  const renderAppIcon = (appId: string) => {
    switch (appId) {
      case 'instagram':
        return <Instagram className="w-5 h-5 text-pink-400" />;
      case 'telegram':
        return <Send className="w-5 h-5 text-sky-400" />;
      case 'settings':
        return <Settings className="w-5 h-5 text-slate-300" />;
      case 'tiktok':
        return <Video className="w-5 h-5 text-teal-400" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-400" />;
      case 'ai_tutor':
        return <GraduationCap className="w-5 h-5 text-indigo-400" />;
      case 'calculator':
        return <Calculator className="w-5 h-5 text-emerald-400" />;
      case 'notes':
        return <NotebookPen className="w-5 h-5 text-emerald-400" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-emerald-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
    }
  };

  const latestAiReply =
    [...student.aiTutorHistory].reverse().find((m) => m.sender === 'ai_tutor') || null;

  return (
    <section
      aria-label="O'quvchi Smartfoni Simulyatori (Kiosk Mode)"
      className="flex flex-col gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5"
    >
      {/* Mobile Kiosk Room & Student Bar (Only in Student-Only / Mobile Kiosk Mode) */}
      {isStudentOnlyMode && (
        <div
          data-testid="mobile-kiosk-room-bar"
          className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950 border border-emerald-500/40"
        >
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="mobile-room-input" className="text-xs font-semibold text-slate-300">
              Xona:
            </label>
            <input
              id="mobile-room-input"
              data-testid="mobile-room-code-input"
              type="text"
              value={sessionId}
              onChange={(e) => onChangeRoomCode?.(e.target.value)}
              className="w-28 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-300 uppercase focus:outline-none focus:border-emerald-400"
            />

            {allStudents && onSelectStudent && (
              <select
                aria-label="O'quvchi ismini tanlash"
                data-testid="mobile-student-select"
                value={student.id}
                onChange={(e) => onSelectStudent(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
              >
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.seatNumber})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400">
              MQTT+WS SYNC FAOL
            </span>
            {onExitStudentOnlyModeOnDesktop && (
              <button
                type="button"
                onClick={onExitStudentOnlyModeOnDesktop}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700 cursor-pointer"
              >
                Kompyuter rejimiga qaytish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="text-xs font-medium text-emerald-400">
            {isStudentOnlyMode
              ? `FOCUS LOCK MOBILE KIOSK · XONA: ${sessionId}`
              : "2-QISM · O'NG PANEL · O'QUVCHI TELEFONI (KIOSK SIMULYATOR)"}
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            {student.fullName} — {student.deviceModel}
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 tabular-nums">
          <span
            data-testid="phone-student-xp"
            className="inline-flex items-center gap-1 font-bold text-amber-300"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {student.focusXp} XP
          </span>
          <span aria-hidden="true">·</span>
          <span
            data-testid="phone-student-coins"
            className="inline-flex items-center gap-1 font-semibold text-cyan-300"
          >
            <Gem className="w-3.5 h-3.5 text-cyan-400" />
            {student.focusCoins}
          </span>
          <span aria-hidden="true">·</span>
          <span className={isLocked ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
            {isLocked ? 'KIOSK LOCK FAOL' : 'QULF OCHIQ'}
          </span>
        </div>
      </div>

      {/* Main Layout: Phone Bezel + Security Test Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Android Phone Frame (7 cols) */}
        <div className="xl:col-span-7 flex flex-col items-center gap-3">
          <div className="relative w-full max-w-[356px] rounded-[28px] border-4 border-slate-700 bg-slate-950 shadow-2xl overflow-hidden flex flex-col">
            {/* 1. REBOOT BLACK SCREEN OVERLAY (3 Seconds "Android Booting...") */}
            {isRebooting && (
              <div
                data-testid="phone-reboot-overlay"
                className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center p-6 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <div className="space-y-1">
                  <div className="text-base font-mono font-bold text-white tracking-wider">
                    Android Booting...
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    ACTION_BOOT_COMPLETED · DirectBootAware
                  </p>
                  <p className="text-[11px] text-indigo-400 pt-2">
                    BootCompletedReceiver.kt EncryptedSharedPreferences xotirasini tekshirmoqda...
                  </p>
                </div>
              </div>
            )}

            {/* 2. CAMERA QR SCANNER OVERLAY */}
            {isCameraScanning && (
              <div
                data-testid="phone-camera-qr-overlay"
                className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4"
              >
                <div className="relative w-44 h-44 rounded-2xl border-2 border-emerald-400 flex items-center justify-center overflow-hidden bg-slate-900">
                  <Camera className="w-10 h-10 text-emerald-400/50 animate-pulse" />
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">QR Kamera Skaneri Faol...</div>
                  <div className="text-xs font-mono text-emerald-400">
                    Sessiya: {sessionId} ulanmoqda
                  </div>
                </div>
              </div>
            )}

            {/* Android Status Bar */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-300 tabular-nums">
              <div className="flex items-center gap-1.5">
                <span>{wallClockStr}</span>
                {wallClockOffsetMinutes !== 0 && (
                  <span className="text-[10px] text-amber-400">
                    (+{wallClockOffsetMinutes}m surilgan)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Wifi className="w-3.5 h-3.5 text-slate-400" />
                <span className="inline-flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  {student.batteryPercent}%
                </span>
              </div>
            </div>

            {/* Phone Screen Viewport */}
            <div className="relative p-4 flex flex-col gap-3.5 min-h-[540px] justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
              {/* BootCompletedReceiver Alert Banner after Reboot */}
              {bootReceiverBanner && (
                <div
                  data-testid="phone-boot-receiver-banner"
                  className="p-3 rounded-xl bg-amber-950/95 border border-amber-400 text-xs text-amber-100 flex items-start gap-2"
                >
                  <Power className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">BootCompletedReceiver ishladi!</div>
                    <div className="text-[11px] text-amber-200 mt-0.5">{bootReceiverBanner}</div>
                  </div>
                </div>
              )}

              {/* LIVE QUIZ OVERLAY MODAL ON LOCKED PHONE SCREEN */}
              {activeQuiz && !hasAnsweredCurrentQuiz && (
                <div
                  data-testid="phone-live-quiz-modal"
                  className="p-4 rounded-2xl bg-indigo-950/95 border-2 border-indigo-400 shadow-2xl space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                    <span className="inline-flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-400" />
                      <span>LIVE QUIZ · {activeQuiz.subject}</span>
                    </span>
                    <span className="font-mono text-[10px] text-indigo-200">{activeQuiz.sentAt}</span>
                  </div>

                  <p className="text-xs font-bold text-white leading-relaxed">
                    {activeQuiz.questionText}
                  </p>

                  <div className="grid grid-cols-1 gap-1.5">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                      <button
                        key={optKey}
                        type="button"
                        data-testid={`phone-quiz-option-${optKey}`}
                        onClick={() => onAnswerLiveQuiz(optKey)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-left text-xs text-slate-100 border border-slate-700 hover:border-indigo-300 transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <span className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center font-mono font-bold text-indigo-300 shrink-0">
                          {optKey}
                        </span>
                        <span className="truncate">{activeQuiz.options[optKey]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Kiosk Lock Status Banner */}
              <div
                data-testid="phone-lock-status-banner"
                className={`p-3.5 rounded-2xl border transition-colors ${
                  isLocked
                    ? 'bg-indigo-950/60 border-indigo-500/60'
                    : 'bg-emerald-950/40 border-emerald-600/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 whitespace-nowrap">
                    {isLocked ? (
                      <>
                        <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Focus Lock Kiosk Rejimi</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Qurilma Qulfdan Chiqarilgan</span>
                      </>
                    )}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap">
                    Urindi: {student.tamperAttempts}
                  </span>
                </div>

                {/* Big Monotonic Countdown */}
                <div className="mt-2 text-center">
                  <div
                    data-testid="phone-countdown-timer"
                    className="text-3xl font-mono font-bold tracking-wider text-white tabular-nums"
                  >
                    {isLocked ? formatCountdownClock(remainingMs) : '00:00'}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-300 mt-1 tabular-nums whitespace-nowrap">
                    <span className="text-amber-300 font-semibold">{student.focusXp} XP</span>
                    <span>·</span>
                    <span className="text-cyan-300 font-semibold">{student.focusCoins} Olmos</span>
                    <span>·</span>
                    <code className="text-indigo-300">{student.connectedSessionId}</code>
                  </div>
                </div>
              </div>

              {/* NotificationBlocker Shield Animation Banner */}
              {notificationShieldBanner && (
                <div
                  data-testid="phone-notification-shield-banner"
                  className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-xs text-emerald-100 flex items-start gap-2.5 transition-all"
                >
                  <BellOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">
                      NotificationBlocker Qalqoni (Yashirildi)
                    </div>
                    <div className="text-[11px] text-emerald-200 mt-0.5">
                      {notificationShieldBanner}
                    </div>
                  </div>
                </div>
              )}

              {/* Intercept Feedback Banner inside Phone */}
              {lastInterceptFeedback && (
                <div
                  data-testid="phone-intercept-banner"
                  className="p-3 rounded-xl bg-rose-950/90 border border-rose-500 text-xs text-rose-100 flex items-start gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">FocusAccessibilityService (0ms)</div>
                    <div className="text-[11px] text-rose-200 mt-0.5">{lastInterceptFeedback}</div>
                  </div>
                </div>
              )}

              {/* Post-Lesson Missed Notifications Box on Phone when Unlocked */}
              {!isLocked && (
                <div
                  data-testid="phone-missed-notifications-box"
                  className="p-3 rounded-xl bg-slate-900/95 border border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5" />
                      <span>O&apos;tkazib yuborilgan xabarlar ({student.missedNotifications.length})</span>
                    </span>
                    {lastSessionReport && (
                      <span className="font-mono text-[11px] text-white">
                        Focus: {lastSessionReport.focusScorePercent}%
                      </span>
                    )}
                  </div>

                  {student.missedNotifications.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Dars vaqtida bloklangan xabarlar yo&apos;q.
                    </p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                      {student.missedNotifications.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]"
                        >
                          <div className="flex justify-between text-slate-300 font-semibold">
                            <span>
                              {item.appName} · {item.sender}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {item.timestamp}
                            </span>
                          </div>
                          <div className="text-slate-400 truncate mt-0.5">{item.previewText}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Active Allowed Educational Tool Workspace (AI Ustoz / Daftar / Kalkulyator / Lug'at / PDF) */}
              {activeAllowedApp && (
                <div
                  data-testid={`phone-active-tool-${activeAllowedApp.id}`}
                  className="p-3 rounded-xl bg-slate-900/95 border border-indigo-500/60 text-xs text-slate-100 space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      {renderAppIcon(activeAllowedApp.id)}
                      <span>{activeAllowedApp.name} (Ichki Ruxsat Etilgan Vosita)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveAllowedApp(null)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium cursor-pointer"
                    >
                      Yopish
                    </button>
                  </div>

                  {activeAllowedApp.id === 'ai_tutor' ? (
                    <div data-testid="phone-ai-tutor-panel" className="space-y-2.5">
                      <div className="text-[11px] text-indigo-300">
                        Savol so&apos;rang (Xavfsizlik filtri tayyor uy vazifa/test javobini bloklaydi):
                      </div>

                      {/* Quick 1-click presets for testing */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          data-testid="ai-preset-grammar"
                          onClick={() =>
                            onAskSafeAiTutor(
                              'Ingliz tili Present Perfect grammatika qoidasini tushuntirib ber'
                            )
                          }
                          className="px-2 py-1 rounded-md bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-[10px] text-indigo-200 cursor-pointer"
                        >
                          Present Perfect qoidasi
                        </button>
                        <button
                          type="button"
                          data-testid="ai-preset-math"
                          onClick={() =>
                            onAskSafeAiTutor('Matematika kvadrat tenglama diskriminant formulasi')
                          }
                          className="px-2 py-1 rounded-md bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-[10px] text-indigo-200 cursor-pointer"
                        >
                          Kvadrat tenglama
                        </button>
                        <button
                          type="button"
                          data-testid="ai-preset-cheat"
                          onClick={() =>
                            onAskSafeAiTutor('Menga uy vazifasini/test javobini tayyor yechib ber')
                          }
                          className="px-2 py-1 rounded-md bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-[10px] text-rose-200 cursor-pointer"
                        >
                          Test javobini tayyor yechib ber (Filtr testi)
                        </button>
                      </div>

                      {/* Latest AI Tutor Response Box */}
                      {latestAiReply && (
                        <div
                          data-testid="ai-tutor-response-box"
                          className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                            latestAiReply.blockedBySafetyFilter
                              ? 'bg-rose-950/90 border-rose-500 text-rose-100'
                              : 'bg-slate-950 border-emerald-500/50 text-emerald-100'
                          }`}
                        >
                          <div className="font-mono text-[10px] font-bold uppercase mb-1 flex items-center justify-between">
                            <span>{latestAiReply.topicTag || 'AI Ustoz Javobi'}</span>
                            <span>{latestAiReply.timestamp}</span>
                          </div>
                          <p className="font-medium text-white">{latestAiReply.text}</p>
                        </div>
                      )}

                      {/* Custom Question Input */}
                      <form onSubmit={handleAiTutorFormSubmit} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          data-testid="ai-tutor-input"
                          value={aiQuestionInput}
                          onChange={(e) => setAiQuestionInput(e.target.value)}
                          placeholder="Qoida yoki formula so'rang..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          data-testid="ai-tutor-send-btn"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          So&apos;rash
                        </button>
                      </form>
                    </div>
                  ) : activeAllowedApp.id === 'notes' ? (
                    <div className="space-y-1">
                      <label htmlFor="student-notes-textarea" className="text-[11px] text-emerald-200">
                        Dars konspekti (localStorage xotirasida saqlanadi):
                      </label>
                      <textarea
                        id="student-notes-textarea"
                        rows={3}
                        value={student.studyNotes}
                        onChange={(e) => onUpdateStudyNotes(e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-950 border border-emerald-700 text-xs text-white focus:outline-none"
                      />
                    </div>
                  ) : activeAllowedApp.id === 'calculator' ? (
                    <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-lg border border-emerald-800 font-mono">
                      <span>{calcExpr}</span>
                      <button
                        type="button"
                        onClick={() => setCalcExpr('log₂(32) = 5')}
                        className="px-2 py-1 rounded bg-emerald-800 text-[10px] text-white cursor-pointer"
                      >
                        log₂(32)
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-200">
                      Paket: <code className="font-mono">{activeAllowedApp.packageName}</code> faol.
                    </div>
                  )}
                </div>
              )}

              {/* App Launcher Grid (Blocked Social + Teacher-Toggled Allowed Tools including AI Ustoz) */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                    Ilovalar va Ichki Vositalar:
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                    {visibleApps.length} ta faol
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {visibleApps.map((app) => {
                    const isAllowed = app.category === 'ALLOWED_EDU';
                    return (
                      <button
                        key={app.id}
                        type="button"
                        data-testid={`phone-app-${app.id}`}
                        onClick={() => {
                          if (isAllowed) {
                            setActiveAllowedApp(app);
                          } else {
                            setActiveAllowedApp(null);
                          }
                          onAttemptOpenApp(app);
                        }}
                        className={`px-1.5 py-2 rounded-xl border flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                          isAllowed
                            ? app.id === 'ai_tutor'
                              ? 'bg-indigo-950/70 border-indigo-500/70 hover:border-indigo-400'
                              : 'bg-slate-900/90 border-emerald-700/50 hover:border-emerald-500'
                            : 'bg-slate-900/90 border-slate-800 hover:border-rose-500/70 hover:bg-slate-900'
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                          {renderAppIcon(app.id)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-100 whitespace-nowrap">
                          {app.name}
                        </div>
                        <div
                          className={`text-[10px] whitespace-nowrap ${
                            isAllowed ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isAllowed ? 'Ruxsat' : '-100 XP'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emergency TOTP PIN Unlock Input inside Phone */}
              <form
                onSubmit={handlePinSubmit}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
              >
                <label
                  htmlFor="phone-totp-input"
                  className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-300"
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Favqulodda TOTP PIN</span>
                  </span>
                  <span className="text-slate-400 font-mono whitespace-nowrap">6 xonali</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="phone-totp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Masalan: 482910"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 tabular-nums"
                  />
                  <button
                    type="submit"
                    data-testid="phone-totp-submit"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Ochish
                  </button>
                </div>
                {pinStatus && (
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${
                      pinStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pinStatus.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{pinStatus.text}</span>
                  </div>
                )}
              </form>

              {/* Android Bottom Navigation Bar */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-slate-500 text-xs">
                <span>◁ Back</span>
                <span className="font-mono text-[11px] text-slate-400">● HOME (Kiosk)</span>
                <span>▢ Recents</span>
              </div>
            </div>
          </div>

          {/* 1. Simulate Reboot Button directly under the Phone Bezel */}
          <button
            type="button"
            data-testid="simulate-reboot-btn"
            onClick={handleTriggerReboot}
            disabled={isRebooting}
            className="w-full max-w-[356px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 border border-rose-500/60 text-rose-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Power className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Telefonni o&apos;chirib-yoqish (Simulate Reboot)</span>
          </button>
        </div>

        {/* Right 5 cols: Native Security & Tamper Attack Simulation Controls */}
        <div className="xl:col-span-5 flex flex-col gap-3.5 min-w-0">
          {/* 1. Built-in Safe AI Tutor Quick Launcher Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">1. Safe AI Ustoz (Dars Yordamchisi)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Grammatika va Matematika qoidalarini tushuntiradi, ammo tayyor javob so&apos;ralsa rad etadi.
            </p>
            <button
              type="button"
              data-testid="open-ai-tutor-quick-btn"
              onClick={() => {
                const aiApp = visibleApps.find((a) => a.id === 'ai_tutor');
                if (aiApp) {
                  setActiveAllowedApp(aiApp);
                }
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">AI Ustoz oynasini ochish</span>
            </button>
          </div>

          {/* 2. Dynamic QR Camera Scanner Trigger */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <Camera className="w-4 h-4 shrink-0" />
              <span className="truncate">2. Dinamik QR Skanerlash</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kamera skaneri orqali <code className="font-mono text-[11px] text-indigo-300">{sessionId}</code> sessiyasiga ulanib avtomatik qulflanadi.
            </p>
            <button
              type="button"
              onClick={handleTriggerCameraQrScan}
              data-testid="phone-scan-qr-btn"
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">QR Skanerlash (Kamera)</span>
            </button>
          </div>

          {/* 3. Fake Notification Shield Trigger */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-emerald-400">
              <span className="inline-flex items-center gap-1.5 truncate">
                <BellOff className="w-4 h-4 shrink-0" />
                <span className="truncate">Bildirishnomalar Qalqoni</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">
                Qutida: {student.missedNotifications.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dars vaqtida Telegram xabari kelsa, <code className="font-mono text-[11px] text-slate-200">NotificationBlocker</code> uni tutib qoladi.
            </p>
            <button
              type="button"
              onClick={onSendFakeTelegramNotification}
              data-testid="simulate-notification-btn"
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <BellOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Fake Notification (Telegram)</span>
            </button>
          </div>

          {/* 4. SystemClock.elapsedRealtime() vs Wall-Clock Tamper Test */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">Soatni Surish (Time Tamper)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Telefon soati +2 soat oldinga surilsa ham, <code className="font-mono text-[11px] text-slate-200">elapsedRealtime()</code> aldanmaydi!
            </p>
            <button
              type="button"
              onClick={() => onAttemptClockTamper(120)}
              data-testid="clock-tamper-btn"
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Soatni +2 soat surish</span>
            </button>
          </div>

          {/* EncryptedSharedPreferences & BroadcastChannel Sync Inspector */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 font-mono text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-semibold font-sans text-xs mb-1">
              <span className="inline-flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">LockStorage + Multi-Tab Sync</span>
              </span>
              {lastSessionReport && (
                <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{lastSessionReport.focusScorePercent}%</span>
                </span>
              )}
            </div>
            <div className="flex justify-between gap-2 text-slate-400">
              <span>isLocked:</span>
              <span className={isLocked ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                {String(isLocked)}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-slate-400">
              <span>ruxsat_vositalar:</span>
              <span className="text-emerald-400 tabular-nums">
                {Object.values(allowedTools).filter(Boolean).length}/5 yoqilgan
              </span>
            </div>
            <div className="flex justify-between gap-2 text-slate-400">
              <span>elapsedRealtime:</span>
              <span className="text-indigo-300 tabular-nums">{elapsedRealtimeMs}L</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
