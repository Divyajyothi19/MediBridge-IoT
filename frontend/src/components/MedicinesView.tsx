import React, { useState } from 'react';
import { 
  Pill, 
  Plus, 
  Clock, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { Medicine, Schedule, CompartmentState } from '../types';
import { 
  createMedicine, 
  updateMedicine, 
  deleteMedicine,
  createSchedule
} from '../services/api';

interface MedicinesViewProps {
  medicines: Medicine[];
  schedules: Schedule[];
  compartments: CompartmentState[];
  onRefresh: () => void;
}

export const MedicinesView: React.FC<MedicinesViewProps> = ({
  medicines,
  schedules,
  compartments,
  onRefresh,
}) => {
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medName, setMedName] = useState('');
  const [medDesc, setMedDesc] = useState('');
  const [dosageUnit, setDosageUnit] = useState('tablet');
  const [compAssignment, setCompAssignment] = useState<number | null>(1);
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setMedName('');
    setMedDesc('');
    setDosageUnit('tablet');
    setCompAssignment(1);
    setScheduleTime('08:00');
    setEditingMed(null);
    setShowAddMedModal(false);
    setErrorMsg(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddMedModal(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMed(med);
    setMedName(med.name);
    setMedDesc(med.description || '');
    setDosageUnit(med.dosage_unit || 'tablet');
    setCompAssignment(med.compartment_id);
    const relatedSched = schedules.find(s => s.compartment_id === med.compartment_id);
    if (relatedSched) {
      setScheduleTime(relatedSched.scheduled_time);
    }
    setShowAddMedModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      setErrorMsg('Medicine name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingMed) {
        await updateMedicine(editingMed.id, {
          name: medName,
          description: medDesc,
          dosage_unit: dosageUnit,
          compartment_id: compAssignment,
        });
      } else {
        await createMedicine({
          name: medName,
          description: medDesc,
          dosage_unit: dosageUnit,
          compartment_id: compAssignment,
        });

        // Also add schedule if compartment assigned
        if (compAssignment) {
          try {
            await createSchedule({
              compartment_id: compAssignment,
              scheduled_time: scheduleTime,
              days_of_week: '1,2,3,4,5,6,7',
              is_active: true,
              grace_period_minutes: 30,
            });
          } catch {
            // Schedule may already exist for compartment
          }
        }
      }
      onRefresh();
      resetForm();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return;
    try {
      await deleteMedicine(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            Medicine & Schedule Management
          </h3>
          <p className="text-xs text-slate-500">
            Configure prescribed medications, assigned pillbox compartments, and reminder schedules
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary self-start sm:self-auto flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Medicines Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {medicines.map((med) => {
          const comp = compartments.find(c => c.compartment_number === med.compartment_id);
          const sched = schedules.find(s => s.compartment_id === med.compartment_id);

          return (
            <div key={med.id} className="card border border-slate-200/80 flex flex-col justify-between hover:border-teal-300 transition-all">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                      {med.compartment_id ? `C${med.compartment_id}` : '—'}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{med.name}</h4>
                      <p className="text-xs text-slate-500">
                        {med.compartment_id ? `Assigned to Compartment ${med.compartment_id}` : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 min-h-[44px]">
                  {med.description || 'No description provided.'}
                </p>

                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Dosage Form:</span>
                    <span className="font-semibold capitalize text-slate-800">{med.dosage_unit || 'Tablet'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Scheduled Time:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {sched?.scheduled_time || comp?.schedule_time || '08:00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Grace Window:</span>
                    <span className="font-semibold text-slate-800">30 minutes</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(med)}
                  className="p-2 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-all"
                  title="Edit Medicine"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(med.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-all"
                  title="Delete Medicine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h4 className="text-lg font-bold text-slate-900">
                {editingMed ? 'Edit Medication' : 'Add Medication'}
              </h4>
              <button 
                onClick={resetForm} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="label">Medication Name & Strength</label>
                <input
                  type="text"
                  placeholder="e.g. Metformin 500mg"
                  className="input-field"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Description / Instructions</label>
                <textarea
                  placeholder="e.g. Take 1 tablet with water after breakfast"
                  className="input-field min-h-[70px]"
                  value={medDesc}
                  onChange={(e) => setMedDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Dosage Unit</label>
                  <select
                    className="input-field"
                    value={dosageUnit}
                    onChange={(e) => setDosageUnit(e.target.value)}
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="drops">Drops</option>
                    <option value="syrup">Syrup</option>
                  </select>
                </div>

                <div>
                  <label className="label">Compartment (1-3)</label>
                  <select
                    className="input-field"
                    value={compAssignment || ''}
                    onChange={(e) => setCompAssignment(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="1">Compartment 1</option>
                    <option value="2">Compartment 2</option>
                    <option value="3">Compartment 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Daily Reminder Time (HH:MM)</label>
                <input
                  type="time"
                  className="input-field"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingMed ? 'Save Changes' : 'Add Medication'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
