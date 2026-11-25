import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import type { TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { MedicinesView } from './components/MedicinesView';
import { CaregiversView } from './components/CaregiversView';
import { AlertsView } from './components/AlertsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import type { 
  Patient, 
  Caregiver, 
  Medicine, 
  CompartmentState, 
  Schedule, 
  EventItem, 
  AlertItem, 
  VoiceSettings 
} from './types';
import { 
  getPatients, 
  getCaregivers, 
  getMedicines, 
  getSchedules, 
  getDeviceCompartments, 
  getDeviceStatus, 
  getAlerts, 
  getEvents,
  triggerReminder
} from './services/api';
import { useWebSocket } from './hooks/useWebSocket';
import type { WsMessage } from './hooks/useWebSocket';
import { useVoice } from './hooks/useVoice';
import { 
  samplePatient, 
  sampleCaregivers, 
  sampleMedicines, 
  sampleCompartments, 
  sampleSchedules, 
  sampleAlerts, 
  sampleEvents 
} from './data/sampleData';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [compartments, setCompartments] = useState<CompartmentState[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<EventItem[]>([]);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(false);
  const [deviceId] = useState<string>('MB-ESP32-01');

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: true,
    volume: 0.9,
    language: 'en',
  });

  const voice = useVoice(voiceSettings);

  // Fetch initial data from backend APIs (with fallback to sample data)
  const loadData = useCallback(async () => {
    try {
      const [
        patientsRes, 
        caregiversRes, 
        medicinesRes, 
        compartmentsRes, 
        schedulesRes, 
        alertsRes, 
        eventsRes,
        statusRes
      ] = await Promise.allSettled([
        getPatients(),
        getCaregivers(),
        getMedicines(),
        getDeviceCompartments(deviceId),
        getSchedules(),
        getAlerts(),
        getEvents({ limit: 30 }),
        getDeviceStatus(deviceId),
      ]);

      if (patientsRes.status === 'fulfilled' && patientsRes.value && patientsRes.value.length > 0) {
        setPatient(patientsRes.value[0]);
      } else {
        setPatient(samplePatient);
      }

      if (caregiversRes.status === 'fulfilled' && Array.isArray(caregiversRes.value)) {
        setCaregivers(caregiversRes.value);
      } else {
        setCaregivers(sampleCaregivers);
      }

      if (medicinesRes.status === 'fulfilled' && Array.isArray(medicinesRes.value)) {
        setMedicines(medicinesRes.value);
      } else {
        setMedicines(sampleMedicines);
      }

      if (compartmentsRes.status === 'fulfilled' && Array.isArray(compartmentsRes.value) && compartmentsRes.value.length > 0) {
        setCompartments(compartmentsRes.value);
      } else {
        setCompartments(sampleCompartments as unknown as CompartmentState[]);
      }

      if (schedulesRes.status === 'fulfilled' && Array.isArray(schedulesRes.value)) {
        setSchedules(schedulesRes.value);
      } else {
        setSchedules(sampleSchedules as unknown as Schedule[]);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
        setAlerts(alertsRes.value);
      } else {
        setAlerts(sampleAlerts as unknown as AlertItem[]);
      }

      if (eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value)) {
        setRecentEvents(eventsRes.value);
      } else {
        setRecentEvents(sampleEvents as unknown as EventItem[]);
      }

      if (statusRes.status === 'fulfilled' && statusRes.value) {
        setIsDeviceOnline(Boolean(statusRes.value.is_online));
      }
    } catch (err) {
      console.warn('Backend load warning, falling back to cached state:', err);
    }
  }, [deviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle live WebSocket incoming events
  const handleWsMessage = useCallback((msg: WsMessage) => {
    console.log('[WebSocket Message Received]:', msg);

    const payloadData = (msg.data || msg.event || msg.compartment || msg.alert) as Record<string, unknown> | undefined;

    if (msg.type === 'event' && payloadData) {
      const ev = payloadData as unknown as EventItem;
      setRecentEvents(prev => [ev, ...prev]);

      // Update compartment lid/stock state in real-time
      if (ev.compartment_id) {
        setCompartments(prev => prev.map(c => {
          if (c.compartment_number === ev.compartment_id) {
            const isOpened = ev.event_type === 'compartment_opened';
            const isClosed = ev.event_type === 'compartment_closed';
            const newLid = isOpened ? true : isClosed ? false : c.lid_open;
            const newStock = (ev.event_type === 'stock_changed' || ev.event_type === 'stock_empty') && typeof ev.sensor_value === 'number'
              ? ev.sensor_value
              : c.stock_percent;

            return {
              ...c,
              lid_open: newLid,
              stock_percent: newStock,
              stock_status: newStock <= 10 ? 'EMPTY' : newStock <= 30 ? 'LOW' : 'FULL',
              last_interaction_at: isOpened ? new Date().toISOString() : c.last_interaction_at,
              state_label: isOpened ? 'interaction_recorded' : c.state_label,
            };
          }
          return c;
        }));
      }
    } else if (msg.type === 'compartment_state' && payloadData) {
      const comp = payloadData as unknown as CompartmentState;
      setCompartments(prev => prev.map(c => c.compartment_number === comp.compartment_number ? { ...c, ...comp } : c));
    } else if (msg.type === 'alert' && payloadData) {
      const alert = payloadData as unknown as AlertItem;
      setAlerts(prev => [alert, ...prev]);
    } else if (msg.type === 'device_status' && payloadData) {
      setIsDeviceOnline(Boolean(payloadData.is_online));
    } else if (msg.type === 'caregiver_update') {
      // Reload caregivers in real-time
      getCaregivers().then(res => {
        if (Array.isArray(res)) setCaregivers(res);
      }).catch(console.error);
    }
  }, []);

  const { status: wsStatus } = useWebSocket({
    onMessage: handleWsMessage,
    voiceSettings,
  });

  const handleTriggerReminder = async (compNumber: number) => {
    try {
      await triggerReminder(deviceId, compNumber);
      voice.announceReminder(`Compartment ${compNumber}`, compNumber);
    } catch (err) {
      console.error('Trigger reminder failed:', err);
    }
  };

  const handleTestVoice = () => {
    voice.announceReminder('Metformin', 1);
  };

  const unresolvedAlertCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsStatus={wsStatus}
        isDeviceOnline={isDeviceOnline}
        unresolvedAlertCount={unresolvedAlertCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          patient={patient}
          deviceId={deviceId}
          voiceSettings={voiceSettings}
          setVoiceSettings={setVoiceSettings}
          onRefresh={loadData}
        />

        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              compartments={compartments}
              caregivers={caregivers}
              alerts={alerts}
              recentEvents={recentEvents}
              deviceId={deviceId}
              onTriggerReminder={handleTriggerReminder}
              onRefresh={loadData}
              onSpeakReminder={(medName, compNum) => voice.announceReminder(medName, compNum)}
            />
          )}

          {activeTab === 'medicines' && (
            <MedicinesView
              medicines={medicines}
              schedules={schedules}
              compartments={compartments}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'caregivers' && (
            <CaregiversView
              caregivers={caregivers}
              patientId={patient?.id || 1}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              events={recentEvents}
              compartments={compartments}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              voiceSettings={voiceSettings}
              setVoiceSettings={setVoiceSettings}
              onTestVoice={handleTestVoice}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
