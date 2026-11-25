import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  BellRing
} from 'lucide-react';
import type { Caregiver } from '../types';
import { createCaregiver, updateCaregiver, deleteCaregiver } from '../services/api';

interface CaregiversViewProps {
  caregivers: Caregiver[];
  patientId: number;
  onRefresh: () => void;
}

export const CaregiversView: React.FC<CaregiversViewProps> = ({
  caregivers,
  patientId,
  onRefresh,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCg, setEditingCg] = useState<Caregiver | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [isPrimary, setIsPrimary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRelationship('Family');
    setIsPrimary(false);
    setEditingCg(null);
    setShowModal(false);
    setErrorMsg(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (cg: Caregiver) => {
    setEditingCg(cg);
    setName(cg.name);
    setEmail(cg.email);
    setPhone(cg.phone || '');
    setRelationship(cg.relationship || 'Family');
    setIsPrimary(cg.is_primary);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Name and Email are required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingCg) {
        await updateCaregiver(editingCg.id, {
          name,
          email,
          phone,
          relationship,
          is_primary: isPrimary,
        });
      } else {
        await createCaregiver({
          name,
          email,
          phone,
          relationship,
          patient_id: patientId || 1,
          is_primary: isPrimary,
        });
      }
      onRefresh();
      resetForm();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save caregiver contact.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this caregiver contact? They will no longer receive alerts.')) {
      return;
    }
    try {
      await deleteCaregiver(id);
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
            <Users className="w-5 h-5 text-teal-600" />
            Caregiver Emergency Contact Network
          </h3>
          <p className="text-xs text-slate-500">
            Add multiple caregivers, family members, or doctors. All registered contacts receive simultaneous real-time email alerts.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary self-start sm:self-auto flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Caregiver</span>
        </button>
      </div>

      {/* Broadcast Guarantee Information Notice */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center gap-3">
        <BellRing className="w-5 h-5 text-sky-600 flex-shrink-0" />
        <p className="text-xs">
          <strong>Simultaneous Alert Broadcast Enabled:</strong> When a wrong compartment interaction or missed reminder occurs, MediBridge dispatches emergency alerts to <strong>all {caregivers.length} registered caregiver email addresses</strong> via Gmail SMTP.
        </p>
      </div>

      {/* Caregiver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {caregivers.map((cg) => (
          <div key={cg.id} className="card border border-slate-200/80 flex flex-col justify-between hover:border-teal-300 transition-all">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-700">
                    {cg.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{cg.name}</h4>
                    <p className="text-xs text-slate-500">{cg.relationship || 'Caregiver'}</p>
                  </div>
                </div>

                {cg.is_primary && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-teal-600" />
                    Primary
                  </span>
                )}
              </div>

              <div className="space-y-2.5 my-4 text-xs text-slate-600">
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{cg.email}</span>
                </div>

                {cg.phone && (
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-800">{cg.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-teal-700 flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" /> Real-time Email Active
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(cg)}
                  className="p-2 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-all"
                  title="Edit details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cg.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-all"
                  title="Remove caregiver"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h4 className="text-lg font-bold text-slate-900">
                {editingCg ? 'Edit Caregiver Contact' : 'Add Caregiver Contact'}
              </h4>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
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
                <label className="label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Kumar"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Email Address (Alerts will be sent here)</label>
                <input
                  type="email"
                  placeholder="e.g. priya.kumar@example.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  className="input-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Relationship to Patient</label>
                <select
                  className="input-field"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                >
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Family Member">Family Member</option>
                  <option value="Physician / Doctor">Physician / Doctor</option>
                  <option value="Professional Nurse">Professional Nurse</option>
                  <option value="Neighbor / Guardian">Neighbor / Guardian</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  id="primaryCg"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="primaryCg" className="text-xs text-slate-700 cursor-pointer font-medium">
                  Designate as Primary Caregiver Contact
                </label>
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
                  <span>{editingCg ? 'Save Changes' : 'Register Caregiver'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
