import React, { useState } from "react";
import "./DebugPanel.css";
import SettingsTab from "./SettingsTab";
import LogsTab from "./LogsTab";
import LMInspector from "./LMInspector";

type Tab = "Settings" | "Inspector" | "Logs";

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

export interface LMDebugInfo {
  enabled: boolean;
  status: string;
  band: { start: number; end: number } | null;
  span: string | null;
  ctxBefore: string;
  ctxAfter: string;
  prompt: string | null;
  controlJson: string;
  lastChunks?: string[];
}

interface DebugPanelProps {
  idleMs: number;
  onIdleMsChange: (value: number) => void;
  logs: LogEntry[];
  lmDebug?: LMDebugInfo;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ idleMs, onIdleMsChange, logs, lmDebug }) => {
  const [activeTab, setActiveTab] = useState<Tab>("Logs");

  const renderTabContent = () => {
    switch (activeTab) {
      case "Settings":
        return <SettingsTab idleMs={idleMs} onIdleMsChange={onIdleMsChange} />;
      case "Inspector":
        return <LMInspector info={lmDebug} />;
      case "Logs":
        return <LogsTab logs={logs} />;
      default:
        return null;
    }
  };

  return (
    <div className="debug-panel">
      <div className="tabs">
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
      </div>
      <div className="tab-content">{renderTabContent()}</div>
    </div>
  );
};

export default DebugPanel;
