import React from 'react';
import type { LMDebugInfo } from './DebugPanel';

interface Props { info?: LMDebugInfo }

const CodeBlock: React.FC<{ title: string; content: string | null | undefined }> = ({ title, content }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
    <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#0f0', padding: 8, borderRadius: 4, fontSize: 12 }}>
      {content || '—'}
    </pre>
  </div>
);

const LMInspector: React.FC<Props> = ({ info }) => {
  if (!info?.enabled) return <div>LM disabled or not active.</div>;
  return (
    <div>
      <h3>LM Inspector</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div><b>Status:</b> {info.status}</div>
          <div><b>Band:</b> {info.band ? `[${info.band.start}, ${info.band.end}]` : '—'}</div>
        </div>
        <div>
          <div><b>Span length:</b> {info.span?.length ?? 0}</div>
          <div><b>Recent chunks:</b> {(info.lastChunks || []).slice(-5).join(' | ') || '—'}</div>
        </div>
      </div>
      <CodeBlock title="CONTROL JSON" content={info.controlJson} />
      <CodeBlock title="Prompt" content={info.prompt} />
      <CodeBlock title="Context Before" content={info.ctxBefore} />
      <CodeBlock title="Span" content={info.span || ''} />
      <CodeBlock title="Context After" content={info.ctxAfter} />
    </div>
  );
};

export default LMInspector;


