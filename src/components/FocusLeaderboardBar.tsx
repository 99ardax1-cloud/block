import React from 'react';
import {
  Crown,
  Gem,
  Zap,
  Monitor,
  Smartphone,
  Columns2,
  Radio,
  PlusCircle,
  Hash,
  Wifi,
} from 'lucide-react';
import { StudentDevice, getLeaderboardStudents } from '../utils/focusLockEngine';
import { SyncConnectionStatus } from '../utils/crossDeviceSync';

export type WorkspaceViewMode = 'split' | 'teacher_only' | 'student_only';

interface FocusLeaderboardBarProps {
  students: StudentDevice[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  onAwardPeacefulXp: () => void;
  viewMode: WorkspaceViewMode;
  onChangeViewMode: (mode: WorkspaceViewMode) => void;
  roomCode: string;
  onChangeRoomCode: (newRoomCode: string) => void;
  syncStatus: SyncConnectionStatus;
  onOpenRoleModal: () => void;
}

export const FocusLeaderboardBar: React.FC<FocusLeaderboardBarProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onAwardPeacefulXp,
  viewMode,
  onChangeViewMode,
  roomCode,
  onChangeRoomCode,
  syncStatus,
  onOpenRoleModal,
}) => {
  const leaderboard = getLeaderboardStudents(students);
  const topThree = leaderboard.slice(0, 3);

  const isAnyRealtimeConnected =
    syncStatus.mqttConnected || syncStatus.wsConnected || syncStatus.cloudHttpConnected;

  return (
    <section
      aria-label="Cross-Device Real-Time Sync va Sinf XP Reytingi (Leaderboard)"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
    >
      {/* Left 5 cols: CROSS-DEVICE REAL-TIME SYNC (MQTT + WebSocket + Room Code) */}
      <div
        data-testid="multitab-sync-panel"
        className="lg:col-span-5 rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
            <Radio className="w-4 h-4 shrink-0" />
            <span>CROSS-DEVICE REAL-TIME SYNC (MQTT + WS)</span>
          </div>
          <div
            data-testid="broadcast-channel-status"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 tabular-nums whitespace-nowrap"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {syncStatus.mqttConnected ? 'MQTT+WS ONLINE' : isAnyRealtimeConnected ? 'CLOUD SYNC ONLINE' : 'ULANMOQDA'}
              {syncStatus.lastSyncedAt ? ` · ${syncStatus.lastSyncedAt}` : ''}
            </span>
          </div>
        </div>

        {/* Room Code Input (XONA-304) + Role Modal Trigger */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-indigo-500/40">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Hash className="w-4 h-4 text-indigo-400 shrink-0" />
            <label htmlFor="teacher-room-code-input" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Xona Kodi:
            </label>
            <input
              id="teacher-room-code-input"
              data-testid="room-code-input"
              type="text"
              value={roomCode}
              onChange={(e) => onChangeRoomCode(e.target.value)}
              placeholder="XONA-304"
              className="w-full max-w-[130px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-indigo-300 uppercase focus:outline-none focus:border-indigo-400 tabular-nums"
            />
          </div>

          <button
            type="button"
            data-testid="open-role-chooser-btn"
            onClick={onOpenRoleModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Kirish rolini tanlash
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Kompyuterda <strong className="text-white">&quot;O&apos;qituvchi&quot;</strong>, telefoningizda esa shu ssilkani ochib bir xil{' '}
          <code className="font-mono text-indigo-300">{roomCode}</code> xona kodi bilan kiring. &quot;Barchani Bloklash&quot; bosilganda telefon <strong className="text-emerald-400">&lt;0.5s</strong> da qulflanadi!
        </p>

        {/* Segmented View Mode Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            data-testid="view-mode-split"
            onClick={() => onChangeViewMode('split')}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Split-Screen</span>
          </button>

          <button
            type="button"
            data-testid="view-mode-teacher"
            onClick={() => onChangeViewMode('teacher_only')}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'teacher_only'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">O&apos;qituvchi (PC)</span>
          </button>

          <button
            type="button"
            data-testid="view-mode-student"
            onClick={() => onChangeViewMode('student_only')}
            className={`px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'student_only'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">O&apos;quvchi (Tel)</span>
          </button>
        </div>
      </div>

      {/* Right 7 cols: 2. GAMIFIKATSIYA VA XP REYTING TIZIMI (Sinf Reytingi — Top Focus Students) */}
      <div
        data-testid="focus-leaderboard-card"
        className="lg:col-span-7 rounded-xl bg-slate-900/80 border border-amber-500/40 p-4 flex flex-col justify-between gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              2. SINF REYTINGI (TOP FOCUS STUDENTS — LEADERBOARD) · Har 10 daq: +50 XP · Qoidabuzarlik: -100 XP
            </span>
          </div>

          <button
            type="button"
            data-testid="award-peaceful-xp-btn"
            onClick={onAwardPeacefulXp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>+10 daq tinch fokus (+50 XP / +10 Olmos)</span>
          </button>
        </div>

        {/* Top 3 Crowned Podium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {topThree.map((entry) => {
            const isSelected = entry.student.id === selectedStudentId;
            const crownColor =
              entry.crownTier === 'GOLD'
                ? 'text-amber-400'
                : entry.crownTier === 'SILVER'
                ? 'text-slate-200'
                : 'text-amber-600';
            const borderColor =
              entry.crownTier === 'GOLD'
                ? 'border-amber-400/70 bg-amber-950/25'
                : entry.crownTier === 'SILVER'
                ? 'border-slate-600 bg-slate-950/80'
                : 'border-amber-700/60 bg-slate-950/80';

            return (
              <button
                key={entry.student.id}
                type="button"
                data-testid={`leaderboard-rank-${entry.rank}`}
                onClick={() => onSelectStudent(entry.student.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${borderColor} ${
                  isSelected ? 'ring-1 ring-indigo-400' : 'hover:border-amber-400/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white whitespace-nowrap">
                    <Crown className={`w-4 h-4 shrink-0 fill-current ${crownColor}`} />
                    <span>{entry.rank}-O&apos;RIN</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap">
                    Urindi: {entry.student.tamperAttempts}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-white truncate">
                    {entry.student.fullName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {entry.student.seatNumber} · {entry.student.peacefulMinutesAccrued} daq tinch
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 font-mono text-xs tabular-nums">
                  <span
                    data-testid={`leaderboard-xp-${entry.student.id}`}
                    className="inline-flex items-center gap-1 font-bold text-amber-300 whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{entry.student.focusXp} XP</span>
                  </span>

                  <span className="inline-flex items-center gap-1 font-semibold text-cyan-300 whitespace-nowrap">
                    <Gem className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{entry.student.focusCoins}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
