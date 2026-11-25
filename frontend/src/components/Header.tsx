import React, { useState } from 'react';
import { 
  User, 
  Volume2, 
  VolumeX, 
  BellRing, 
  Volume1, 
  Check, 
  Loader2 
} from 'lucide-react';
import type { Patient, VoiceSettings } from '../types';
import { triggerReminder, triggerBuzzer, clearReminder } from '../services/api';

interface HeaderProps {
  patient: Patient | null;
  deviceId: string;
  voiceSettings: VoiceSettings;
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  patient,
  deviceId,
  voiceSettings,
  setVoiceSettings,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleTriggerReminder = async () => {
    setActionLoading('reminder');
    try {
      await triggerReminder(deviceId, 1);
      setActionSuccess('Reminder command sent to Device (V6)');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearReminder = async () => {
    setActionLoading('clear');
    try {
      await clearReminder(deviceId);
      setActionSuccess('Reminder cleared (V6=0)');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestBuzzer = async () => {
    setActionLoading('buzzer');
    try {
      await triggerBuzzer(deviceId, 'test');
      setActionSuccess('Buzzer test triggered (V7=1)');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Patient Information Banner */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700">
          <User className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {patient ? patient.name : 'Ravi Kumar'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Age: {patient?.age || 68}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              ID: {deviceId}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate max-w-md">
            {patient?.medical_notes || 'Type-2 Diabetes, Hypertension • Monitor regular dosage intervals'}
          </p>
        </div>
      </div>

      {/* Quick Actions & Telemetry Controls */}
      <div className="flex items-center flex-wrap gap-2.5">
        {actionSuccess && (
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            {actionSuccess}
          </span>
        )}

        {/* Voice Reminders Toggle */}
        <button
          onClick={() => setVoiceSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
            voiceSettings.enabled
              ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
          }`}
          title="Toggle browser audible speech reminders"
        >
          {voiceSettings.enabled ? (
            <Volume2 className="w-4 h-4 text-teal-600" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-400" />
          )}
          <span>Voice Reminders: {voiceSettings.enabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Hardware Test Controls */}
        <button
          onClick={handleTriggerReminder}
          disabled={actionLoading !== null}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all disabled:opacity-50"
        >
          {actionLoading === 'reminder' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BellRing className="w-3.5 h-3.5" />
          )}
          <span>Start Reminder</span>
        </button>

        <button
          onClick={handleClearReminder}
          disabled={actionLoading !== null}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          <span>Cancel Reminder</span>
        </button>

        <button
          onClick={handleTestBuzzer}
          disabled={actionLoading !== null}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-50"
        >
          {actionLoading === 'buzzer' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Volume1 className="w-3.5 h-3.5" />
          )}
          <span>Test Buzzer</span>
        </button>
      </div>
    </header>
  );
};
