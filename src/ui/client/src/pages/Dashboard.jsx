import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { StatCard, EmptyState, Markdown } from '../components/ui.jsx';

export default function Dashboard() {
  const { project, overview, bumpRefresh, showToast } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!project) {
    return (
      <EmptyState icon="🧠" title="选择一个项目开始"
        desc="AMM 管理的是项目内的 .memory/ 目录。点击左侧「打开项目…」选择本地目录；新项目也可以打开后再初始化。">
        <button className="btn btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('amm:open-project'))}>
          打开项目…
        </button>
      </EmptyState>
    );
  }

  async function initMemory() {
    setBusy(true);
    try {
      await api.post('/api/memory/init', { withAgentsMd: false });
      showToast('已初始化 .memory/');
      bumpRefresh();
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  const c = overview?.counts;
  const st = overview?.statusSummary;

  return (
    <div className="page">
      <div className="card hero">
        <div>
          <div className="hero-title">{project.name}</div>
          <div className="hero-path">{project.path}</div>
          <div className="hero-badges">
            <span className={`badge ${project.memoryInitialized ? 'ok' : 'warn'}`}>
              {project.memoryInitialized ? '.memory 已初始化' : '.memory 未初始化'}
            </span>
            <span className={`badge ${project.isGitRepo ? 'ok' : ''}`}>{project.isGitRepo ? 'Git 仓库' : '非 Git 仓库'}</span>
            {st?.blocked && <span className="badge err">有阻塞项</span>}
          </div>
        </div>
        <div className="hero-actions">
          {!project.memoryInitialized && (
            <button className="btn btn-primary" disabled={busy} onClick={initMemory}>
              {busy ? '初始化中…' : '初始化记忆'}
            </button>
          )}
          <button className="btn" onClick={() => navigate('/handoffs?new=1')} disabled={!project.memoryInitialized}>＋ 新建交接</button>
          <button className="btn" onClick={() => navigate('/memory')} disabled={!project.memoryInitialized}>打开记忆库</button>
        </div>
      </div>

      {!project.memoryInitialized ? (
        <EmptyState icon="📄" title="该项目还没有 .memory/"
          desc="初始化会创建 decisions / gotchas / conventions / current-status 与 handoffs/ 骨架，与 amm init 完全一致，绝不覆盖已有内容。" />
      ) : (
        <>
          <div className="grid-4">
            <StatCard label="决策 Decisions" value={c?.decisions ?? '—'} onClick={() => navigate('/memory/decisions')} />
            <StatCard label="踩坑 Gotchas" value={c?.gotchas ?? '—'} onClick={() => navigate('/memory/gotchas')} />
            <StatCard label="约定 Conventions" value={c?.conventions ?? '—'} onClick={() => navigate('/memory/conventions')} />
            <StatCard label="交接 Handoffs" value={c?.handoffs ?? '—'} onClick={() => navigate('/handoffs')} />
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-title">
                当前状态摘要
                <span className={`badge ${st?.blocked ? 'err' : 'ok'}`}>{st?.blocked ? '有阻塞' : '无阻塞'}</span>
              </div>
              {st?.updates?.length ? (
                <div className="status-updates">{st.updates.map((u, i) => <div key={i} className="status-item">• {u}</div>)}</div>
              ) : (
                <div className="card subtle slim">暂无最近更新记录</div>
              )}
              {st?.blocked && (
                <div className="block-list">
                  <div className="card-title small">阻塞 / 待决</div>
                  {(st.sections['阻塞 / 待决'] || []).map((b, i) => <div key={i} className="status-item warn">⚠ {b}</div>)}
                </div>
              )}
              <button className="btn btn-ghost" onClick={() => navigate('/memory/status')}>查看完整 current-status →</button>
            </div>

            <div className="card">
              <div className="card-title">最近交接 <span className="muted">（最新 5 条）</span></div>
              {(overview?.recentHandoffs ?? []).length === 0 && <div className="card subtle slim">暂无交接记录</div>}
              {(overview?.recentHandoffs ?? []).map((h) => (
                <div key={h.file} className="handoff-mini" onClick={() => navigate(`/handoffs?file=${encodeURIComponent(h.file)}`)}>
                  <div className="hm-title">{h.meta.summary || h.file}</div>
                  <div className="hm-meta">
                    <span className="chip">{h.meta.from || '?'}</span>→<span className="chip">{h.meta.to || '?'}</span>
                    <span className="muted">{h.meta.date}</span>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost" onClick={() => navigate('/handoffs')}>全部交接 →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
