import React, { useState } from 'react';
import { 
  Settings, 
  Volume2, 
  Mail, 
  Cloud, 
  Check, 
  Info 
} from 'lucide-react';
import type { VoiceSettings } from '../types';

interface SettingsViewProps {
  voiceSettings: VoiceSettings;
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>;
  onTestVoice: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  voiceSettings,
  setVoiceSettings,
  onTestVoice,
}) => {
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTestSpeech = () => {
    onTestVoice();
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-600" />
          System Settings & Notification Preferences
        </h3>
        <p className="text-xs text-slate-500">
          Audio accessibility, cloud integration parameters, and telemetry communication controls
        </p>
      </div>

      {/* Voice Reminders & Audio Accessibility */}
      <div className="card border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Browser Audio & Voice Reminders</h4>
              <p className="text-xs text-slate-500">Audible spoken reminders and interaction confirmation alerts</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={voiceSettings.enabled}
              onChange={(e) => setVoiceSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-700">Speech Volume</span>
              <span className="text-slate-500">{Math.round(voiceSettings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={voiceSettings.volume}
              onChange={(e) => setVoiceSettings(prev => ({ ...prev, volume: Number(e.target.value) }))}
              className="w-full accent-teal-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-semibold text-slate-800">Voice Synthesis Language</p>
              <p className="text-slate-400 text-[11px]">English (India / Standard Accent)</p>
            </div>

            <button
              onClick={handleTestSpeech}
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{testSuccess ? 'Speaking...' : 'Test Voice Speech'}</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Kannada voice support and wearable vibration features are planned for future firmware revisions.</span>
          </div>
        </div>
      </div>

      {/* Cloud & Hardware Integrations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blynk Cloud Connection Card */}
        <div className="card border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Blynk IoT Cloud</h4>
              <p className="text-xs text-slate-500">Live Hardware Telemetry</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Template ID:</span>
              <strong className="text-slate-800 font-mono">TMPL3bL-HeO6P</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Device ID:</span>
              <strong className="text-slate-800 font-mono">MB-ESP32-01</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Cloud Status:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Authenticated & Active
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Event Stream:</span>
              <span className="text-slate-700 font-mono">V10 (JSON Poller 1s)</span>
            </div>
          </div>
        </div>

        {/* Gmail SMTP Dispatch Card */}
        <div className="card border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Gmail SMTP Alerts</h4>
              <p className="text-xs text-slate-500">Emergency Dispatch Engine</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Sender Address:</span>
              <strong className="text-slate-800 font-mono truncate max-w-[170px]">vedadivya05@gmail.com</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">SMTP Host / Port:</span>
              <strong className="text-slate-800 font-mono">smtp.gmail.com:587</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Encryption:</span>
              <span className="text-teal-700 font-semibold">STARTTLS</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Caregiver Broadcast:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Multi-Caregiver (All)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
