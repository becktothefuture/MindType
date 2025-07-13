import React from 'react';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

interface LogsTabProps {
  logs: LogEntry[];
}

const LogsTab: React.FC<LogsTabProps> = ({ logs }) => {
  return (
    <div>
      <h3>Logs</h3>
      <div className="log-container">
        {logs.map((log, index) => (
          <div key={index} className={`log-entry log-${log.level.toLowerCase()}`}>
            <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="log-level">{log.level}</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogsTab; 