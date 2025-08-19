import React, { useState } from "react";
import "./DebugPanel.css";
import SettingsTab from "./SettingsTab";
import LogsTab from "./LogsTab";

type Tab = "Metrics" | "Settings" | "Inspector" | "Logs" | "LM";

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

interface DebugPanelProps {
  idleMs: number;
  onIdleMsChange: (value: number) => void;
  logs: LogEntry[];
  lmDebug?: { prompt?: string; output?: string; band?: { start: number; end: number } | null };
  metrics?: { prompts: number; completes: number; aborts: number; staleDrops: number; backend?: string; lastLatencyMs?: number | null; autoDegraded?: boolean };
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  idleMs,
  onIdleMsChange,
  logs,
  lmDebug,
  metrics,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("Logs");

  const renderTabContent = () => {
    switch (activeTab) {
      case "Metrics":
        return (
          <div style={{ fontFamily: "monospace" }}>
            <div><strong>Backend:</strong> {metrics?.backend ?? '—'}</div>
            <div><strong>Prompts:</strong> {metrics?.prompts ?? 0}</div>
            <div><strong>Completes:</strong> {metrics?.completes ?? 0}</div>
            <div><strong>Aborts:</strong> {metrics?.aborts ?? 0}</div>
            <div><strong>Stale drops:</strong> {metrics?.staleDrops ?? 0}</div>
            <div><strong>Last latency (ms):</strong> {metrics?.lastLatencyMs ?? '—'}</div>
            <div><strong>Auto-degraded:</strong> {metrics?.autoDegraded ? 'yes' : 'no'}</div>
          </div>
        );
      case "Settings":
        return <SettingsTab idleMs={idleMs} onIdleMsChange={onIdleMsChange} />;
      case "Inspector":
        return <div>Inspector content will go here.</div>;
      case "Logs":
        return <LogsTab logs={logs} />;
      case "LM":
        return (
          <div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            <div><strong>Band:</strong> {lmDebug?.band ? `[${lmDebug.band.start}, ${lmDebug.band.end}]` : '—'}</div>
            <div><strong>Prompt:</strong></div>
            <div style={{ background: '#111', color: '#0f0', padding: 8, borderRadius: 4 }}>
              {lmDebug?.prompt ?? '—'}
            </div>
            <div style={{ marginTop: 8 }}><strong>Output (streamed):</strong></div>
            <div style={{ background: '#111', color: '#0ff', padding: 8, borderRadius: 4 }}>
              {lmDebug?.output ?? '—'}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="debug-panel">
      <div className="tabs">
        <button
          onClick={() => setActiveTab("Metrics")}
          className={activeTab === "Metrics" ? "active" : ""}
        >
          Metrics
        </button>
        <button
          onClick={() => setActiveTab("Settings")}
          className={activeTab === "Settings" ? "active" : ""}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab("Inspector")}
          className={activeTab === "Inspector" ? "active" : ""}
        >
          Inspector
        </button>
        <button
          onClick={() => setActiveTab("Logs")}
          className={activeTab === "Logs" ? "active" : ""}
        >
          Logs
        </button>
        <button
          onClick={() => setActiveTab("LM")}
          className={activeTab === "LM" ? "active" : ""}
        >
          LM
        </button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>
    </div>
  );
};

export default DebugPanel;
