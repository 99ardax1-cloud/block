import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_STUDENTS,
  DEFAULT_ALLOWED_TOOLS,
  PHONE_APPS,
  LIVE_QUIZ_TEMPLATES,
  SAFE_AI_TUTOR_REFUSAL_MESSAGE,
  computeClassroomTotp,
  verifyTotpPin,
  getStudentRemainingLockMillis,
  lockAllStudents,
  unlockAllStudents,
  handleStudentAppAttempt,
  evaluateGeofenceMovement,
  interceptIncomingNotification,
  submitStudentLiveQuizAnswer,
  buildSessionAnalyticsReport,
  formatCountdownClock,
  simulateStudentDeviceReboot,
  getVisiblePhoneApps,
  buildParentTelegramNotification,
  generateClassroomCsvExport,
  evaluateSafeAiTutorPrompt,
  askStudentSafeAiTutor,
  awardPeacefulFocusXp,
  getLeaderboardStudents,
} from './focusLockEngine';

test('computeClassroomTotp produces a 6-digit PIN and rotates every 60 seconds', () => {
  const window1 = computeClassroomTotp(60_000);
  const window1Later = computeClassroomTotp(89_000);
  const window2 = computeClassroomTotp(120_000);

  assert.equal(window1.code.length, 6);
  assert.equal(window1.code, window1Later.code);
  assert.equal(window1Later.secondsRemaining, 31);
  assert.notEqual(window1.code, window2.code);
});

test('Safe AI Tutor blocks homework/test cheating requests and explains academic rules', () => {
  const blockedRes = evaluateSafeAiTutorPrompt(
    'Menga uy vazifasini/test javobini tayyor yechib ber',
    '12:00:00'
  );
  assert.equal(blockedRes.blockedBySafetyFilter, true);
  assert.equal(blockedRes.replyMessage.text, SAFE_AI_TUTOR_REFUSAL_MESSAGE);

  const allowedRes = askStudentSafeAiTutor(
    INITIAL_STUDENTS,
    'std-1',
    'Ingliz tili Present Perfect grammatika qoidasini tushuntirib ber',
    '12:01:00'
  );
  assert.equal(allowedRes.blockedBySafetyFilter, false);
  assert.equal(allowedRes.replyMessage.text.includes('Present Perfect'), true);
  assert.equal(allowedRes.logEntry.type, 'AI_TUTOR_QUERY');
});

test('Gamification awards +50 XP / +10 Coins for 10m focus and penalizes -100 XP on tamper', () => {
  const beforeStudent = INITIAL_STUDENTS.find((s) => s.id === 'std-1')!;
  const initialXp = beforeStudent.focusXp;
  const initialCoins = beforeStudent.focusCoins;

  // +50 XP and +10 Coins for 10 peaceful minutes
  const rewarded = awardPeacefulFocusXp(INITIAL_STUDENTS, '12:10:00', 'std-1');
  const afterReward = rewarded.updatedStudents.find((s) => s.id === 'std-1')!;
  assert.equal(afterReward.focusXp, initialXp + 50);
  assert.equal(afterReward.focusCoins, initialCoins + 10);

  // -100 XP penalty when tapping Instagram while locked
  const instagramApp = PHONE_APPS.find((a) => a.id === 'instagram')!;
  const tampered = handleStudentAppAttempt(
    rewarded.updatedStudents,
    'std-1',
    instagramApp,
    120_000,
    '12:11:00'
  );
  const afterTamper = tampered.updatedStudents.find((s) => s.id === 'std-1')!;
  assert.equal(tampered.intercepted, true);
  assert.equal(tampered.xpPenaltyApplied, 100);
  assert.equal(afterTamper.focusXp, initialXp + 50 - 100);

  // Leaderboard ranks top 3 with crowns
  const leaderboard = getLeaderboardStudents(tampered.updatedStudents);
  assert.equal(leaderboard.length, INITIAL_STUDENTS.length);
  assert.equal(leaderboard[0].rank, 1);
  assert.equal(leaderboard[0].crownTier, 'GOLD');
  assert.equal(leaderboard[1].crownTier, 'SILVER');
  assert.equal(leaderboard[2].crownTier, 'BRONZE');
  assert.equal(leaderboard[0].student.focusXp >= leaderboard[1].student.focusXp, true);
});

test('simulateStudentDeviceReboot triggers BootCompletedReceiver and keeps phone locked', () => {
  const res = simulateStudentDeviceReboot(INITIAL_STUDENTS, 'std-1', 160_000, '11:45:00');
  const rebootedStudent = res.updatedStudents.find((s) => s.id === 'std-1')!;

  assert.equal(rebootedStudent.isLocked, true);
  assert.equal(res.bootLog.type, 'BOOT_COMPLETED_RECEIVER');
  assert.equal(res.bootLog.message.includes('BootCompletedReceiver ishladi!'), true);
  assert.equal(getStudentRemainingLockMillis(rebootedStudent, 160_000) > 0, true);
});

