import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';

const NEW_ITEMS = [
  { label: '决策', to: '/memory/decisions?new=1' },
  { label: '踩坑', to: '/memory/gotchas?new=1' },
  { label: '约定', to: '/memory/conventions?new=1' },
  { label: '状态更新', to: '/memory/status?new=1' },
  { label: '交接', to: '/handoffs?new=1' },
];

export default function Topbar() {
  const { project, overview, bumpRefresh, showToast } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const timer = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setHits(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    window.clearTimeout(timer.current);
    const query = q.trim();
    if (!query || !project?.memoryInitialized) {
      setHits(null);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const r = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
        setHits(r.hits);
      } catch {
        setHits([]);
      }
    }, 250);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function goto(hit) {
    setHits(null);
    setQ('');
    if (hit.file.startsWith('handoffs/')) {
      navigate(`/handoffs?file=${encodeURIComponent(hit.file.replace('handoffs/', ''))}`);
      return;
    }
    const typeMap = { 'decisions.md': 'decisions', 'gotchas.md': 'gotchas', 'conventions.md': 'conventions', 'current-status.md': 'status' };
    const type = typeMap[hit.file];
    if (type) navigate(`/memory/${type}?line=${hit.line}`);
    else navigate('/memory');
  }

  const counts = overview?.counts;

  return (
    <header className="topbar">
      <div className="topbar-left">
        {project ? (
          <>
            <div className="proj-name">
              {project.name}
              <span className={`badge ${project.memoryInitialized ? 'ok' : 'warn'}`}>
                {project.memoryInitialized ? '.memory 已初始化' : '.memory 未初始化'}
              </span>
              {project.isGitRepo && <span className="badge">Git 仓库</span>}
            </div>
            <div className="proj-path" title={project.path}>{project.path}</div>
          </>
        ) : (
          <div className="proj-name muted">未选择项目</div>
        )}
        {counts && (
          <div className="proj-summary">
            decisions {counts.decisions} · gotchas {counts.gotchas} · conventions {counts.conventions} · handoffs {counts.handoffs}
          </div>
        )}
      </div>

      <div className="topbar-right" ref={boxRef}>
        <div className="searchbox">
          <span className="search-icon">🔍</span>
          <input placeholder="搜索记忆内容…" value={q} onChange={(e) => setQ(e.target.value)}
            disabled={!project?.memoryInitialized}
            onKeyDown={(e) => e.key === 'Escape' && setHits(null)} />
          {hits && (
            <div className="search-drop">
              {hits.length === 0 && <div className="search-empty">没有匹配结果</div>}
              {hits.slice(0, 12).map((h, idx) => (
                <button key={idx} className="search-hit" onClick={() => goto(h)}>
                  <span className="hit-file">{h.file}:{h.line}</span>
                  <span className="hit-text">{h.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="btn" title="重新读取 .memory/"
          onClick={() => { bumpRefresh(); showToast('已刷新'); }}>↻ 刷新</button>

        <div className="dropdown">
          <button className="btn btn-primary" disabled={!project?.memoryInitialized}
            onClick={() => setShowNew((s) => !s)}>＋ 新建 ▾</button>
          {showNew && (
            <div className="dropdown-menu" onMouseLeave={() => setShowNew(false)}>
              {NEW_ITEMS.map((n) => (
                <button key={n.to} className="dropdown-item"
                  onClick={() => { setShowNew(false); navigate(n.to); }}>{n.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
