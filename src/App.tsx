import React, { useEffect, useRef, useState } from 'react';
import {
  INITIAL_STUDENTS,
  DEFAULT_ALLOWED_TOOLS,
  DEFAULT_SESSION_ID,
  StudentDevice,
  TamperLogEntry,
  PhoneAppDefinition,
  LiveQuizQuestion,
  LIVE_QUIZ_TEMPLATES,
  FAKE_TELEGRAM_MESSAGES,
  SessionAnalyticsReport,
  AllowedToolsConfig,
  ParentTelegramMessage,
  computeClassroomTotp,
  verifyTotpPin,
  lockAllStudents,
  unlockAllStudents,
  handleStudentAppAttempt,
  evaluateGeofenceMovement,
  interceptIncomingNotification,
  submitStudentLiveQuizAnswer,
  buildSessionAnalyticsReport,
  simulateStudentDeviceReboot,
  buildParentTelegramNotification,
  generateClassroomCsvExport,
  askStudentSafeAiTutor,
  awardPeacefulFocusXp,
} from './utils/focusLockEngine';
import {
  CrossDeviceRoomSynchronizer,
  SyncConnectionStatus,
  normalizeRoomCode,
} from './utils/crossDeviceSync';
import { soundEffects } from './utils/soundEffects';
import { GeofenceRadarBar } from './components/GeofenceRadarBar';
import { FocusLeaderboardBar, WorkspaceViewMode } from './components/FocusLeaderboardBar';
import { AdminDashboardPanel } from './components/AdminDashboardPanel';
import { StudentPhoneSimulator } from './components/StudentPhoneSimulator';
import { QrCodeModal } from './components/QrCodeModal';
import { SessionAnalyticsModal } from './components/SessionAnalyticsModal';
import { NativeKotlinCodeViewer } from './components/NativeKotlinCodeViewer';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { FlutterReleaseBuildModal } from './components/FlutterReleaseBuildModal';

const STORAGE_KEY = 'focus_lock_enterprise_state_v6';

interface PersistedAppState {
  students: StudentDevice[];
  selectedStudentId: string;
  selectedDurationMinutes: number;
  elapsedRealtimeMs: number;
  sessionId: string;
  allowedTools: AllowedToolsConfig;
  logs: TamperLogEntry[];
  parentTelegramMessages: ParentTelegramMessage[];
  activeQuiz: LiveQuizQuestion | null;
}

function getInitialViewMode(): WorkspaceViewMode {
  if (typeof window === 'undefined') return 'split';
  const params = new URLSearchParams(window.location.search);
  const viewParam = (params.get('view') || params.get('role') || '').toLowerCase();
  if (viewParam === 'teacher' || viewParam === 'teacher_only') return 'teacher_only';
  if (viewParam === 'student' || viewParam === 'student_only') return 'student_only';
  if (viewParam === 'split') return 'split';
  // Automatic Mobile Student Lock when screen width < 768px
  if (window.innerWidth < 768) {
    return 'student_only';
  }
  return 'split';
}

function getInitialRoomCode(persistedRoom?: string): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim()) {
      return normalizeRoomCode(roomParam);
    }
  }
  return normalizeRoomCode(persistedRoom || DEFAULT_SESSION_ID);
}

