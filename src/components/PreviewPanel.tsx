import React from 'react';
import { DSXJobInfo } from '@/lib/types/dsxTypes';

interface PreviewPanelProps {
  data: DSXJobInfo | null;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ data }) => {
  if (!data) return <div>No file selected</div>;

  return (
    <div className="preview-container">
      <h3>{data.name}</h3>
      <p>Type: {data.type}</p>
      <p>Description: {data.description}</p>
      
      <div className="sections">
        <h4>Sources ({data.sources.length})</h4>
        <ul>
          {data.sources.map((source, i) => (
            <li key={i}>{source.name} ({source.type})</li>
          ))}
        </ul>

        <h4>Targets ({data.targets.length})</h4>
        <ul>
          {data.targets.map((target, i) => (
            <li key={i}>{target.name} ({target.type})</li>
          ))}
        </ul>
      </div>
    </div>
  );
};