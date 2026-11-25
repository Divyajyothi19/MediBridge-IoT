import React from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  Users, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Activity,
  Wifi,
  WifiOff,
  ShieldCheck
} from 'lucide-react';

export type TabType = 'overview' | 'medicines' | 'caregivers' | 'alerts' | 'reports' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isDeviceOnline: boolean;
  unresolvedAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  wsStatus,
  isDeviceOnline,
  unresolvedAlertCount,
}) => {
  const navItems = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'medicines' as TabType, label: 'Compartments & Meds', icon: Pill },
    { id: 'caregivers' as TabType, label: 'Caregivers', icon: Users },
    { 
      id: 'alerts' as TabType, 
      label: 'Live Alerts', 
      icon: AlertTriangle, 
      badge: unresolvedAlertCount > 0 ? unresolvedAlertCount : undefined 
    },
    { id: 'reports' as TabType, label: 'History & Reports', icon: BarChart3 },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Medi<span className="text-teal-400">Bridge</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Smart Healthcare IoT</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white text-teal-700' : 'bg-red-500/90 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Connection & Telemetry Status Card */}
      <div className="p-4 mx-4 mb-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            {wsStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            )}
            WebSocket Stream
          </span>
          <span className={`font-semibold capitalize ${
            wsStatus === 'connected' ? 'text-teal-400' : 'text-amber-400'
          }`}>
            {wsStatus}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            ESP32 Device
          </span>
          <span className={`font-semibold ${
            isDeviceOnline ? 'text-teal-400' : 'text-slate-400'
          }`}>
            {isDeviceOnline ? 'Online (V8)' : 'Standby / Offline'}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex justify-between">
          <span>Firmware: <strong className="text-slate-200">v1.0.0</strong></span>
          <span>Blynk: <strong className="text-teal-400">Linked</strong></span>
        </div>
      </div>
    </aside>
  );
};
