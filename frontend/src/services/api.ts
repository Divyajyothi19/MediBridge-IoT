import axios from 'axios';

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE_URL = import.meta.env.VITE_API_URL || `http://${host}:8000`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    console.error('[API Error]', message, error);
    return Promise.reject(new Error(message));
  }
);

// --- Patients ---
export const getPatients = () => api.get('/api/patients').then(r => r.data);
export const getPatient = (id: number) => api.get(`/api/patients/${id}`).then(r => r.data);
export const createPatient = (data: unknown) => api.post('/api/patients', data).then(r => r.data);
export const updatePatient = (id: number, data: unknown) => api.put(`/api/patients/${id}`, data).then(r => r.data);
export const deletePatient = (id: number) => api.delete(`/api/patients/${id}`).then(r => r.data);

// --- Caregivers ---
export const getCaregivers = () => api.get('/api/caregivers').then(r => r.data);
export const getCaregiver = (id: number) => api.get(`/api/caregivers/${id}`).then(r => r.data);
export const createCaregiver = (data: unknown) => api.post('/api/caregivers', data).then(r => r.data);
export const updateCaregiver = (id: number, data: unknown) => api.put(`/api/caregivers/${id}`, data).then(r => r.data);
export const deleteCaregiver = (id: number) => api.delete(`/api/caregivers/${id}`).then(r => r.data);

// --- Medicines ---
export const getMedicines = () => api.get('/api/medicines').then(r => r.data);
export const getMedicine = (id: number) => api.get(`/api/medicines/${id}`).then(r => r.data);
export const createMedicine = (data: unknown) => api.post('/api/medicines', data).then(r => r.data);
export const updateMedicine = (id: number, data: unknown) => api.put(`/api/medicines/${id}`, data).then(r => r.data);
export const deleteMedicine = (id: number) => api.delete(`/api/medicines/${id}`).then(r => r.data);

// --- Schedules ---
export const getSchedules = () => api.get('/api/schedules').then(r => r.data);
export const createSchedule = (data: unknown) => api.post('/api/schedules', data).then(r => r.data);
export const updateSchedule = (id: number, data: unknown) => api.put(`/api/schedules/${id}`, data).then(r => r.data);
export const deleteSchedule = (id: number) => api.delete(`/api/schedules/${id}`).then(r => r.data);

// --- Devices ---
export const getDevices = () => api.get('/api/devices').then(r => r.data);
export const getDeviceStatus = (deviceId: string) => api.get(`/api/devices/${deviceId}/status`).then(r => r.data);
export const getDeviceCompartments = (deviceId: string) => api.get(`/api/devices/${deviceId}/compartments`).then(r => r.data);
export const triggerReminder = (deviceId: string, compartmentId: number = 1) =>
  api.post(`/api/devices/${deviceId}/reminders`, { compartment_id: compartmentId }).then(r => r.data);
export const clearReminder = (deviceId: string) => api.delete(`/api/devices/${deviceId}/reminders`).then(r => r.data);
export const triggerBuzzer = (deviceId: string, action: 'test' | 'mute' = 'test') =>
  api.post(`/api/devices/${deviceId}/buzzer`, { action }).then(r => r.data);

// --- Events ---
export const getEvents = (params?: Record<string, unknown>) => api.get('/api/events', { params }).then(r => r.data);
export const ingestEvent = (data: {
  event_id: string;
  device_id: string;
  compartment_id: number;
  event_type: string;
  sensor_value?: number;
  detail?: string;
}) => api.post('/api/events/ingest', data).then(r => r.data);

// --- Alerts ---
export const getAlerts = (params?: Record<string, unknown>) => api.get('/api/alerts', { params }).then(r => r.data);
export const resolveAlert = (id: number) => api.put(`/api/alerts/${id}/resolve`).then(r => r.data);

// --- Notifications ---
export const getNotifications = () => api.get('/api/notifications').then(r => r.data);

// --- Compartments ---
export const getCompartment = (id: number) => api.get(`/api/compartments/${id}`).then(r => r.data);
export const updateCompartment = (id: number, data: unknown) => api.put(`/api/compartments/${id}`, data).then(r => r.data);

// --- Reports ---
export const getAdherenceReport = () => api.get('/api/reports/adherence').then(r => r.data);
export const getStockHistory = () => api.get('/api/reports/stock-history').then(r => r.data);
export const getEventSummary = () => api.get('/api/reports/event-summary').then(r => r.data);

export default api;
