import React, { useState } from 'react';
import './DebugPanel.css';
import SettingsTab from './SettingsTab';
import LogsTab from './LogsTab';

type Tab = 'Metrics' | 'Settings' | 'Inspector' | 'Logs';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

interface DebugPanelProps {
  idleMs: number;
  onIdleMsChange: (value: number) => void;
  logs: LogEntry[];
}

const DebugPanel: React.FC<DebugPanelProps> = ({ idleMs, onIdleMsChange, logs }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Logs');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Metrics':
        return <div>Metrics content will go here.</div>;
      case 'Settings':
        return <SettingsTab idleMs={idleMs} onIdleMsChange={onIdleMsChange} />;
      case 'Inspector':
        return <div>Inspector content will go here.</div>;
      case 'Logs':
        return <LogsTab logs={logs} />;
      default:
        return null;
    }
  };

  return (
    <div className="debug-panel">
      <div className="tabs">
        <button onClick={() => setActiveTab('Metrics')} className={activeTab === 'Metrics' ? 'active' : ''}>Metrics</button>
        <button onClick={() => setActiveTab('Settings')} className={activeTab === 'Settings' ? 'active' : ''}>Settings</button>
        <button onClick={() => setActiveTab('Inspector')} className={activeTab === 'Inspector' ? 'active' : ''}>Inspector</button>
        <button onClick={() => setActiveTab('Logs')} className={activeTab === 'Logs' ? 'active' : ''}>Logs</button>
      </div>
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DebugPanel; 