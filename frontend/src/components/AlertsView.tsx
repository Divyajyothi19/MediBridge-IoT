import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Check 
} from 'lucide-react';
import type { AlertItem } from '../types';
import { resolveAlert } from '../services/api';

interface AlertsViewProps {
  alerts: AlertItem[];
  onRefresh: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unresolved') return !a.resolved;
    if (filter === 'resolved') return a.resolved;
    return true;
  });

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Live Emergency & Medication Alert Center
          </h3>
          <p className="text-xs text-slate-500">
            Real-time critical safety events including wrong compartment access, missed schedules, and stock depletion
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto text-xs font-medium">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'unresolved' ? 'bg-white text-red-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({alerts.filter(a => !a.resolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'resolved' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved ({alerts.filter(a => a.resolved).length})
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3.5">
        {filteredAlerts.length === 0 ? (
          <div className="card text-center py-12 border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">No alerts found</h4>
            <p className="text-xs text-slate-500">All medication schedules and compartment accesses are normal.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isHigh = alert.severity === 'HIGH';

            return (
              <div 
                key={alert.id}
                className={`card border transition-all p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  alert.resolved
                    ? 'border-slate-200/60 bg-slate-50/50 opacity-75'
                    : isHigh
                    ? 'border-red-200 bg-red-50/30 ring-1 ring-red-400/20'
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    alert.resolved
                      ? 'bg-slate-200 text-slate-600'
                      : isHigh
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {alert.resolved ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        alert.resolved
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : isHigh
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {alert.severity} PRIORITY
                      </span>

                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>

                      {alert.compartment_id && (
                        <span className="text-xs text-slate-500">
                          • Compartment {alert.compartment_id}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 font-medium">
                      {alert.message}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Triggered: {new Date(alert.created_at).toLocaleString()}
                      </span>
                      {alert.resolved && alert.resolved_at && (
                        <span className="text-emerald-600 font-medium">
                          Resolved: {new Date(alert.resolved_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center self-end md:self-auto gap-2">
                  {!alert.resolved ? (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all disabled:opacity-50"
                    >
                      {resolvingId === alert.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>Acknowledge & Resolve</span>
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
