import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  History, 
  Info, 
  Box 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import type { EventItem, CompartmentState } from '../types';
import { 
  sampleAdherenceData 
} from '../data/sampleData';

interface ReportsViewProps {
  events: EventItem[];
  compartments: CompartmentState[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ events, compartments }) => {
  const [filterType, setFilterType] = useState<string>('all');

  // Stock comparison data for chart
  const stockChartData = compartments.map(c => ({
    name: `C${c.compartment_number} (${c.medicine_name?.split(' ')[0] || 'Empty'})`,
    stock: c.stock_percent,
  }));

  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    return e.event_type === filterType;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-600" />
          Medication Interaction History & Telemetry Analytics
        </h3>
        <p className="text-xs text-slate-500">
          Adherence trends, stock depletion rates, and verified physical interaction logs
        </p>
      </div>

      {/* Accuracy Disclosure Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          <strong>Adherence Measurement Note:</strong> Scheduled interaction adherence measures whether the designated compartment lid was opened during the scheduled window. It acts as an operational sensor log for caregivers and does not confirm medicine was swallowed.
        </p>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Adherence Rate */}
        <div className="card border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Weekly Scheduled Interaction Rates (%)
              </h4>
              <p className="text-[11px] text-slate-500">Percentage of doses opened on time per weekday</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleAdherenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val ?? 0}%`, 'Adherence Rate']}
                />
                <Bar dataKey="rate" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Compartment Stock Levels */}
        <div className="card border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-4 h-4 text-sky-600" />
                Current Stock Level Comparison (%)
              </h4>
              <p className="text-[11px] text-slate-500">Real-time potentiometer measurement across all 3 compartments</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val ?? 0}%`, 'Stock Level']}
                />
                <Bar dataKey="stock" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Raw Sensor & Interaction Event Log Table */}
      <div className="card border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            <h4 className="text-base font-bold text-slate-900">Historical Interaction & Telemetry Events</h4>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter:</span>
            <select
              className="input-field text-xs py-1.5 px-3 max-w-xs"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Events ({events.length})</option>
              <option value="compartment_opened">Compartment Opened</option>
              <option value="compartment_closed">Compartment Closed</option>
              <option value="reminder_started">Reminder Started</option>
              <option value="wrong_compartment">Wrong Compartment</option>
              <option value="stock_changed">Stock Changed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Compartment</th>
                <th className="py-2.5 px-3">Sensor Value</th>
                <th className="py-2.5 px-3">Device ID</th>
                <th className="py-2.5 px-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No matching events recorded yet.
                  </td>
                </tr>
              ) : (
                filteredEvents.slice(0, 15).map((ev) => (
                  <tr key={ev.event_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {ev.received_at ? new Date(ev.received_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 capitalize">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        ev.event_type.includes('wrong') ? 'bg-red-50 text-red-700' :
                        ev.event_type.includes('reminder') ? 'bg-amber-50 text-amber-700' :
                        'bg-teal-50 text-teal-700'
                      }`}>
                        {ev.event_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      Compartment {ev.compartment_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {ev.sensor_value !== null ? ev.sensor_value : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {ev.device_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">
                      {ev.detail || 'Sensor state change'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
