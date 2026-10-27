import React from 'react';
import { Navigation, MapPin, ShieldCheck, Lock, Unlock } from 'lucide-react';
import {
  StudentDevice,
  GEOFENCE_RADIUS_METERS,
  getStudentRemainingLockMillis,
} from '../utils/focusLockEngine';

interface GeofenceRadarBarProps {
  student: StudentDevice;
  elapsedRealtimeMs: number;
  onDistanceChange: (distanceMeters: number) => void;
}

export const GeofenceRadarBar: React.FC<GeofenceRadarBarProps> = ({
  student,
  elapsedRealtimeMs,
  onDistanceChange,
}) => {
  const isInsideGeofence = student.distanceMeters <= GEOFENCE_RADIUS_METERS;
  const remainingMs = getStudentRemainingLockMillis(student, elapsedRealtimeMs);
  const isCurrentlyLocked = student.isLocked && remainingMs > 0;

  // Map student distance (0..220m) to a visual radar offset from center (0..44%)
  const normalizedRadiusPercent = Math.min(44, (student.distanceMeters / 220) * 44);
  const angleRad = 0.65; // fixed diagonal angle for clear visual radar placement
  const dotX = 50 + Math.cos(angleRad) * normalizedRadiusPercent;
  const dotY = 50 - Math.sin(angleRad) * normalizedRadiusPercent;

  return (
    <section
      aria-label="Interaktiv GPS Geofencing Simulyatori (Radar)"
      className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 sm:p-5"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left 4 cols: Visual Radar Map with 100m Geofence Circle */}
        <div className="lg:col-span-4 flex items-center gap-4">
          <div
            data-testid="geofence-radar-map"
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center shadow-inner"
          >
            {/* Outer radar grid rings */}
            <div className="absolute inset-2 rounded-full border border-slate-800/70" />
            {/* 100m Green Geofence Boundary Circle (approx 45% radius of 220m max) */}
            <div
              className={`w-[56%] h-[56%] rounded-full border-2 transition-colors flex items-center justify-center ${
                isInsideGeofence
                  ? 'border-emerald-500/80 bg-emerald-500/15'
                  : 'border-emerald-500/40 bg-emerald-500/5'
              }`}
            >
              {/* Learning Center Building at Center */}
              <div
                title="O'quv Markazi Binosi (0m)"
                className="w-6 h-6 rounded-full bg-indigo-600/90 border border-indigo-300 flex items-center justify-center text-white shadow"
              >
                <MapPin className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Crosshair lines */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800/60 pointer-events-none" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/60 pointer-events-none" />

            {/* Student GPS Coordinate Marker */}
            <div
              style={{
                left: `${dotX}%`,
                top: `${dotY}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-10 transition-all duration-200"
            >
              <div
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shadow-md whitespace-nowrap ${
                  isInsideGeofence
                    ? 'bg-emerald-500 text-slate-950 border-white'
                    : 'bg-amber-400 text-slate-950 border-slate-900'
                }`}
              >
                {student.distanceMeters}m
              </div>
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span>1. GPS GEOFENCING RADAR (100m)</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white truncate">
              O&apos;quv Markazi Geofence Hududi
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O&apos;quvchi markazning <strong className="text-emerald-400">100 metrlik</strong> yashil hududiga kirishi bilan telefon <strong className="text-white">AVTOMATIK qulflanadi</strong> (Auto-Lock on Enter).
            </p>
          </div>
        </div>

        {/* Middle 5 cols: Interactive Distance Slider + Quick Enter/Exit Buttons */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <label htmlFor="geofence-distance-slider" className="font-semibold text-slate-200">
              {student.fullName} masofasi:
            </label>
            <span
              data-testid="geofence-distance-label"
              className={`font-mono font-bold tabular-nums ${
                isInsideGeofence ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {student.distanceMeters} metr ({isInsideGeofence ? 'Hudud ichida <=100m' : 'Tashqarida >100m'})
            </span>
          </div>

          <input
            id="geofence-distance-slider"
            data-testid="geofence-slider"
            type="range"
            min={0}
            max={220}
            step={5}
            value={student.distanceMeters}
            onChange={(e) => onDistanceChange(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>0m (Markaz binosi)</span>
            <span className="text-emerald-400">100m (Geofence chegarasi)</span>
            <span>220m (Ko&apos;cha)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              data-testid="geofence-enter-btn"
              onClick={() => onDistanceChange(25)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Markazga kiritish (25m · Auto-Lock)
            </button>
            <button
              type="button"
              data-testid="geofence-exit-btn"
              onClick={() => onDistanceChange(165)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Markazdan chiqarish (165m)
            </button>
          </div>
        </div>

        {/* Right 3 cols: Live Geofence Status Telemetry */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-2 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Geofence holati:</span>
            <span
              className={`font-semibold ${
                isInsideGeofence ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isInsideGeofence ? 'GEOFENCE_TRANSITION_ENTER' : 'GEOFENCE_TRANSITION_EXIT'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Telefon qulfi:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-white">
              {isCurrentlyLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Avto-Qulflangan</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Ochiq</span>
                </>
              )}
            </span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">GeofencingClient · Radius: 100.0f metr</span>
          </div>
        </div>
      </div>
    </section>
  );
};
