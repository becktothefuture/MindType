import React from 'react';

interface SettingsTabProps {
  idleMs: number;
  onIdleMsChange: (value: number) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ idleMs, onIdleMsChange }) => {
  return (
    <div>
      <h3>Settings</h3>
      <div className="setting">
        <label htmlFor="idleMs">Idle Threshold (ms)</label>
        <input
          type="range"
          id="idleMs"
          min="100"
          max="2000"
          step="50"
          value={idleMs}
          onChange={(e) => onIdleMsChange(Number(e.target.value))}
        />
        <span>{idleMs}ms</span>
      </div>
    </div>
  );
};

export default SettingsTab;
