export interface Patient {
  id: number;
  name: string;
  age: number;
  medical_notes: string;
  created_at?: string;
}

export interface Caregiver {
  id: number;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  patient_id?: number;
  is_primary: boolean;
  email_notifications?: boolean;
}

export interface Medicine {
  id: number;
  name: string;
  description: string;
  dosage_unit: string;
  compartment_id: number | null;
}

export interface CompartmentState {
  id: number;
  compartment_number: number;
  medicine_name: string | null;
  dosage: string | null;
  schedule_time: string | null;
  lid_open: boolean;
  stock_percent: number;
  stock_status: string; // 'FULL' | 'LOW' | 'EMPTY' | 'full' | 'low' | 'empty'
  reminder_active: boolean;
  last_interaction_at: string | null;
  state_label: string;
}

export interface Schedule {
  id: number;
  compartment_id: number;
  compartment_number?: number;
  medicine_name?: string;
  scheduled_time: string;
  days_of_week: string; // e.g. "1,2,3,4,5,6,7" or array
  is_active: boolean;
  grace_period_minutes: number;
}

export interface EventItem {
  event_id: string;
  device_id: string;
  compartment_id: number;
  event_type: string;
  sensor_value: number | null;
  device_timestamp?: string | null;
  received_at: string;
  detail: string | null;
}

export interface AlertItem {
  id: number;
  event_id: string;
  alert_type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  compartment_id: number | null;
  device_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface DeviceStatus {
  device_id: string;
  is_online: boolean;
  last_heartbeat_at: string | null;
  firmware_version?: string | null;
  name?: string | null;
}

export interface VoiceSettings {
  enabled: boolean;
  volume: number;
  language: string;
}
