// Sample/Demo Data for MediBridge
// DEMO DATA — Not real patient information

export interface Patient {
  id: number;
  name: string;
  age: number;
  medical_notes: string;
}

export interface Caregiver {
  id: number;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  email_notifications: boolean;
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
  compartment_number: 1 | 2 | 3;
  medicine_name: string;
  dosage: string;
  schedule_time: string;
  lid_open: boolean;
  stock_percent: number;
  stock_status: 'full' | 'low' | 'empty';
  reminder_active: boolean;
  last_interaction_at: string | null;
  state_label: 'upcoming' | 'due' | 'interaction_recorded' | 'wrong_compartment' | 'low_stock' | 'empty';
}

export interface Schedule {
  id: number;
  compartment_id: number;
  compartment_number: number;
  medicine_name: string;
  scheduled_time: string;
  days_of_week: string[];
  is_active: boolean;
  grace_period_minutes: number;
}

export interface Event {
  event_id: string;
  device_id: string;
  compartment_id: number;
  compartment_number: number;
  event_type: string;
  sensor_value: number;
  received_at: string;
  detail: string;
}

export interface Alert {
  id: number;
  event_id: string;
  alert_type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  compartment_id: number;
  device_id: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface DeviceStatus {
  device_id: string;
  is_online: boolean;
  last_heartbeat_at: string;
  firmware_version: string;
  name: string;
}

export const samplePatient: Patient = {
  id: 1,
  name: 'Ravi Kumar',
  age: 68,
  medical_notes: 'Type 2 Diabetes, Hypertension. Take medicines after meals. Avoid missing doses.',
};

export const sampleCaregivers: Caregiver[] = [
  {
    id: 1,
    name: 'Priya Kumar',
    email: 'priya.kumar@example.com',
    phone: '+91 98765 43210',
    relationship: 'Daughter',
    is_primary: true,
    email_notifications: true,
  },
  {
    id: 2,
    name: 'Dr. Suresh Rao',
    email: 'dr.suresh@hospital.example.com',
    phone: '+91 80234 56789',
    relationship: 'Physician',
    is_primary: false,
    email_notifications: true,
  },
];

export const sampleMedicines: Medicine[] = [
  { id: 1, name: 'Metformin 500mg', description: 'Controls blood sugar levels', dosage_unit: 'tablet', compartment_id: 1 },
  { id: 2, name: 'Amlodipine 5mg', description: 'Lowers blood pressure', dosage_unit: 'tablet', compartment_id: 2 },
  { id: 3, name: 'Atorvastatin 10mg', description: 'Controls cholesterol levels', dosage_unit: 'tablet', compartment_id: 3 },
];

export const sampleCompartments: CompartmentState[] = [
  {
    id: 1,
    compartment_number: 1,
    medicine_name: 'Metformin 500mg',
    dosage: '1 tablet',
    schedule_time: '08:00',
    lid_open: false,
    stock_percent: 75,
    stock_status: 'full',
    reminder_active: false,
    last_interaction_at: new Date(Date.now() - 3600000 * 10).toISOString(),
    state_label: 'interaction_recorded',
  },
  {
    id: 2,
    compartment_number: 2,
    medicine_name: 'Amlodipine 5mg',
    dosage: '1 tablet',
    schedule_time: '14:00',
    lid_open: false,
    stock_percent: 40,
    stock_status: 'low',
    reminder_active: true,
    last_interaction_at: null,
    state_label: 'due',
  },
  {
    id: 3,
    compartment_number: 3,
    medicine_name: 'Atorvastatin 10mg',
    dosage: '1 tablet',
    schedule_time: '20:00',
    lid_open: false,
    stock_percent: 15,
    stock_status: 'low',
    reminder_active: false,
    last_interaction_at: null,
    state_label: 'upcoming',
  },
];

export const sampleSchedules: Schedule[] = [
  { id: 1, compartment_id: 1, compartment_number: 1, medicine_name: 'Metformin 500mg', scheduled_time: '08:00', days_of_week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], is_active: true, grace_period_minutes: 30 },
  { id: 2, compartment_id: 2, compartment_number: 2, medicine_name: 'Amlodipine 5mg', scheduled_time: '14:00', days_of_week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], is_active: true, grace_period_minutes: 30 },
  { id: 3, compartment_id: 3, compartment_number: 3, medicine_name: 'Atorvastatin 10mg', scheduled_time: '20:00', days_of_week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], is_active: true, grace_period_minutes: 30 },
];

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const sampleEvents: Event[] = [
  { event_id: 'evt-001', device_id: 'medibridge-001', compartment_id: 1, compartment_number: 1, event_type: 'compartment_opened', sensor_value: 1, received_at: new Date(Date.now() - 3600000 * 10).toISOString(), detail: 'Compartment 1 opened' },
  { event_id: 'evt-002', device_id: 'medibridge-001', compartment_id: 1, compartment_number: 1, event_type: 'compartment_closed', sensor_value: 0, received_at: new Date(Date.now() - 3600000 * 10 + 30000).toISOString(), detail: 'Compartment 1 closed' },
  { event_id: 'evt-003', device_id: 'medibridge-001', compartment_id: 2, compartment_number: 2, event_type: 'reminder_started', sensor_value: 1, received_at: new Date(Date.now() - 1800000).toISOString(), detail: 'Reminder started for compartment 2' },
  { event_id: 'evt-004', device_id: 'medibridge-001', compartment_id: 3, compartment_number: 3, event_type: 'compartment_opened', sensor_value: 1, received_at: daysAgo(1), detail: 'Compartment 3 opened' },
  { event_id: 'evt-005', device_id: 'medibridge-001', compartment_id: 2, compartment_number: 2, event_type: 'wrong_compartment', sensor_value: 2, received_at: daysAgo(2), detail: 'Wrong compartment opened — expected compartment 1' },
];

