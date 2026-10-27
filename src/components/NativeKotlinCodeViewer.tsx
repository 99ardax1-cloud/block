import React, { useState } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  FolderTree,
  ShieldCheck,
  Download,
  Layers,
  Terminal,
} from 'lucide-react';
import {
  ANDROID_NATIVE_FILES,
  AndroidNativeFileSpec,
  generateFullBuildScriptSh,
} from '../data/androidNativeFiles';

type StepFilterGroup = 'ALL' | 'STEP1' | 'STEP2' | 'STEP3' | 'STEP4';

interface NativeKotlinCodeViewerProps {
  onOpenReleaseBuildModal?: () => void;
}

export const NativeKotlinCodeViewer: React.FC<NativeKotlinCodeViewerProps> = ({
  onOpenReleaseBuildModal,
}) => {
  const [stepFilter, setStepFilter] = useState<StepFilterGroup>('ALL');
  const [selectedFileId, setSelectedFileId] = useState<string>(ANDROID_NATIVE_FILES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFiles = ANDROID_NATIVE_FILES.filter((file) => {
    if (stepFilter === 'STEP1') return file.stepNumber >= 1 && file.stepNumber <= 6;
    if (stepFilter === 'STEP2') return file.stepNumber >= 7 && file.stepNumber <= 10;
    if (stepFilter === 'STEP3') return file.stepNumber >= 11 && file.stepNumber <= 14;
    if (stepFilter === 'STEP4') return file.stepNumber >= 15 && file.stepNumber <= 18;
    return true;
  });

  const activeFile: AndroidNativeFileSpec =
    filteredFiles.find((f) => f.id === selectedFileId) ||
    filteredFiles[0] ||
    ANDROID_NATIVE_FILES[0];

  const handleCopyCode = (file: AndroidNativeFileSpec) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(file.code).catch(() => {});
    }
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadBuildScript = () => {
    const scriptContent = generateFullBuildScriptSh();
    const blob = new Blob([scriptContent], {
      type: 'text/x-shellscript;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build_focus_lock_apk.sh';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullProjectBundle = () => {
    const markdownParts = [
      '# FOCUS LOCK — FULL ANDROID NATIVE (KOTLIN) + FLUTTER DART SOURCE CODE (18 FILES)\n',
      'Barcha 18 ta fayl 100% ishlaydigan, importlari va ProGuard/Release resurslari bilan to\'liq (No TODOs) yozilgan.\n',
    ];

    for (const f of ANDROID_NATIVE_FILES) {
      markdownParts.push(
        `\n---\n## ${f.stepNumber}. ${f.fileName}\n**Path:** \`${f.exactPath}\`\n\n**Tavsif:** ${f.summaryUz}\n\n\`\`\`${f.language}\n${f.code}\n\`\`\`\n`
      );
    }

    const blob = new Blob([markdownParts.join('\n')], {
      type: 'text/markdown;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'focus-lock-full-android-flutter-source-18-files.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="native-kotlin-code"
      data-testid="native-kotlin-code-section"
      aria-label="1, 2, 3 va 4-Qadam: Android Native (Kotlin, Gradle, XML, ProGuard) va Flutter (Dart) 100% To'liq Kodlar"
      className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-semibold text-indigo-400">
            1–4 QADAM ARXITEKTURASI · 100% TO&apos;LIQ PRODUCTION KODLAR ({ANDROID_NATIVE_FILES.length} TA FAYL · NO TODOs)
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Android Native (Kotlin, MethodChannel, BootReceiver, R8 ProGuard) + Flutter (Dart, MQTT) Kodlar Ombori
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenReleaseBuildModal && (
            <button
              type="button"
              onClick={onOpenReleaseBuildModal}
              data-testid="open-release-apk-modal-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>flutter build apk --release</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadBuildScript}
            data-testid="download-sh-builder-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>build_focus_lock_apk.sh (Avto-Builder)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadFullProjectBundle}
            data-testid="download-all-code-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
            <span>18 ta faylni yuklash (.MD)</span>
          </button>
        </div>
      </div>

      {/* Architecture Stage Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Bosqichlar:</span>
        </span>
        {[
          { id: 'ALL' as StepFilterGroup, label: `Barcha fayllar (${ANDROID_NATIVE_FILES.length} ta)` },
          { id: 'STEP1' as StepFilterGroup, label: '1-Qadam: Android Core (1–6)' },
          { id: 'STEP2' as StepFilterGroup, label: '2-Qadam: MethodChannel & Boot (7–10)' },
          { id: 'STEP3' as StepFilterGroup, label: '3-Qadam: Flutter Dart & MQTT (11–14)' },
          { id: 'STEP4' as StepFilterGroup, label: '4-Qadam: Release APK, R8 & CI/CD (15–18)' },
        ].map((grp) => {
          const isCurrent = stepFilter === grp.id;
          return (
            <button
              key={grp.id}
              type="button"
              onClick={() => {
                setStepFilter(grp.id);
                const firstMatch = ANDROID_NATIVE_FILES.find((f) => {
                  if (grp.id === 'STEP1') return f.stepNumber >= 1 && f.stepNumber <= 6;
                  if (grp.id === 'STEP2') return f.stepNumber >= 7 && f.stepNumber <= 10;
                  if (grp.id === 'STEP3') return f.stepNumber >= 11 && f.stepNumber <= 14;
                  if (grp.id === 'STEP4') return f.stepNumber >= 15 && f.stepNumber <= 18;
                  return true;
                });
                if (firstMatch) setSelectedFileId(firstMatch.id);
              }}
              data-testid={`code-stage-${grp.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isCurrent
                  ? 'bg-emerald-600/25 text-emerald-200 border border-emerald-500/60'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {grp.label}
            </button>
          );
        })}
      </div>

      {/* File Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {filteredFiles.map((file) => {
          const isActive = file.id === activeFile.id;
          return (
            <button
              key={file.id}
              type="button"
              data-testid={`code-tab-${file.stepNumber}`}
              onClick={() => setSelectedFileId(file.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="opacity-75">{file.stepNumber}.</span>
              <span>{file.fileName}</span>
            </button>
          );
        })}
      </div>

      {/* Selected File Details & Exact Path */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-300">
              <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Fayl manzili (Path):</span>
              <strong data-testid="active-code-filepath" className="text-white select-all">
                {activeFile.exactPath}
              </strong>
            </div>
            <p className="text-xs text-slate-300">{activeFile.summaryUz}</p>
          </div>

          <button
            type="button"
            onClick={() => handleCopyCode(activeFile)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedId === activeFile.id ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kod nusxalandi!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>To&apos;liq kodni nusxalash</span>
              </>
            )}
          </button>
        </div>

        {/* Security & Architecture Notes */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex flex-col gap-1">
          {activeFile.securityNotesUz.map((note, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{note}</span>
            </div>
          ))}
        </div>

        {/* Full Source Code Block */}
        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[540px] overflow-y-auto">
          <code>{activeFile.code}</code>
        </pre>
      </div>
    </section>
  );
};
