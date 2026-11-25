import React from 'react';
import { 
  Box, 
  Clock, 
  Bell, 
  Activity, 
  Users, 
  Pill, 
  ShieldAlert,
  Info
} from 'lucide-react';
import type { CompartmentState, EventItem, AlertItem, Caregiver } from '../types';
import { VirtualPillboxDemo } from './VirtualPillboxDemo';

interface OverviewViewProps {
  compartments: CompartmentState[];
  caregivers: Caregiver[];
  alerts: AlertItem[];
  recentEvents: EventItem[];
  deviceId: string;
  onTriggerReminder: (compartmentId: number) => void;
  onRefresh: () => void;
  onSpeakReminder: (medicineName: string, compNum: number) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  compartments,
  caregivers,
  alerts,
  recentEvents,
  deviceId,
  onTriggerReminder,
  onRefresh,
  onSpeakReminder,
}) => {
  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Healthcare Compliance Banner */}
      <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-start gap-3.5 text-teal-900">
        <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-teal-950">
            Important Medical Disclaimer & Telemetry Specification
          </p>
          <p className="text-teal-800 leading-relaxed">
            Sensor readings and lid openings indicate <strong>physical compartment access detection only</strong> and do not confirm medication was swallowed. Stock percentages are measured via simulated analog potentiometers on the ESP32 hardware.
          </p>
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pillbox Compartments</p>
            <h3 className="text-2xl font-bold text-slate-900">{compartments.length} Active</h3>
          </div>
        </div>

        <div className="card border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Caregivers</p>
            <h3 className="text-2xl font-bold text-slate-900">{caregivers.length} Recipients</h3>
          </div>
        </div>

        <div className="card border border-slate-100 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            activeAlerts.length > 0
              ? 'bg-red-50 border border-red-100 text-red-600'
              : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Alerts</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {activeAlerts.length} {activeAlerts.length === 1 ? 'Alert' : 'Alerts'}
            </h3>
          </div>
        </div>

        <div className="card border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recorded Events</p>
            <h3 className="text-2xl font-bold text-slate-900">{recentEvents.length} Total</h3>
          </div>
        </div>
      </div>

      {/* Interactive Virtual Pillbox & Missed-Dose Demo Simulator */}
      <VirtualPillboxDemo
        compartments={compartments}
        deviceId={deviceId}
        caregiverCount={caregivers.length}
        recentEvents={recentEvents}
        onRefresh={onRefresh}
        onSpeakReminder={onSpeakReminder}
      />

      {/* 3-Compartment Digital Medicine Box Display */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Box className="w-5 h-5 text-teal-600" />
              Smart 3-Compartment Pillbox
            </h3>
            <p className="text-xs text-slate-500">
              Real-time lid detection sensors and potentiometer stock monitors
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            Hardware: ESP32 DevKit V1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {compartments.map((comp) => {
            const stock = comp.stock_percent;
            let stockColor = 'bg-teal-500';
            let stockBadge = 'bg-teal-50 text-teal-700 border-teal-200';
            if (stock <= 10) {
              stockColor = 'bg-red-500';
              stockBadge = 'bg-red-50 text-red-700 border-red-200';
            } else if (stock <= 30) {
              stockColor = 'bg-amber-500';
              stockBadge = 'bg-amber-50 text-amber-700 border-amber-200';
            }

            return (
              <div 
                key={comp.compartment_number}
                className={`card border transition-all duration-300 relative overflow-hidden ${
                  comp.lid_open 
                    ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20' 
                    : 'border-slate-200/80 hover:border-teal-300'
                }`}
              >
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                      C{comp.compartment_number}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      Compartment {comp.compartment_number}
                    </span>
                  </div>

                  {/* Lid Sensor Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    comp.lid_open 
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${comp.lid_open ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    {comp.lid_open ? 'Lid OPEN' : 'Lid Closed'}
                  </span>
                </div>

                {/* Medicine & Dosage Details */}
                <div className="space-y-3 mb-5">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      {comp.medicine_name || 'No medicine assigned'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Dosage: <strong className="text-slate-700">{comp.dosage || '1 unit'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Schedule Time: <strong>{comp.schedule_time || '08:00'}</strong></span>
                  </div>
                </div>

                {/* Stock Level Progress Gauge */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Stock Level</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${stockBadge}`}>
                      {comp.stock_status || (stock <= 10 ? 'EMPTY' : stock <= 30 ? 'LOW' : 'FULL')} ({stock}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${stockColor}`}
                      style={{ width: `${Math.min(Math.max(stock, 0), 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Simulated reading from potentiometer
                  </p>
                </div>

                {/* Actions & Status */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    State: <strong className="capitalize text-slate-800">{comp.state_label || 'OK'}</strong>
                  </span>
                  <button
                    onClick={() => onTriggerReminder(comp.compartment_number)}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-teal-700 hover:bg-teal-50 border-teal-200"
                  >
                    <Bell className="w-3 h-3 text-teal-600" />
                    Test Reminder
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Event Activity Feed */}
      <div className="card border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">Live Device Activity Feed</h3>
          </div>
          <span className="text-xs text-slate-400">WebSocket Live Updates</span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Waiting for device events from ESP32 / Wokwi simulation...
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {recentEvents.slice(0, 8).map((ev) => (
              <div key={ev.event_id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${
                    ev.event_type.includes('wrong') ? 'bg-red-500' :
                    ev.event_type.includes('reminder') ? 'bg-amber-500' : 'bg-teal-500'
                  }`} />
                  <span className="font-semibold text-slate-800 capitalize">
                    {ev.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400">• Compartment {ev.compartment_id}</span>
                  {ev.detail && <span className="text-slate-500 truncate max-w-xs">({ev.detail})</span>}
                </div>
                <span className="text-slate-400 text-[11px]">
                  {ev.received_at ? new Date(ev.received_at).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