export const sampleAlerts: Alert[] = [
  { id: 1, event_id: 'evt-005', alert_type: 'wrong_compartment', severity: 'HIGH', message: 'Wrong compartment opened at 2:30 PM. Expected Compartment 1 (Metformin)', compartment_id: 2, device_id: 'medibridge-001', resolved: false, resolved_at: null, created_at: daysAgo(2) },
  { id: 2, event_id: 'evt-006', alert_type: 'reminder_missed', severity: 'MEDIUM', message: 'Reminder missed for Compartment 2 (Amlodipine) at 2:00 PM', compartment_id: 2, device_id: 'medibridge-001', resolved: false, resolved_at: null, created_at: daysAgo(1) },
  { id: 3, event_id: 'evt-007', alert_type: 'stock_low', severity: 'LOW', message: 'Compartment 3 (Atorvastatin) stock is low — 15% remaining', compartment_id: 3, device_id: 'medibridge-001', resolved: true, resolved_at: daysAgo(0), created_at: daysAgo(3) },
];

export const sampleDeviceStatus: DeviceStatus = {
  device_id: 'medibridge-001',
  is_online: false,
  last_heartbeat_at: new Date(Date.now() - 120000).toISOString(),
  firmware_version: 'v1.2.0',
  name: 'MediBridge Box — Ravi Kumar',
};

// Adherence data for charts
export const sampleAdherenceData = [
  { day: 'Mon', rate: 100, taken: 3, missed: 0 },
  { day: 'Tue', rate: 67, taken: 2, missed: 1 },
  { day: 'Wed', rate: 100, taken: 3, missed: 0 },
  { day: 'Thu', rate: 100, taken: 3, missed: 0 },
  { day: 'Fri', rate: 33, taken: 1, missed: 2 },
  { day: 'Sat', rate: 100, taken: 3, missed: 0 },
  { day: 'Sun', rate: 67, taken: 2, missed: 1 },
];

export const sampleStockData = [
  { compartment: 'C1 Metformin', stock: 75 },
  { compartment: 'C2 Amlodipine', stock: 40 },
  { compartment: 'C3 Atorvastatin', stock: 15 },
];

export const sampleEventDistribution = [
  { name: 'Interaction Recorded', value: 18, color: '#14b8a6' },
  { name: 'Reminders Triggered', value: 7, color: '#38bdf8' },
  { name: 'Wrong Compartment', value: 2, color: '#ef4444' },
  { name: 'Reminder Missed', value: 3, color: '#f97316' },
];
