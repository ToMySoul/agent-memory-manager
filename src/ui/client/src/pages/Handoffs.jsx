import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Drawer, Modal, Field, AgentSelect, Markdown, EmptyState, PageHead } from '../components/ui.jsx';

export default function Handoffs() {
  const [sp, setSp] = useSearchParams();
  const { project, refreshKey, bumpRefresh, agentFilter, showToast } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const isNew = sp.get('new') === '1';
  const focusFile = sp.get('file');

  useEffect(() => {
    if (isNew) { setShowNew(true); setSp({}, { replace: true }); }
  }, [isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showNew) return;
    if (!project?.memoryInitialized) return;
    setData(null);
    setError(null);
    api.get('/api/memory/handoffs')
      .then((d) => {
        setData(d);
        if (focusFile && d.handoffs) {
          const hit = d.handoffs.find((h) => h.file === focusFile);
          if (hit) openDetail(hit.file);
        }
      })
      .catch((e) => setError(e.message));
  }, [refreshKey, project?.memoryInitialized, focusFile, showNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const handoffs = useMemo(() => {
    if (!data?.handoffs) return [];
    return agentFilter
      ? data.handoffs.filter((h) => h.meta.from === agentFilter || h.meta.to === agentFilter)
      : data.handoffs;
  }, [data, agentFilter]);

  async function openDetail(file) {
    try {
      const h = await api.get(`/api/handoffs/${encodeURIComponent(file)}`);
      setSelected(h);
    } catch (e) {
      showToast(e.message, 'err');
    }
  }

  if (!project) return <EmptyState icon="🧠" title="先选择项目" desc="在左侧「打开项目…」选择要管理的本地项目目录。" />;
  if (!project.memoryInitialized) return <EmptyState icon="📄" title="尚未初始化 .memory/" desc="回到 Dashboard 初始化记忆后即可使用交接。" />;
  if (error) return <EmptyState icon="⚠️" title="读取失败" desc={error} />;
  if (!data) return <div className="page loading">加载中…</div>;

  return (
    <div className="page">
      <PageHead title="交接（Handoffs）"
        desc={`.memory/handoffs/ 下的记录，按时间倒序${agentFilter ? ` · 仅看与 ${agentFilter} 相关` : ''}`}
        actions={<button className="btn btn-primary" onClick={() => setShowNew(true)}>＋ 新建交接</button>} />

      {handoffs.length === 0 && (
        <div className="card subtle">
          {agentFilter ? `没有与 ${agentFilter} 相关的交接。` : '还没有交接记录。跨智能体换手时写一条，接手的 agent 会感谢你。'}
        </div>
      )}

      <div className="grid-3">
        {handoffs.map((h) => (
          <div key={h.file} className="card handoff-card clickable" onClick={() => openDetail(h.file)}>
            <div className="hc-title">{h.meta.summary || h.file}</div>
            <div className="hc-meta">
              <span className="chip">{h.meta.from || '?'}</span>
              <span className="arrow">→</span>
              <span className="chip">{h.meta.to || '?'}</span>
            </div>
            <div className="hc-date">{h.meta.date} {h.meta.time || ''}</div>
            <div className="hc-file" title={h.file}>{h.file}</div>
          </div>
        ))}
      </div>

      {selected && (
        <Drawer title={selected.meta.title || selected.file} sub={`${selected.meta.date || ''} · ${selected.meta.from || '?'} → ${selected.meta.to || '?'}`}
          onClose={() => setSelected(null)} width={620}>
          <Markdown text={selected.content} />
        </Drawer>
      )}

      {showNew && <HandoffForm onClose={() => setShowNew(false)}
        onDone={(file) => { setShowNew(false); bumpRefresh(); if (file) setTimeout(() => openDetail(file), 400); }} />}
    </div>
  );
}

function HandoffForm({ onClose, onDone }) {
  const { showToast, settings } = useApp();
  const agentsList = settings.defaultAgents?.length ? settings.defaultAgents : ['codex', 'dsh', 'zcode', 'grok'];
  const [form, setForm] = useState({
    summary: '',
    from: agentsList[0] || 'codex',
    to: agentsList[1] || 'dsh',
    done: '', todo: '', risks: '', next: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.summary.trim()) { showToast('摘要不能为空', 'err'); return; }
    const toList = (s) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    setBusy(true);
    try {
      const r = await api.post('/api/handoffs', {
        summary: form.summary, from: form.from, to: form.to,
        done: toList(form.done), todo: toList(form.todo), risks: toList(form.risks), next: toList(form.next),
      });
      showToast(`已生成 ${r.file}`);
      onDone(r.file.split('/').pop());
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="新建交接" onClose={onClose} wide>
      <p className="modal-hint">
        生成 <code>YYYY-MM-DD_HHMM_&lt;slug&gt;.md</code>（与 <code>amm handoff</code> 完全同一模板与命名）。
      </p>
      <Field label="一句话摘要" hint="必填">
        <input className="input" autoFocus value={form.summary} onChange={set('summary')} placeholder="例如：完成登录模块联调" />
      </Field>
      <div className="form-row">
        <Field label="from（交出方）"><AgentSelect value={form.from} onChange={set('from')} /></Field>
        <Field label="to（接收方）"><AgentSelect value={form.to} onChange={set('to')} /></Field>
      </div>
      <Field label="已完成" hint="每行一条，可留空">
        <textarea className="input" rows={3} value={form.done} onChange={set('done')} placeholder={'登录接口联调通过\n单测覆盖率 80%'} />
      </Field>
      <Field label="未完成" hint="每行一条">
        <textarea className="input" rows={2} value={form.todo} onChange={set('todo')} placeholder="补齐错误码映射" />
      </Field>
      <Field label="风险与注意" hint="每行一条">
        <textarea className="input" rows={2} value={form.risks} onChange={set('risks')} placeholder="mock 数据未清理" />
      </Field>
      <Field label="下一步" hint="每行一条">
        <textarea className="input" rows={2} value={form.next} onChange={set('next')} placeholder="提交并跑 CI" />
      </Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? '生成中…' : '生成交接文件'}</button>
      </div>
    </Modal>
  );
}
