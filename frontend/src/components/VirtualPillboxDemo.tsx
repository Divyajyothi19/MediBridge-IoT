import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  Square,
  Pill,
  PackageOpen,
  RotateCcw,
  Trash2,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { CompartmentState, EventItem } from '../types';
import { ingestEvent, triggerReminder, clearReminder } from '../services/api';

interface VirtualPillboxDemoProps {
  compartments: CompartmentState[];
  deviceId: string;
  caregiverCount: number;
  recentEvents: EventItem[];
  onRefresh: () => void;
  onSpeakReminder: (medicineName: string, compNum: number) => void;
}

export const VirtualPillboxDemo: React.FC<VirtualPillboxDemoProps> = ({
  compartments,
  deviceId,
  caregiverCount,
  recentEvents,
  onRefresh,
  onSpeakReminder,
}) => {
  // Demo Missed-Dose Timer state
  const [selectedComp, setSelectedComp] = useState<number>(1);
  const [durationSec, setDurationSec] = useState<number>(20);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [demoStatus, setDemoStatus] = useState<{
    type: 'info' | 'success' | 'alert';
    message: string;
  } | null>(null);
  const [busyComp, setBusyComp] = useState<number | null>(null);

  const timerStartRef = useRef<number | null>(null);

  const makeEventId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Watch recentEvents so physical Wokwi button presses also cancel the active timer
  useEffect(() => {
    if (!timerActive || !timerStartRef.current || recentEvents.length === 0) return;
    const latest = recentEvents[0];
    const evTime = latest.received_at ? new Date(latest.received_at).getTime() : Date.now();
    if (
      evTime >= timerStartRef.current - 2000 &&
      latest.event_type === 'compartment_opened' &&
      latest.compartment_id === selectedComp
    ) {
      setTimerActive(false);
      setTimeLeft(null);
      setDemoStatus({
        type: 'success',
        message: `Compartment ${selectedComp} opened in time! Interaction recorded — no missed-dose email sent.`,
      });
    }
  }, [recentEvents, timerActive, selectedComp]);

  // Countdown interval
  useEffect(() => {
    if (!timerActive || timeLeft === null) return;

    if (timeLeft <= 0) {
      setTimerActive(false);
      setTimeLeft(null);
      // Fire reminder_missed to backend -> triggers Alert + Gmail to all caregivers
      const comp = compartments.find((c) => c.compartment_number === selectedComp);
      const medName = comp?.medicine_name || `Compartment ${selectedComp}`;
      ingestEvent({
        event_id: makeEventId('missed'),
        device_id: deviceId,
        compartment_id: selectedComp,
        event_type: 'reminder_missed',
        sensor_value: 0,
        detail: `Demo timer (${durationSec}s) expired without interaction for ${medName}`,
      })
        .then(() => {
          setDemoStatus({
            type: 'alert',
            message: `Timer expired! Missed-dose alert created & Gmail sent to all ${caregiverCount} caregiver(s).`,
          });
          onRefresh();
        })
        .catch((err) => {
          console.error(err);
        });
      return;
    }

    const id = setTimeout(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(id);
  }, [timerActive, timeLeft, selectedComp, durationSec, deviceId, compartments, caregiverCount, onRefresh]);

  const handleStartTimer = async () => {
    const safeSec = Math.max(5, Number(durationSec) || 20);
    setDurationSec(safeSec);
    timerStartRef.current = Date.now();
    setTimeLeft(safeSec);
    setTimerActive(true);

    const comp = compartments.find((c) => c.compartment_number === selectedComp);
    const medName = comp?.medicine_name || `Compartment ${selectedComp}`;

    setDemoStatus({
      type: 'info',
      message: `Reminder active for C${selectedComp} (${medName}). Waiting ${safeSec}s for tablet access...`,
    });

    onSpeakReminder(medName, selectedComp);

    try {
      await ingestEvent({
        event_id: makeEventId('rem'),
        device_id: deviceId,
        compartment_id: selectedComp,
        event_type: 'reminder_started',
        sensor_value: 1,
        detail: `Demo reminder started (${safeSec}s window)`,
      });
      // Also send to Blynk V6 for Wokwi LED/Buzzer if connected
      triggerReminder(deviceId, selectedComp).catch(() => {});
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelTimer = async () => {
    setTimerActive(false);
    setTimeLeft(null);
    setDemoStatus(null);
    clearReminder(deviceId).catch(() => {});
  };

  // Virtual Medicine Box Actions
  const handleTakeTablet = async (comp: CompartmentState) => {
    setBusyComp(comp.compartment_number);
    const currentStock = Math.round(comp.stock_percent);
    const nextStock = Math.max(0, currentStock - 10);

    try {
      // Check if a different compartment's reminder is currently active -> Wrong Compartment!
      if (timerActive && selectedComp !== comp.compartment_number) {
        await ingestEvent({
          event_id: makeEventId('wrong'),
          device_id: deviceId,
          compartment_id: comp.compartment_number,
          event_type: 'wrong_compartment',
          sensor_value: comp.compartment_number,
          detail: `Wrong compartment C${comp.compartment_number} opened while C${selectedComp} reminder was active`,
        });
        setDemoStatus({
          type: 'alert',
          message: `Wrong Compartment C${comp.compartment_number} opened! HIGH alert created & Gmail sent to all ${caregiverCount} caregiver(s).`,
        });
      } else {
        // Record compartment opened
        await ingestEvent({
          event_id: makeEventId('open'),
          device_id: deviceId,
          compartment_id: comp.compartment_number,
          event_type: 'compartment_opened',
          sensor_value: 1,
          detail: `Virtual box: C${comp.compartment_number} opened (1 tablet removed)`,
        });

        if (timerActive && selectedComp === comp.compartment_number) {
          setTimerActive(false);
          setTimeLeft(null);
          clearReminder(deviceId).catch(() => {});
          setDemoStatus({
            type: 'success',
            message: `Compartment ${comp.compartment_number} opened in time! Interaction recorded — no missed-dose alert sent.`,
          });
        }
      }

      // Update stock
      if (nextStock !== currentStock) {
        await ingestEvent({
          event_id: makeEventId('stk'),
          device_id: deviceId,
          compartment_id: comp.compartment_number,
          event_type: nextStock <= 10 ? 'stock_empty' : 'stock_changed',
          sensor_value: nextStock,
          detail:
            nextStock <= 10
              ? `Compartment ${comp.compartment_number} stock depleted (${nextStock}%)`
              : `Stock updated to ${nextStock}%`,
        });

        if (nextStock <= 10) {
          setDemoStatus({
            type: 'alert',
            message: `Compartment ${comp.compartment_number} is EMPTY (${nextStock}%)! Refill alert & Gmail sent to all ${caregiverCount} caregiver(s).`,
          });
        }
      }

      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyComp(null);
    }
  };

  const handleEmptyAll = async (comp: CompartmentState) => {
    setBusyComp(comp.compartment_number);
    try {
      await ingestEvent({
        event_id: makeEventId('empty'),
        device_id: deviceId,
        compartment_id: comp.compartment_number,
        event_type: 'stock_empty',
        sensor_value: 0,
        detail: `All tablets removed from Compartment ${comp.compartment_number} (0% EMPTY)`,
      });
      setDemoStatus({
        type: 'alert',
        message: `All tablets removed from C${comp.compartment_number} (0% EMPTY)! Refill Gmail sent to all ${caregiverCount} caregiver(s).`,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyComp(null);
    }
  };

  const handleRefill = async (comp: CompartmentState) => {
    setBusyComp(comp.compartment_number);
    try {
      await ingestEvent({
        event_id: makeEventId('refill'),
        device_id: deviceId,
        compartment_id: comp.compartment_number,
        event_type: 'stock_changed',
        sensor_value: 100,
        detail: `Compartment ${comp.compartment_number} refilled to 100% (10 tablets)`,
      });
      setDemoStatus({
        type: 'success',
        message: `Compartment ${comp.compartment_number} refilled to 100% (10 tablets).`,
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBusyComp(null);
    }
  };

  return (
    <div className="card border-2 border-teal-200/80 bg-gradient-to-br from-white to-teal-50/30 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-200/70">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Interactive Virtual Medicine Box & Live Demo Simulator
          </h3>
          <p className="text-xs text-slate-500">
            Test missed-dose timers in seconds, remove tablets to empty a compartment, and trigger real Gmail alerts to all {caregiverCount} caregivers
          </p>
        </div>
        <span className="text-[11px] font-semibold bg-teal-100 text-teal-800 px-3 py-1 rounded-full self-start md:self-auto">
          Connected to Real Backend & Gmail
        </span>
      </div>

      {/* Live Demo Status Banner */}
      {demoStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
            demoStatus.type === 'alert'
              ? 'bg-red-50 border-red-200 text-red-800'
              : demoStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          {demoStatus.type === 'alert' ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          ) : demoStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          ) : (
            <Timer className="w-4 h-4 flex-shrink-0 text-sky-600 animate-spin" />
          )}
          <span>{demoStatus.message}</span>
        </div>
      )}

      {/* 1. Missed-Dose Demo Countdown Timer */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Timer className="w-4 h-4 text-teal-600" />
              Missed-Dose Alert Timer (Demo Mode in Seconds)
            </h4>
            <p className="text-xs text-slate-500">
              Start a timer → if no tablet is taken before 0s, a real <strong>Missed Dose Email</strong> is sent to all caregivers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Compartment Selector */}
            <select
              value={selectedComp}
              onChange={(e) => setSelectedComp(Number(e.target.value))}
              disabled={timerActive}
              className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 font-semibold text-slate-700"
            >
              <option value={1}>Compartment 1</option>
              <option value={2}>Compartment 2</option>
              <option value={3}>Compartment 3</option>
            </select>

            {/* Quick Presets */}
            {[10, 20, 60, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                disabled={timerActive}
                onClick={() => setDurationSec(sec)}
                className={`px-2.5 py-2 rounded-xl border font-medium transition-all ${
                  durationSec === sec
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                } disabled:opacity-50`}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}

            {/* Custom Seconds Input */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={5}
                max={600}
                value={durationSec}
                disabled={timerActive}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-16 rounded-xl border border-slate-200 px-2.5 py-2 text-center font-semibold"
              />
              <span className="text-slate-400">sec</span>
            </div>

            {!timerActive ? (
              <button
                onClick={handleStartTimer}
                className="btn-primary text-xs px-4 py-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Timer</span>
              </button>
            ) : (
              <button
                onClick={handleCancelTimer}
                className="btn-danger text-xs px-4 py-2"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop ({timeLeft}s)</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Countdown Progress Bar */}
        {timerActive && timeLeft !== null && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-amber-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Waiting for Compartment {selectedComp} interaction...
              </span>
              <span className="text-red-600 font-mono text-sm">{timeLeft}s remaining</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-1000"
                style={{ width: `${Math.round((timeLeft / durationSec) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Visual Virtual Medicine Box with Tablets Inside */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {compartments.map((comp) => {
          const tabletCount = Math.round(Math.min(100, Math.max(0, comp.stock_percent)) / 10);
          const isEmpty = comp.stock_percent <= 10;
          const isTarget = timerActive && selectedComp === comp.compartment_number;

          return (
            <div
              key={comp.compartment_number}
              className={`rounded-2xl border p-4 bg-white transition-all flex flex-col justify-between ${
                isTarget
                  ? 'border-amber-400 ring-2 ring-amber-400/30'
                  : isEmpty
                  ? 'border-red-200 bg-red-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">
                    Box C{comp.compartment_number}: {comp.medicine_name || 'Empty Slot'}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isEmpty
                        ? 'bg-red-100 text-red-700'
                        : comp.stock_percent <= 30
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    {tabletCount}/10 tablets
                  </span>
                </div>

                {/* Visual Tray of Tablets */}
                <div className="min-h-[68px] p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-wrap items-center justify-center gap-2 mb-3">
                  {tabletCount === 0 ? (
                    <span className="text-xs font-semibold text-red-500">
                      Compartment Empty (0 tablets)
                    </span>
                  ) : (
                    Array.from({ length: tabletCount }).map((_, idx) => (
                      <div
                        key={idx}
                        title="Simulated Tablet (10%)"
                        className={`w-6 h-6 rounded-full flex items-center justify-center shadow-xs border ${
                          isEmpty
                            ? 'bg-red-100 border-red-300 text-red-600'
                            : comp.stock_percent <= 30
                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-teal-100 border-teal-300 text-teal-700'
                        }`}
                      >
                        <Pill className="w-3.5 h-3.5" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Virtual Box Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  onClick={() => handleTakeTablet(comp)}
                  disabled={busyComp === comp.compartment_number}
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all disabled:opacity-50"
                  title="Simulate opening lid & removing 1 tablet"
                >
                  <PackageOpen className="w-3.5 h-3.5" />
                  <span>Take 1</span>
                </button>

                <button
                  onClick={() => handleEmptyAll(comp)}
                  disabled={busyComp === comp.compartment_number || comp.stock_percent === 0}
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-red-50 text-red-700 border border-red-200 font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                  title="Remove all tablets & trigger Refill Email"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty</span>
                </button>

                <button
                  onClick={() => handleRefill(comp)}
                  disabled={busyComp === comp.compartment_number || comp.stock_percent === 100}
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-semibold hover:bg-slate-200 transition-all disabled:opacity-50"
                  title="Refill compartment to 10 tablets (100%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refill</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