function loadPersistedState(): PersistedAppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAppState;
    if (!parsed || !Array.isArray(parsed.students) || parsed.students.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function App() {
  const initialPersisted = loadPersistedState();

  const [viewMode, setViewMode] = useState<WorkspaceViewMode>(() => getInitialViewMode());
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);

  const [students, setStudents] = useState<StudentDevice[]>(
    () => initialPersisted?.students || INITIAL_STUDENTS
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => initialPersisted?.selectedStudentId || INITIAL_STUDENTS[0].id
  );
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(
    () => initialPersisted?.selectedDurationMinutes || 90
  );
  const [elapsedRealtimeMs, setElapsedRealtimeMs] = useState<number>(
    () => initialPersisted?.elapsedRealtimeMs || 100_000
  );
  const [sessionId, setSessionId] = useState<string>(() =>
    getInitialRoomCode(initialPersisted?.sessionId)
  );
  const [allowedTools, setAllowedTools] = useState<AllowedToolsConfig>(
    () => initialPersisted?.allowedTools || DEFAULT_ALLOWED_TOOLS
  );

  const [syncStatus, setSyncStatus] = useState<SyncConnectionStatus>(() => ({
    mqttConnected: false,
    wsConnected: false,
    cloudHttpConnected: true,
    roomCode: getInitialRoomCode(initialPersisted?.sessionId),
    lastSyncedAt: null,
    lastTransport: null,
  }));

  const [wallClockOffsetMinutes, setWallClockOffsetMinutes] = useState<number>(0);
  const [nowEpochMs, setNowEpochMs] = useState<number>(() => Date.now());

  const [logs, setLogs] = useState<TamperLogEntry[]>(
    () =>
      initialPersisted?.logs || [
        {
          id: 'init-log-1',
          timestamp: '11:35:00',
          studentId: 'std-2',
          studentName: 'Karimov Jasur',
          appName: 'Telegram',
          packageName: 'org.telegram.messenger',
          type: 'APP_INTERCEPT',
          severity: 'CRITICAL',
          message: "DIQQAT! Karimov Jasur Telegram'ga kirishga urindi! (-100 XP jarima!)",
        },
      ]
  );

  const [parentTelegramMessages, setParentTelegramMessages] = useState<ParentTelegramMessage[]>(
    () =>
      initialPersisted?.parentTelegramMessages || [
        buildParentTelegramNotification(
          INITIAL_STUDENTS[0],
          90,
          'LESSON_COMPLETED',
          '11:35:00'
        ),
      ]
  );

  const [activeRedAlert, setActiveRedAlert] = useState<TamperLogEntry | null>(null);
  const [lastInterceptFeedback, setLastInterceptFeedback] = useState<string | null>(null);
  const [notificationShieldBanner, setNotificationShieldBanner] = useState<string | null>(null);
  const [fakeMsgCounter, setFakeMsgCounter] = useState<number>(0);

  const [activeQuiz, setActiveQuiz] = useState<LiveQuizQuestion | null>(
    () => initialPersisted?.activeQuiz || null
  );
  const [lastQuizResultBanner, setLastQuizResultBanner] = useState<string | null>(null);

  const [lastSessionReport, setLastSessionReport] = useState<SessionAnalyticsReport | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);

  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isReleaseBuildModalOpen, setIsReleaseBuildModalOpen] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  const syncRef = useRef<CrossDeviceRoomSynchronizer<PersistedAppState> | null>(null);
  const isApplyingRemoteSyncRef = useRef<boolean>(false);

  const getCurrentTimeFormatted = (): string => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}:${String(now.getSeconds()).padStart(2, '0')}`;
  };

  // Automatic Mobile Student Lock when screen width < 768px
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const params = new URLSearchParams(window.location.search);
      const explicitView = params.get('view') || params.get('role');
      if (!explicitView && window.innerWidth < 768) {
        setViewMode('student_only');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup Cross-Device Room Synchronizer (MQTT + WebSocket + HTTP Fast Sync + BroadcastChannel + Storage)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyRemotePayload = (incoming: PersistedAppState) => {
      if (!incoming || !Array.isArray(incoming.students)) return;
      isApplyingRemoteSyncRef.current = true;
      setStudents(incoming.students);
      setSelectedDurationMinutes(incoming.selectedDurationMinutes);
      setElapsedRealtimeMs(incoming.elapsedRealtimeMs);
      if (incoming.sessionId) {
        setSessionId(normalizeRoomCode(incoming.sessionId));
      }
      setAllowedTools(incoming.allowedTools);
      setLogs(incoming.logs);
      setParentTelegramMessages(incoming.parentTelegramMessages);
      setActiveQuiz(incoming.activeQuiz);

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
      } catch {
        // Ignore quota errors
      }

      setTimeout(() => {
        isApplyingRemoteSyncRef.current = false;
      }, 40);
    };

    const synchronizer = new CrossDeviceRoomSynchronizer<PersistedAppState>({
      roomCode: sessionId,
      onReceiveState: (payload) => {
        applyRemotePayload(payload);
      },
      onStatusChange: (status) => {
        setSyncStatus(status);
      },
    });
    synchronizer.start();
    syncRef.current = synchronizer;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as PersistedAppState;
          if (parsed && Array.isArray(parsed.students)) {
            applyRemotePayload(parsed);
          }
        } catch {
          // Ignore malformed JSON
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      synchronizer.stop();
      syncRef.current = null;
    };
  }, []);

  // Broadcast helper for immediate cross-device (Computer <-> Mobile Phone) and cross-tab sync
  const broadcastStateSnapshot = (overrides: Partial<PersistedAppState>) => {
    if (typeof window === 'undefined') return;
    const normalizedRoom = normalizeRoomCode(overrides.sessionId ?? sessionId);
    const payload: PersistedAppState = {
      students: overrides.students ?? students,
      selectedStudentId: overrides.selectedStudentId ?? selectedStudentId,
      selectedDurationMinutes: overrides.selectedDurationMinutes ?? selectedDurationMinutes,
      elapsedRealtimeMs: overrides.elapsedRealtimeMs ?? elapsedRealtimeMs,
      sessionId: normalizedRoom,
      allowedTools: overrides.allowedTools ?? allowedTools,
      logs: (overrides.logs ?? logs).slice(0, 30),
      parentTelegramMessages: (overrides.parentTelegramMessages ?? parentTelegramMessages).slice(
        0,
        10
      ),
      activeQuiz: overrides.activeQuiz !== undefined ? overrides.activeQuiz : activeQuiz,
    };

    const timestamp = getCurrentTimeFormatted();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }

    if (syncRef.current && !isApplyingRemoteSyncRef.current) {
      syncRef.current.publishState(payload, timestamp);
    }
  };

  // Handle changing Room Code ("XONA-304") on either Teacher or Student device
  const handleChangeRoomCode = (nextRoomRaw: string) => {
    const normalized = normalizeRoomCode(nextRoomRaw);
    setSessionId(normalized);
    if (syncRef.current) {
      syncRef.current.changeRoom(normalized);
    }
  };

  // Persist to localStorage on state changes (including timer ticks)
  useEffect(() => {
    if (typeof window === 'undefined' || isApplyingRemoteSyncRef.current) return;
    try {
      const payload: PersistedAppState = {
        students,
        selectedStudentId,
        selectedDurationMinutes,
        elapsedRealtimeMs,
        sessionId,
        allowedTools,
        logs: logs.slice(0, 30),
        parentTelegramMessages: parentTelegramMessages.slice(0, 10),
        activeQuiz,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [
    students,
    selectedStudentId,
    selectedDurationMinutes,
    elapsedRealtimeMs,
    sessionId,
    allowedTools,
    logs,
    parentTelegramMessages,
    activeQuiz,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedRealtimeMs((prev) => prev + 1000);
      setNowEpochMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totpState = computeClassroomTotp(nowEpochMs);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) || students[0];

  // 1. GPS Geofence Distance Change Handler
  const handleGeofenceDistanceChange = (newDistanceMeters: number) => {
    const timeStr = getCurrentTimeFormatted();
    const res = evaluateGeofenceMovement(
      students,
      selectedStudent.id,
      newDistanceMeters,
      selectedDurationMinutes,
      elapsedRealtimeMs,
      timeStr
    );

    setStudents(res.updatedStudents);
    const nextLogs = res.geofenceLog ? [res.geofenceLog, ...logs] : logs;
    if (res.geofenceLog) {
      setLogs(nextLogs);
    }

    if (res.autoLocked) {
      soundEffects.playSuccessChime();
      setLastInterceptFeedback(
        `GPS Geofencing (<=100m): O'quv markazi hududiga kirildi (${newDistanceMeters}m). Telefon AVTOMATIK qulflandi!`
      );
    }

    broadcastStateSnapshot({
      students: res.updatedStudents,
      logs: nextLogs,
    });
  };

  // Lock all students in the room (immediately syncs to Student Phone via MQTT + WebSocket!)
  const handleLockAllStudents = () => {
    const updated = lockAllStudents(
      students,
      selectedDurationMinutes,
      elapsedRealtimeMs,
      sessionId
    );
    setStudents(updated);
    soundEffects.playSuccessChime();

    const newLog: TamperLogEntry = {
      id: `log-lock-all-${Date.now()}`,
      timestamp: getCurrentTimeFormatted(),
      studentId: 'all',
      studentName: 'Barcha o‘quvchilar (5 ta qurilma)',
      appName: 'Focus Lock Kiosk',
      packageName: 'uz.edu.focuslock',
      type: 'SESSION_START',
      severity: 'INFO',
      message: `Dars boshlandi (${sessionId}): Barcha o'quvchilar ${selectedDurationMinutes} daqiqaga bloklandi.`,
    };
    const nextLogs = [newLog, ...logs];
    setLogs(nextLogs);
    setLastInterceptFeedback(null);
    setNotificationShieldBanner(null);

    broadcastStateSnapshot({
      students: updated,
      logs: nextLogs,
    });
  };

  // Unlock all students, Generate Session Analytics Report & Auto-Send Parent Telegram Card
  const handleUnlockAllStudents = () => {
    const timeStr = getCurrentTimeFormatted();
    const report = buildSessionAnalyticsReport(
      selectedStudent,
      selectedDurationMinutes,
      timeStr,
      "O'qituvchi darsni yakunladi"
    );
    setLastSessionReport(report);
    setIsAnalyticsModalOpen(true);

    const parentCard = buildParentTelegramNotification(
      selectedStudent,
      selectedDurationMinutes,
      'LESSON_COMPLETED',
      timeStr
    );
    const nextParentMsgs = [parentCard, ...parentTelegramMessages];
    setParentTelegramMessages(nextParentMsgs);

    const updated = unlockAllStudents(students);
    setStudents(updated);
    soundEffects.playSuccessChime();

    const newLog: TamperLogEntry = {
      id: `log-unlock-all-${Date.now()}`,
      timestamp: timeStr,
      studentId: 'all',
      studentName: 'Barcha o‘quvchilar',
      appName: 'Session Analytics & Parent Bot',
      packageName: 'uz.edu.focuslock',
      type: 'TOTP_UNLOCK',
      severity: 'INFO',
      message: `Dars yakunlandi! ${selectedStudent.fullName} ota-onasiga Telegram hisobot yuborildi (Focus Score: ${report.focusScorePercent}%).`,
    };
    const nextLogs = [newLog, ...logs];
    setLogs(nextLogs);
    setActiveRedAlert(null);
    setLastInterceptFeedback(null);

    broadcastStateSnapshot({
      students: updated,
      logs: nextLogs,
      parentTelegramMessages: nextParentMsgs,
    });
  };

  // Teacher sends Live Quiz
  const handleSendLiveQuiz = (templateIndex: number, customQuestionText?: string) => {
    const tpl = LIVE_QUIZ_TEMPLATES[templateIndex] || LIVE_QUIZ_TEMPLATES[0];
    const timeStr = getCurrentTimeFormatted();
    const quiz: LiveQuizQuestion = {
      id: `quiz-${Date.now()}`,
      subject: tpl.subject,
      questionText: customQuestionText || tpl.questionText,
      options: tpl.options,
      correctOption: tpl.correctOption,
      sentAt: timeStr,
    };

    setActiveQuiz(quiz);
    setLastQuizResultBanner(null);
    soundEffects.playSuccessChime();

    const quizLog: TamperLogEntry = {
      id: `log-quiz-send-${Date.now()}`,
      timestamp: timeStr,
      studentId: 'all',
      studentName: 'Sinf o‘quvchilari',
      appName: `Live Quiz (${quiz.subject})`,
      packageName: 'uz.edu.focuslock.quiz',
      type: 'LIVE_QUIZ_SENT',
      severity: 'INFO',
      message: `O'qituvchi sinfga tezkor Live Quiz savolini yubordi: "${quiz.questionText}"`,
    };
    const nextLogs = [quizLog, ...logs];
    setLogs(nextLogs);

    broadcastStateSnapshot({
      activeQuiz: quiz,
      logs: nextLogs,
    });
  };

  // Student answers Live Quiz
  const handleStudentAnswerLiveQuiz = (selectedOption: 'A' | 'B' | 'C' | 'D') => {
    if (!activeQuiz) return;
    const timeStr = getCurrentTimeFormatted();
    const res = submitStudentLiveQuizAnswer(
      students,
      selectedStudent.id,
      activeQuiz,
      selectedOption,
      timeStr
    );

    setStudents(res.updatedStudents);
    const nextLogs = [res.logEntry, ...logs];
    setLogs(nextLogs);

    const bannerText = res.submission.isCorrect
      ? `${selectedStudent.fullName} to'g'ri javob berdi (${selectedOption}) (+25 XP)`
      : `${selectedStudent.fullName} javob berdi (${selectedOption} — Xato, to'g'ri javob: ${activeQuiz.correctOption})`;

    setLastQuizResultBanner(bannerText);
    if (res.submission.isCorrect) {
      soundEffects.playSuccessChime();
    } else {
      soundEffects.playTamperSiren();
    }

    broadcastStateSnapshot({
      students: res.updatedStudents,
      logs: nextLogs,
    });
  };

  // Student taps an app -> If blocked, deducts -100 XP & checks if tamperAttempts > 3
  const handleStudentAttemptOpenApp = (app: PhoneAppDefinition) => {
    const timeStr = getCurrentTimeFormatted();
    const outcome = handleStudentAppAttempt(
      students,
      selectedStudent.id,
      app,
      elapsedRealtimeMs,
      timeStr
    );

    setStudents(outcome.updatedStudents);
    let nextLogs = logs;
    let nextParentMsgs = parentTelegramMessages;

    if (outcome.intercepted && outcome.alertLog) {
      soundEffects.playTamperSiren();
      setActiveRedAlert(outcome.alertLog);
      nextLogs = [outcome.alertLog, ...logs];
      setLogs(nextLogs);
      setLastInterceptFeedback(
        `"${app.name}" (${app.packageName}) bloklandi! -${outcome.xpPenaltyApplied} XP jarima berildi va o'qituvchiga qizil trevoga yuborildi.`
      );

      const updatedStudent =
        outcome.updatedStudents.find((s) => s.id === selectedStudent.id) || selectedStudent;
      if (outcome.newTamperCount > 3) {
        const autoParentCard = buildParentTelegramNotification(
          updatedStudent,
          selectedDurationMinutes,
          'TAMPER_THRESHOLD_EXCEEDED',
          timeStr
        );
        nextParentMsgs = [autoParentCard, ...parentTelegramMessages];
        setParentTelegramMessages(nextParentMsgs);
      }
    } else {
      setLastInterceptFeedback(null);
    }

    broadcastStateSnapshot({
      students: outcome.updatedStudents,
      logs: nextLogs,
      parentTelegramMessages: nextParentMsgs,
    });
  };

  // Student asks a question to the Built-in Safe AI Tutor ("AI Ustoz")
  const handleAskSafeAiTutor = (questionText: string) => {
    const timeStr = getCurrentTimeFormatted();
    const res = askStudentSafeAiTutor(
      students,
      selectedStudent.id,
      questionText,
      timeStr
    );

    setStudents(res.updatedStudents);
    const nextLogs = [res.logEntry, ...logs];
    setLogs(nextLogs);

    if (res.blockedBySafetyFilter) {
      soundEffects.playTamperSiren();
    } else {
      soundEffects.playSuccessChime();
    }

    broadcastStateSnapshot({
      students: res.updatedStudents,
      logs: nextLogs,
    });
  };

  // Award +50 Focus XP and +10 Olmos/Coins for 10 minutes of peaceful locked focus
  const handleAwardPeacefulXp = () => {
    const timeStr = getCurrentTimeFormatted();
    const res = awardPeacefulFocusXp(students, timeStr);
    setStudents(res.updatedStudents);
    const nextLogs = [res.logEntry, ...logs];
    setLogs(nextLogs);
    soundEffects.playSuccessChime();

    broadcastStateSnapshot({
      students: res.updatedStudents,
      logs: nextLogs,
    });
  };

  // Student updates study notes (Daftar) -> persisted in localStorage & synced
  const handleUpdateStudyNotes = (notes: string) => {
    const updated = students.map((s) =>
      s.id === selectedStudent.id ? { ...s, studyNotes: notes } : s
    );
    setStudents(updated);
    broadcastStateSnapshot({ students: updated });
  };

  // Student tries to tamper with device wall clock
  const handleStudentClockTamper = (minutesForward: number) => {
    setWallClockOffsetMinutes((prev) => prev + minutesForward);
    soundEffects.playTamperSiren();

    const timeStr = getCurrentTimeFormatted();
    const tamperLog: TamperLogEntry = {
      id: `log-clock-${Date.now()}`,
      timestamp: timeStr,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      appName: 'Date & Time (Soat)',
      packageName: 'com.android.settings.datetime',
      type: 'CLOCK_TAMPER',
      severity: 'CRITICAL',
      message: `DIQQAT! ${selectedStudent.fullName} telefon soatini +${minutesForward} daqiqa oldinga surishga urindi! SystemClock.elapsedRealtime() qulfni saqlab qoldi! (-100 XP)`,
    };

    const updated = students.map((s) =>
      s.id === selectedStudent.id
        ? {
            ...s,
            tamperAttempts: s.tamperAttempts + 1,
            focusXp: Math.max(0, s.focusXp - 100),
          }
        : s
    );
    const nextLogs = [tamperLog, ...logs];

    setStudents(updated);
    setActiveRedAlert(tamperLog);
    setLogs(nextLogs);
    setLastInterceptFeedback(
      `Soat +${minutesForward} daqiqaga o'zgartirildi, ammo LockStorage.kt SystemClock.elapsedRealtime() orqali ishlagani uchun taymer aldanmadi! (-100 XP jarima)`
    );

    broadcastStateSnapshot({
      students: updated,
      logs: nextLogs,
    });
  };

  // Fake Notification Shield
  const handleSendFakeTelegramNotification = () => {
    const msgTemplate = FAKE_TELEGRAM_MESSAGES[fakeMsgCounter % FAKE_TELEGRAM_MESSAGES.length];
    setFakeMsgCounter((prev) => prev + 1);

    const timeStr = getCurrentTimeFormatted();
    const res = interceptIncomingNotification(
      students,
      selectedStudent.id,
      msgTemplate,
      timeStr
    );

    const nextLogs = [res.logEntry, ...logs];
    setStudents(res.updatedStudents);
    setLogs(nextLogs);
    setNotificationShieldBanner(
      `NotificationBlocker xizmati: ${msgTemplate.appName} xabari ("${msgTemplate.sender}") tutib qolindi va o'chirildi (Yashirildi).`
    );

    broadcastStateSnapshot({
      students: res.updatedStudents,
      logs: nextLogs,
    });
  };

  // Student unlocks with 6-digit TOTP PIN
  const handleSubmitTotpPin = (enteredPin: string): { success: boolean; message: string } => {
    if (verifyTotpPin(enteredPin, totpState.code)) {
      const timeStr = getCurrentTimeFormatted();
      const report = buildSessionAnalyticsReport(
        selectedStudent,
        selectedDurationMinutes,
        timeStr,
        `Favqulodda TOTP PIN (${totpState.code}) orqali ochildi`
      );
      setLastSessionReport(report);
      if (viewMode !== 'student_only') {
        setIsAnalyticsModalOpen(true);
      }

      const parentCard = buildParentTelegramNotification(
        selectedStudent,
        selectedDurationMinutes,
        'LESSON_COMPLETED',
        timeStr
      );
      const nextParentMsgs = [parentCard, ...parentTelegramMessages];
      setParentTelegramMessages(nextParentMsgs);

      soundEffects.playSuccessChime();
      const updated = students.map((s) =>
        s.id === selectedStudent.id
          ? { ...s, isLocked: false, lockDurationMillis: 0, startElapsedRealtime: 0 }
          : s
      );
      setStudents(updated);

      const unlockLog: TamperLogEntry = {
        id: `log-totp-${Date.now()}`,
        timestamp: timeStr,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        appName: 'TOTP Emergency Unlock',
        packageName: 'uz.edu.focuslock',
        type: 'TOTP_UNLOCK',
        severity: 'INFO',
        message: `${selectedStudent.fullName} TOTP PIN-kod (${totpState.code}) orqali ochildi. Focus Score: ${report.focusScorePercent}%.`,
      };
      const nextLogs = [unlockLog, ...logs];
      setLogs(nextLogs);
      setLastInterceptFeedback(null);

      broadcastStateSnapshot({
        students: updated,
        logs: nextLogs,
        parentTelegramMessages: nextParentMsgs,
      });

      return {
        success: true,
        message: `TOTP tasdiqlandi! Focus Score: ${report.focusScorePercent}%`,
      };
    }

    soundEffects.playTamperSiren();
    return {
      success: false,
      message: `Noto'g'ri PIN-kod! O'qituvchi ekranidagi joriy 6 xonali TOTP kodni (${totpState.code}) kiriting.`,
    };
  };

  // Student scans classroom QR code -> joins sessionId and locks
  const handleScanClassroomQr = () => {
    const durationMs = selectedDurationMinutes * 60 * 1000;
    soundEffects.playSuccessChime();
    const updated = students.map((s) =>
      s.id === selectedStudent.id
        ? {
            ...s,
            isLocked: true,
            lockDurationMillis: durationMs,
            startElapsedRealtime: elapsedRealtimeMs,
            lastActivePackage: 'uz.edu.focuslock',
            connectedSessionId: sessionId,
          }
        : s
    );
    setStudents(updated);

    const qrLog: TamperLogEntry = {
      id: `log-qr-${Date.now()}`,
      timestamp: getCurrentTimeFormatted(),
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      appName: 'QR Camera Scanner',
      packageName: 'uz.edu.focuslock',
      type: 'QR_SCAN_LOCK',
      severity: 'INFO',
      message: `${selectedStudent.fullName} kamera skaneri orqali "${sessionId}" xonasiga ulandi va ${selectedDurationMinutes} daqiqaga bloklandi.`,
    };
    const nextLogs = [qrLog, ...logs];
    setLogs(nextLogs);
    setLastInterceptFeedback(
      `Kamera QR-kodni skanerladi! Xona: ${sessionId} (${selectedDurationMinutes} daqiqa qulf).`
    );

    broadcastStateSnapshot({
      students: updated,
      logs: nextLogs,
    });
  };

  // 1. Simulate Reboot -> BootCompletedReceiver restores lock
  const handleSimulateReboot = () => {
    const timeStr = getCurrentTimeFormatted();
    const res = simulateStudentDeviceReboot(
      students,
      selectedStudent.id,
      elapsedRealtimeMs,
      timeStr
    );

    const nextLogs = [res.bootLog, ...logs];
    setStudents(res.updatedStudents);
    setLogs(nextLogs);
    soundEffects.playTamperSiren();

    broadcastStateSnapshot({
      students: res.updatedStudents,
      logs: nextLogs,
    });
  };

  // 2. Regenerate Dynamic Room / Session ID for QR Code
  const handleRegenerateSessionId = () => {
    const suffix = Math.floor(100 + Math.random() * 900);
    const nextSessionId = normalizeRoomCode(`XONA-${suffix}`);
    handleChangeRoomCode(nextSessionId);
    broadcastStateSnapshot({ sessionId: nextSessionId });
  };

  // 3. Manual Teacher Send Parent Telegram Bot Report
  const handleSendParentTelegramReport = () => {
    const timeStr = getCurrentTimeFormatted();
    const msg = buildParentTelegramNotification(
      selectedStudent,
      selectedDurationMinutes,
      'MANUAL_TEACHER_SEND',
      timeStr
    );
    const nextParentMsgs = [msg, ...parentTelegramMessages];
    setParentTelegramMessages(nextParentMsgs);
    soundEffects.playSuccessChime();

    const tgLog: TamperLogEntry = {
      id: `log-tg-${Date.now()}`,
      timestamp: timeStr,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      appName: 'Telegram Parent Bot',
      packageName: 'org.telegram.bot.focuslock',
      type: 'TELEGRAM_PARENT_ALERT',
      severity: 'INFO',
      message: `Telegram Bot orqali ${selectedStudent.fullName} ota-onasiga hisobot yuborildi (Diqqat: ${msg.focusScorePercent}%).`,
    };
    const nextLogs = [tgLog, ...logs];
    setLogs(nextLogs);

    broadcastStateSnapshot({
      parentTelegramMessages: nextParentMsgs,
      logs: nextLogs,
    });
  };

  // 4. Toggle Allowed Internal Tools (AI Ustoz, Kalkulyator, Lug'at, Daftar, PDF)
  const handleToggleAllowedTool = (toolKey: keyof AllowedToolsConfig) => {
    const nextTools: AllowedToolsConfig = {
      ...allowedTools,
      [toolKey]: !allowedTools[toolKey],
    };
    setAllowedTools(nextTools);
    broadcastStateSnapshot({ allowedTools: nextTools });
  };

  // Export CSV Report
  const handleExportCsvReport = () => {
    const csvContent = generateClassroomCsvExport(students, selectedDurationMinutes);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-lock-report-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleSoundMute = () => {
    const nextMuted = !isSoundMuted;
    setIsSoundMuted(nextMuted);
    soundEffects.isMuted = nextMuted;
  };

  // Strict Student Kiosk Mode check:
  // When in student_only mode (mobile < 768px, ?view=student, or chosen via Role Selection),
  // COMPLETELY HIDE the top header, mode switchers, leaderboard bar, geofence bar, and teacher dashboard!
  const isStrictStudentKiosk = viewMode === 'student_only';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Strict 3-Zone Top Bar Contract (Completely hidden in Student Kiosk Mode!) */}
      {!isStrictStudentKiosk && (
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 sticky top-0 z-30 backdrop-blur">
          {/* Zone 1: Single text element Brand wordmark */}
          <a
            href="#simulator-workspace"
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Focus Lock Studio
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a
              href="#leaderboard-section"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sinf XP Reytingi
            </a>
            <a
              href="#geofence-section"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              GPS Geofence Radar
            </a>
            <a
              href="#simulator-workspace"
              onClick={(e) => {
                e.preventDefault();
                setIsQrModalOpen(true);
              }}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Dinamik QR-Kod
            </a>
            <a
              href="#native-kotlin-code"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Android Kotlin Kodlar
            </a>
          </nav>

          {/* Zone 3: 1 primary CTA action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleLockAllStudents}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Barchani Bloklash ({selectedDurationMinutes} daq)
            </button>
          </div>
        </header>
      )}

      {/* Main Content Container */}
      <main
        className={`flex-1 w-full max-w-[1440px] mx-auto ${
          isStrictStudentKiosk ? 'px-2 sm:px-4 py-2' : 'px-4 sm:px-6 py-5 space-y-6'
        }`}
      >
        {/* Teacher / Split-Screen Controls (Completely hidden in Student Kiosk Mode!) */}
        {!isStrictStudentKiosk && (
          <>
            <div id="leaderboard-section">
              <FocusLeaderboardBar
                students={students}
                selectedStudentId={selectedStudent.id}
                onSelectStudent={(id) => {
                  setSelectedStudentId(id);
                  setLastInterceptFeedback(null);
                  setNotificationShieldBanner(null);
                  broadcastStateSnapshot({ selectedStudentId: id });
                }}
                onAwardPeacefulXp={handleAwardPeacefulXp}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                roomCode={sessionId}
                onChangeRoomCode={handleChangeRoomCode}
                syncStatus={syncStatus}
                onOpenRoleModal={() => setIsRoleModalOpen(true)}
              />
            </div>

            <div id="geofence-section">
              <GeofenceRadarBar
                student={selectedStudent}
                elapsedRealtimeMs={elapsedRealtimeMs}
                onDistanceChange={handleGeofenceDistanceChange}
              />
            </div>
          </>
        )}

        {/* Dynamic Workspace: Split-Screen / Teacher-Only / Strict Student-Only Kiosk */}
        <div
          id="simulator-workspace"
          data-testid={`workspace-mode-${viewMode}`}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* Left Side: O'qituvchi Boshqaruv Paneli (Admin Dashboard) — Hidden in student_only */}
          {(viewMode === 'split' || viewMode === 'teacher_only') && (
            <div
              className={`${
                viewMode === 'teacher_only' ? 'lg:col-span-12' : 'lg:col-span-7'
              } flex flex-col`}
            >
              <AdminDashboardPanel
                students={students}
                selectedStudentId={selectedStudent.id}
                onSelectStudent={(id) => {
                  setSelectedStudentId(id);
                  setLastInterceptFeedback(null);
                  setNotificationShieldBanner(null);
                  broadcastStateSnapshot({ selectedStudentId: id });
                }}
                selectedDurationMinutes={selectedDurationMinutes}
                onChangeDurationMinutes={(mins) => {
                  setSelectedDurationMinutes(mins);
                  broadcastStateSnapshot({ selectedDurationMinutes: mins });
                }}
                sessionId={sessionId}
                onLockAllStudents={handleLockAllStudents}
                onUnlockAllStudents={handleUnlockAllStudents}
                onOpenQrModal={() => setIsQrModalOpen(true)}
                onSendLiveQuiz={handleSendLiveQuiz}
                activeQuiz={activeQuiz}
                lastQuizResultBanner={lastQuizResultBanner}
                lastSessionReport={lastSessionReport}
                onOpenSessionReportModal={() => setIsAnalyticsModalOpen(true)}
                allowedTools={allowedTools}
                onToggleAllowedTool={handleToggleAllowedTool}
                parentTelegramMessages={parentTelegramMessages}
                onSendParentTelegramReport={handleSendParentTelegramReport}
                onExportCsvReport={handleExportCsvReport}
                totpState={totpState}
                elapsedRealtimeMs={elapsedRealtimeMs}
                logs={logs}
                onClearLogs={() => {
                  setLogs([]);
                  setActiveRedAlert(null);
                  broadcastStateSnapshot({ logs: [] });
                }}
                activeRedAlert={activeRedAlert}
                onDismissRedAlert={() => setActiveRedAlert(null)}
                isSoundMuted={isSoundMuted}
                onToggleSoundMute={handleToggleSoundMute}
              />
            </div>
          )}

          {/* Right Side: O'quvchi Smartfoni Simulyatori (Kiosk Mode) */}
          {(viewMode === 'split' || viewMode === 'student_only') && (
            <div
              className={`${
                viewMode === 'student_only'
                  ? 'lg:col-span-12 max-w-md mx-auto w-full'
                  : 'lg:col-span-5'
              } flex flex-col`}
            >
              <StudentPhoneSimulator
                student={selectedStudent}
                allStudents={students}
                onSelectStudent={(id) => {
                  setSelectedStudentId(id);
                  setLastInterceptFeedback(null);
                  setNotificationShieldBanner(null);
                }}
                isStudentOnlyMode={isStrictStudentKiosk}
                onChangeRoomCode={handleChangeRoomCode}
                sessionId={sessionId}
                allowedTools={allowedTools}
                elapsedRealtimeMs={elapsedRealtimeMs}
                wallClockOffsetMinutes={wallClockOffsetMinutes}
                activeQuiz={activeQuiz}
                onAnswerLiveQuiz={handleStudentAnswerLiveQuiz}
                onAttemptOpenApp={handleStudentAttemptOpenApp}
                onUpdateStudyNotes={handleUpdateStudyNotes}
                onAskSafeAiTutor={handleAskSafeAiTutor}
                onAttemptClockTamper={handleStudentClockTamper}
                onSendFakeTelegramNotification={handleSendFakeTelegramNotification}
                notificationShieldBanner={notificationShieldBanner}
                onSubmitTotpPin={handleSubmitTotpPin}
                onScanClassroomQr={handleScanClassroomQr}
                onSimulateReboot={handleSimulateReboot}
                lastInterceptFeedback={lastInterceptFeedback}
                lastSessionReport={lastSessionReport}
              />
            </div>
          )}
        </div>

        {/* Full Step 1-4 Android Native + Flutter Code Repository (Hidden in student_only) */}
        {!isStrictStudentKiosk && (
          <NativeKotlinCodeViewer
            onOpenReleaseBuildModal={() => setIsReleaseBuildModalOpen(true)}
          />
        )}
      </main>

      {/* Flutter Release APK Build Pipeline & Auto-Script Exporter Modal */}
      <FlutterReleaseBuildModal
        isOpen={isReleaseBuildModalOpen}
        onClose={() => setIsReleaseBuildModalOpen(false)}
        roomCode={sessionId}
      />

      {/* Role Selection Modal (Kirish: O'qituvchi / O'quvchi / Split-Screen) */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        roomCode={sessionId}
        onChangeRoomCode={handleChangeRoomCode}
        students={students}
        selectedStudentId={selectedStudent.id}
        onSelectStudent={(id) => {
          setSelectedStudentId(id);
          setLastInterceptFeedback(null);
          setNotificationShieldBanner(null);
        }}
        currentViewMode={viewMode}
        onSelectViewMode={(mode) => {
          setViewMode(mode);
          setIsRoleModalOpen(false);
        }}
      />

      {/* Dynamic Classroom QR Code Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        sessionId={sessionId}
        onRegenerateSessionId={handleRegenerateSessionId}
        durationMinutes={selectedDurationMinutes}
        totpCode={totpState.code}
        onSimulateStudentQrScan={handleScanClassroomQr}
      />

      {/* End-of-Lesson Session Analytics Modal */}
      <SessionAnalyticsModal
        report={isAnalyticsModalOpen && !isStrictStudentKiosk ? lastSessionReport : null}
        onClose={() => setIsAnalyticsModalOpen(false)}
        onStartNewSession={handleLockAllStudents}
      />
    </div>
  );
}
