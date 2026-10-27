import React from 'react';
import { Monitor, Smartphone, Columns2, Hash, ShieldCheck, X } from 'lucide-react';
import { StudentDevice } from '../utils/focusLockEngine';
import { WorkspaceViewMode } from './FocusLeaderboardBar';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  onChangeRoomCode: (code: string) => void;
  students: StudentDevice[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  currentViewMode: WorkspaceViewMode;
  onSelectViewMode: (mode: WorkspaceViewMode) => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  onChangeRoomCode,
  students,
  selectedStudentId,
  onSelectStudent,
  currentViewMode,
  onSelectViewMode,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      data-testid="role-selection-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 id="role-modal-title" className="text-base font-bold text-white">
              Focus Lock — Kirish Rolini va Xona Kodini Tanlang
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Rol tanlash oynasini yopish"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shared Room Code Input (XONA-304) */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2">
          <label
            htmlFor="modal-room-code-input"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300"
          >
            <Hash className="w-4 h-4 text-indigo-400" />
            <span>Umumiy Xona Kodi (Kompyuter va Telefonda bir xil bo&apos;lsin):</span>
          </label>
          <input
            id="modal-room-code-input"
            data-testid="modal-room-code-input"
            type="text"
            value={roomCode}
            onChange={(e) => onChangeRoomCode(e.target.value)}
            placeholder="Masalan: XONA-304"
            className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-white uppercase focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-400">
            MQTT (<code className="font-mono text-indigo-300">wss://broker.emqx.io:8084/mqtt</code>) va WebSocket orqali barcha qurilmalar 0.5 soniyada sinxronlanadi.
          </p>
        </div>

        {/* Student Identity Picker (For Phone Mode) */}
        <div className="space-y-1.5">
          <label htmlFor="modal-student-select" className="block text-xs font-semibold text-slate-300">
            O&apos;quvchi ismi (Telefon rejimi uchun):
          </label>
          <select
            id="modal-student-select"
            value={selectedStudentId}
            onChange={(e) => onSelectStudent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.seatNumber} — {s.deviceModel})
              </option>
            ))}
          </select>
        </div>

        {/* Role Choice Cards */}
        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            data-testid="choose-role-teacher"
            onClick={() => {
              onSelectViewMode('teacher_only');
              onClose();
            }}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              currentViewMode === 'teacher_only'
                ? 'bg-indigo-950/60 border-indigo-400 text-white'
                : 'bg-slate-950 border-slate-800 hover:border-indigo-500/60 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40">
                <Monitor className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Kirish: O&apos;qituvchi (Kompyuter)
                </div>
                <div className="text-xs text-slate-400">
                  Admin Boshqaruv Paneli: Barchani Bloklash, Live Quiz, Vositalar va Hisobot
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            data-testid="choose-role-student"
            onClick={() => {
              onSelectViewMode('student_only');
              onClose();
            }}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              currentViewMode === 'student_only'
                ? 'bg-emerald-950/60 border-emerald-400 text-white'
                : 'bg-slate-950 border-slate-800 hover:border-emerald-500/60 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Kirish: O&apos;quvchi (Telefon — Kiosk Mode)
                </div>
                <div className="text-xs text-slate-400">
                  O&apos;qituvchi paneli va yuqori menyular butunlay yashiriladi — faqat Telefon Kiosk ekrani
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            data-testid="choose-role-split"
            onClick={() => {
              onSelectViewMode('split');
              onClose();
            }}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
              currentViewMode === 'split'
                ? 'bg-slate-800 border-slate-500 text-white'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                <Columns2 className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Split-Screen Simulyator (Kompyuterda ikkala ekran)
                </div>
                <div className="text-xs text-slate-400">
                  Chapda O&apos;qituvchi paneli, o&apos;ngda O&apos;quvchi telefoni yonma-yon
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