test('getVisiblePhoneApps immediately hides Kalkulyator or AI Ustoz when toggled off by teacher', () => {
  const allApps = getVisiblePhoneApps(DEFAULT_ALLOWED_TOOLS);
  assert.equal(allApps.some((a) => a.id === 'calculator'), true);
  assert.equal(allApps.some((a) => a.id === 'ai_tutor'), true);

  const withoutCalcAndAi = getVisiblePhoneApps({
    ...DEFAULT_ALLOWED_TOOLS,
    calculator: false,
    aiTutor: false,
  });
  assert.equal(withoutCalcAndAi.some((a) => a.id === 'calculator'), false);
  assert.equal(withoutCalcAndAi.some((a) => a.id === 'ai_tutor'), false);
  assert.equal(withoutCalcAndAi.some((a) => a.id === 'dictionary'), true);
});

test('buildParentTelegramNotification formats exact parent Telegram message with 95% score', () => {
  const aliyev = INITIAL_STUDENTS[0]; // 1 tamper attempt -> 100 - 5 = 95%
  const msg = buildParentTelegramNotification(aliyev, 90, 'LESSON_COMPLETED', '12:00:00');

  assert.equal(msg.focusScorePercent, 95);
  assert.equal(
    msg.messageText.includes(
      'Hurmatli ota-ona! Farzandingiz Aliyev Vali bugungi darsda 90 daqiqa telefonini blokda saqladi. Diqqat ko\'rsatkichi: 95%.'
    ),
    true
  );
});

test('evaluateGeofenceMovement auto-locks an unlocked student when entering <=100m radius', () => {
  const res = evaluateGeofenceMovement(
    INITIAL_STUDENTS,
    'std-4',
    40,
    90,
    250_000,
    '11:40:00'
  );

  assert.equal(res.insideGeofence, true);
  assert.equal(res.autoLocked, true);
  const updatedSardor = res.updatedStudents.find((s) => s.id === 'std-4')!;
  assert.equal(updatedSardor.isLocked, true);
  assert.equal(updatedSardor.distanceMeters, 40);
  assert.ok(res.geofenceLog);
});

test('submitStudentLiveQuizAnswer and interceptIncomingNotification work accurately', () => {
  const sampleQuiz = {
    id: 'quiz-101',
    ...LIVE_QUIZ_TEMPLATES[0],
    sentAt: '11:42:00',
  };

  const correctRes = submitStudentLiveQuizAnswer(
    INITIAL_STUDENTS,
    'std-1',
    sampleQuiz,
    'A',
    '11:42:15'
  );
  assert.equal(correctRes.submission.isCorrect, true);

  const notifRes = interceptIncomingNotification(
    INITIAL_STUDENTS,
    'std-1',
    {
      appName: 'Telegram',
      packageName: 'org.telegram.messenger',
      sender: 'Sinfdoshlar',
      previewText: 'Test xabar',
    },
    '11:43:00'
  );
  const updatedVali = notifRes.updatedStudents.find((s) => s.id === 'std-1')!;
  assert.equal(updatedVali.missedNotifications[0].previewText, 'Test xabar');
});

test('generateClassroomCsvExport outputs valid CSV lines', () => {
  const csv = generateClassroomCsvExport(INITIAL_STUDENTS, 90);
  const lines = csv.split('\n');
  assert.equal(lines.length, INITIAL_STUDENTS.length + 1);
  assert.equal(lines[1].includes('Aliyev Vali'), true);
});

test('verifyTotpPin, lockAllStudents, unlockAllStudents, buildSessionAnalyticsReport, formatCountdownClock', () => {
  assert.equal(verifyTotpPin('482910', '482910'), true);
  const locked = lockAllStudents(INITIAL_STUDENTS, 45, 200_000);
  assert.equal(locked.every((s) => s.isLocked), true);
  const unlocked = unlockAllStudents(locked);
  assert.equal(unlocked.every((s) => !s.isLocked), true);
  const report = buildSessionAnalyticsReport(INITIAL_STUDENTS[0], 90, '13:00:00', 'Yakun');
  assert.equal(report.focusScorePercent >= 90, true);
  assert.equal(formatCountdownClock(65_000), '01:05');
});

test('normalizeRoomCode and getMqttTopicForRoom format XONA-304 room code accurately', async () => {
  const { normalizeRoomCode, getMqttTopicForRoom } = await import('./crossDeviceSync');
  const { DEFAULT_SESSION_ID } = await import('./focusLockEngine');
  assert.equal(DEFAULT_SESSION_ID, 'XONA-304');
  assert.equal(normalizeRoomCode(' xona 304 '), 'XONA-304');
  assert.equal(normalizeRoomCode(''), 'XONA-304');
  assert.equal(getMqttTopicForRoom('xona-304'), 'focuslock/uz/v6/room/XONA-304');
});

test('ANDROID_NATIVE_FILES contains all 18 complete Android Kotlin, Flutter Dart & Release APK files with zero TODOs', async () => {
  const { ANDROID_NATIVE_FILES, generateFullBuildScriptSh } = await import('../data/androidNativeFiles');
  assert.equal(ANDROID_NATIVE_FILES.length, 18);
  for (const file of ANDROID_NATIVE_FILES) {
    assert.ok(file.exactPath.length > 0);
    assert.ok(file.code.length > 100);
    assert.equal(file.code.includes('// TODO'), false);
  }
  const buildScript = generateFullBuildScriptSh();
  assert.equal(buildScript.includes('flutter build apk --release'), true);
  assert.equal(buildScript.includes('android/app/proguard-rules.pro'), true);
  assert.equal(buildScript.includes('android/app/src/main/res/values/strings.xml'), true);
});



