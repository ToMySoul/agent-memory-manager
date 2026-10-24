import React, { useEffect } from 'react';
import { renderMarkdown } from '../markdown.js';
import { useApp } from '../App.jsx';

export function StatCard({ label, value, sub, tone, onClick, children }) {
  return (
    <div className={`card stat${tone ? ` tone-${tone}` : ''}${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {children}
    </div>
  );
}

export function MemoryCard({ icon, title, desc, count, onClick }) {
  return (
    <div className="card mem-card clickable" onClick={onClick}>
      <div className="mem-icon">{icon}</div>
      <div className="mem-title">{title}</div>
      <div className="mem-desc">{desc}</div>
      <div className="mem-count">{count} 条</div>
    </div>
  );
}

export function Drawer({ title, sub, onClose, children, width = 560 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="drawer-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" style={{ width }}>
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{title}</div>
            {sub && <div className="drawer-sub">{sub}</div>}
          </div>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`}>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}{hint && <em className="field-hint">{hint}</em>}</span>
      {children}
    </label>
  );
}

export function AgentSelect({ value, onChange }) {
  const { settings } = useApp();
  return (
    <>
      <input className="input" list="agent-options" value={value} onChange={(e) => onChange(e.target.value)} placeholder="例如 codex" />
      <datalist id="agent-options">
        {(settings.defaultAgents || []).map((a) => <option key={a} value={a} />)}
      </datalist>
    </>
  );
}

export function Markdown({ text }) {
  return <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
}

export function EmptyState({ icon = '🗂', title, desc, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {desc && <div className="empty-desc">{desc}</div>}
      {children}
    </div>
  );
}

export function PageHead({ title, desc, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}
