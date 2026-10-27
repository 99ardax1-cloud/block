import React from 'react';
import {
  Award,
  Clock,
  BellOff,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import { SessionAnalyticsReport } from '../utils/focusLockEngine';

interface SessionAnalyticsModalProps {
  report: SessionAnalyticsReport | null;
  onClose: () => void;
  onStartNewSession: () => void;
}

export const SessionAnalyticsModal: React.FC<SessionAnalyticsModalProps> = ({
  report,
  onClose,
  onStartNewSession,
}) => {
  if (!report) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-analytics-title"
      data-testid="session-analytics-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                SESSION ANALYTICS · {report.completedAt}
              </div>
              <h3 id="session-analytics-title" className="text-lg font-bold text-white">
                Dars Yakuni Hisoboti ({report.studentName})
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Hisobot oynasini yopish"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Highlight Focus Score Banner */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-300">
              Diqqat Reytingi (Focus Score)
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sabab: {report.unlockReason}
            </p>
          </div>
          <div
            data-testid="analytics-focus-score"
            className={`text-2xl font-mono font-bold tabular-nums whitespace-nowrap shrink-0 ${
              report.focusScorePercent >= 90
                ? 'text-emerald-400'
                : report.focusScorePercent >= 75
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            Focus Score: {report.focusScorePercent}%
          </div>
        </div>

        {/* 3 Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Fokus vaqti</span>
            </div>
            <div
              data-testid="analytics-focused-minutes"
              className="text-xl font-mono font-bold text-white tabular-nums"
            >
              {report.focusedMinutes} daqiqa
            </div>
            <div className="text-[11px] text-slate-400">Uzluksiz dars rejimi</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <BellOff className="w-4 h-4 shrink-0" />
              <span>Bloklangan xabar</span>
            </div>
            <div
              data-testid="analytics-blocked-notifs"
              className="text-xl font-mono font-bold text-white tabular-nums"
            >
              {report.blockedNotificationsCount} ta
            </div>
            <div className="text-[11px] text-slate-400">NotificationBlocker</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Qoidabuzarlik</span>
            </div>
            <div
              data-testid="analytics-tamper-count"
              className="text-xl font-mono font-bold text-white tabular-nums"
            >
              {report.tamperAttemptsCount} marta
            </div>
            <div className="text-[11px] text-slate-400">Accessibility ushladi</div>
          </div>
        </div>

        {/* Live Quiz Result Summary if answered */}
        {report.quizCorrect !== null && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between text-xs">
            <span className="text-slate-200 font-medium">Dars vaqtidagi Live Quiz natijasi:</span>
            <span
              className={`font-semibold ${
                report.quizCorrect ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {report.quizCorrect ? "To'g'ri javob (+2% Focus Bonus)" : "Xato javob"}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              onStartNewSession();
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yangi darsni boshlash</span>
          </button>
          <button
            type="button"
            data-testid="close-analytics-btn"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Tushunarli</span>
          </button>
        </div>
      </div>
    </div>
  );
};
