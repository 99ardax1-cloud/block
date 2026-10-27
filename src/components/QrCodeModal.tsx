import React, { useState } from 'react';
import { QrCode, X, ShieldCheck, Clock, RefreshCw, Camera, Copy, Check } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onRegenerateSessionId: () => void;
  durationMinutes: number;
  totpCode: string;
  onSimulateStudentQrScan: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onRegenerateSessionId,
  durationMinutes,
  totpCode,
  onSimulateStudentQrScan,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://focuslock.app';
  const mobileStudentUrl = `${origin}/?view=student&room=${encodeURIComponent(sessionId)}`;

  // Deterministic 15x15 SVG QR matrix generated from sessionId + durationMinutes + totpCode
  const seedStr = `${sessionId}-${durationMinutes}-${totpCode}`;
  const gridSize = 15;
  const cells = Array.from({ length: gridSize * gridSize }, (_, idx) => {
    const row = Math.floor(idx / gridSize);
    const col = idx % gridSize;

    // 5x5 Finder pattern in top-left, top-right, bottom-left corners
    const inFinderArea = (r: number, c: number) => {
      if (r === 0 || r === 4 || c === 0 || c === 4) return true;
      if (r >= 1 && r <= 3 && c >= 1 && c <= 3) return r === 2 && c === 2;
      return false;
    };

    if (row < 5 && col < 5) return inFinderArea(row, col);
    if (row < 5 && col >= gridSize - 5) return inFinderArea(row, col - (gridSize - 5));
    if (row >= gridSize - 5 && col < 5) return inFinderArea(row - (gridSize - 5), col);

    if (
      (row === 5 && col <= 5) ||
      (col === 5 && row <= 5) ||
      (row === 5 && col >= gridSize - 6) ||
      (col === gridSize - 6 && row <= 5) ||
      (row === gridSize - 6 && col <= 5) ||
      (col === 5 && row >= gridSize - 6)
    ) {
      return false;
    }

    const charCode = seedStr.charCodeAt(idx % seedStr.length) || 65;
    return (charCode * 13 + row * 7 + col * 11) % 3 !== 0;
  });

  const handleCopyMobileUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mobileStudentUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      data-testid="classroom-qr-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 id="qr-modal-title" className="text-base font-bold text-white">
              Dinamik Kirish QR-kodi (Xona: {sessionId})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="QR oynasini yopish"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center space-y-3.5">
          {/* High-contrast SVG QR Matrix */}
          <div className="p-4 bg-white rounded-2xl shadow-inner border-4 border-indigo-500/40">
            <svg
              viewBox={`0 0 ${gridSize} ${gridSize}`}
              className="w-44 h-44"
              shapeRendering="crispEdges"
              aria-label={`QR Code for session ${sessionId}`}
            >
              {cells.map((filled, i) => {
                if (!filled) return null;
                const r = Math.floor(i / gridSize);
                const c = i % gridSize;
                return (
                  <rect
                    key={i}
                    x={c}
                    y={r}
                    width={1}
                    height={1}
                    fill="#020617"
                  />
                );
              })}
            </svg>
          </div>

          {/* Special Room Code Badge + Regenerate Button */}
          <div className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/40">
            <div className="text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Xona Kodi (Room Code)
              </div>
              <div
                data-testid="qr-modal-session-id"
                className="text-sm font-mono font-bold text-indigo-300 tabular-nums"
              >
                {sessionId}
              </div>
            </div>
            <button
              type="button"
              onClick={onRegenerateSessionId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Yangilash</span>
            </button>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Avto-Bloklash vaqti: {durationMinutes} daqiqa</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs">
              Telefonda quyidagi ssilkani ochsangiz, O&apos;qituvchi paneli yashirinadi va faqat <strong className="text-white">O&apos;quvchi Kiosk Ekrani</strong> ochiladi:
            </p>
          </div>

          <div className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 flex items-center justify-between gap-2">
            <span className="text-indigo-400 truncate">{mobileStudentUrl}</span>
            <button
              type="button"
              onClick={handleCopyMobileUrl}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 shrink-0 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Nusxalandi' : 'Nusxalash'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSimulateStudentQrScan();
            }}
            data-testid="modal-simulate-scan-btn"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>O&apos;quvchi telefonida Kamera Skanerini yoqish</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            Yopish
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            MQTT (wss://broker.emqx.io:8084/mqtt) va WebSocket orqali &lt;0.5s da sinxronlanadi.
          </span>
        </div>
      </div>
    </div>
  );
};
