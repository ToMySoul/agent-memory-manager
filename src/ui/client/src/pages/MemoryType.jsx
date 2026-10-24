import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import EntryList from '../components/EntryList.jsx';
import { Drawer, Modal, Field, AgentSelect, Markdown, EmptyState, PageHead } from '../components/ui.jsx';

const TYPE_META = {
  decisions: { title: '决策记录', file: 'decisions.md', entryStyle: true },
  gotchas: { title: '踩坑记录', file: 'gotchas.md', entryStyle: true },
  conventions: { title: '项目约定', file: 'conventions.md', entryStyle: true },
  status: { title: '当前状态', file: 'current-status.md', entryStyle: false },
};

export default function MemoryType() {
  const { type } = useParams();
  const meta = TYPE_META[type];
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const { project, refreshKey, bumpRefresh, agentFilter, showToast } = useApp();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const isNew = sp.get('new') === '1';
  const focusLine = Number(sp.get('line')) || null;

  useEffect(() => {
    if (isNew) { setShowNew(true); setSp({}, { replace: true }); }
  }, [isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showNew) return;
    if (!project?.memoryInitialized || !meta) return;
    setData(null);
    setError(null);
    api.get(`/api/memory/${type}`)
      .then((d) => {
        setData(d);
        if (focusLine && d.entries) {
          // 找到覆盖该行的条目并打开详情
          const sorted = [...d.entries].sort((a, b) => a.line - b.line);
          const hit = sorted.filter((e) => e.line <= focusLine).pop();
          if (hit) setSelected(hit);
        }
      })
      .catch((e) => setError(e.message));
  }, [type, project?.memoryInitialized, refreshKey, focusLine, showNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const entries = useMemo(() => {
    if (!data?.entries) return [];
    return agentFilter ? data.entries.filter((e) => e.agent === agentFilter) : data.entries;
  }, [data, agentFilter]);

  if (!meta) return <EmptyState icon="❓" title="未知记忆类型" desc={`没有 ${type} 这种记忆类型。`} />;
  if (!project) return <EmptyState icon="🧠" title="先选择项目" desc="在左侧「打开项目…」选择要管理的本地项目目录。" />;
  if (!project.memoryInitialized) return <EmptyState icon="📄" title="尚未初始化 .memory/" desc="回到 Dashboard 初始化记忆后即可查看。" />;
  if (error) return <EmptyState icon="⚠️" title="读取失败" desc={error} />;
  if (!data) return <div className="page loading">加载中…</div>;

  return (
    <div className="page">
      <PageHead
        title={meta.title}
        desc={`.memory/${data.file || meta.file}${agentFilter ? ` · 仅看 ${agentFilter}` : ''}`}
        actions={(
          <>
            {meta.entryStyle ? (
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>＋ 新建条目</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>＋ 记录状态更新</button>
            )}
          </>
        )}
      />

      {meta.entryStyle ? (
        <>
          <EntryList entries={entries} onSelect={setSelected}
            emptyText={agentFilter ? `没有 ${agentFilter} 写入的条目。` : '还没有条目，点右上角「＋ 新建条目」写下第一条。'} />
          <details className="card subtle raw">
            <summary>查看原始 Markdown（{meta.file}）</summary>
            <Markdown text={data.content} />
          </details>
        </>
      ) : (
        <StatusView data={data} />
      )}

      {selected && (
        <Drawer title={selected.summary || selected.heading}
          sub={`${selected.date || '—'} · ${selected.agent || '未知 agent'} · 第 ${selected.line} 行`}
          onClose={() => setSelected(null)}>
          <Markdown text={`### ${selected.heading}\n${selected.body}`} />
        </Drawer>
      )}

      {showNew && (meta.entryStyle
        ? <NewEntryModal type={type} title={meta.title} onClose={() => setShowNew(false)}
            onDone={() => { setShowNew(false); bumpRefresh(); }} />
        : <NewStatusModal onClose={() => setShowNew(false)}
            onDone={() => { setShowNew(false); bumpRefresh(); }} />)}
    </div>
  );
}

function NewEntryModal({ type, title, onClose, onDone }) {
  const { showToast, settings } = useApp();
  const [form, setForm] = useState({
    agent: settings.defaultAgents?.[0] || 'amm', summary: '', details: '', scope: '', paths: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.summary.trim()) { showToast('摘要不能为空', 'err'); return; }
    setBusy(true);
    try {
      const r = await api.post(`/api/memory/${type}`, form);
      showToast(`已写入 ${r.file}`);
      onDone();
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`新建${title}条目`} onClose={onClose}>
      <Field label="作者 Agent"><AgentSelect value={form.agent} onChange={set('agent')} /></Field>
      <Field label="一句话摘要" hint="必填">
        <input className="input" autoFocus value={form.summary} onChange={set('summary')}
          placeholder="例如：本地缓存选型 SQLite 而非 LevelDB" />
      </Field>
      <Field label="详情"><textarea className="input" rows={3} value={form.details} onChange={set('details')} placeholder="为什么这样决定" /></Field>
      <Field label="影响范围"><input className="input" value={form.scope} onChange={set('scope')} placeholder="例如：数据层 / 全局" /></Field>
      <Field label="相关路径"><input className="input" value={form.paths} onChange={set('paths')} placeholder="例如：src/db/*" /></Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? '写入中…' : '追加到文件末尾'}</button>
      </div>
    </Modal>
  );
}

function NewStatusModal({ onClose, onDone }) {
  const { showToast, settings } = useApp();
  const [form, setForm] = useState({ agent: settings.defaultAgents?.[0] || 'amm', summary: '' });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.summary.trim()) { showToast('摘要不能为空', 'err'); return; }
    setBusy(true);
    try {
      const r = await api.post('/api/memory/status', form);
      showToast(`已更新 ${r.file}`);
      onDone();
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="记录状态更新" onClose={onClose}>
      <p className="modal-hint">将写入 current-status.md 的「最近更新」列表顶部（最新在最上）。</p>
      <Field label="作者 Agent"><AgentSelect value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })} /></Field>
      <Field label="本次做了什么 / 当前进度" hint="必填">
        <input className="input" autoFocus value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="例如：完成设置页与搜索联调" />
      </Field>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? '写入中…' : '写入'}</button>
      </div>
    </Modal>
  );
}

function StatusView({ data }) {
  const groups = [
    { name: '最近更新', items: data.sections?.['最近更新'] || [] },
    { name: '进行中', items: data.sections?.['进行中'] || [] },
    { name: '阻塞 / 待决', items: data.sections?.['阻塞 / 待决'] || [], warn: true },
    { name: '下一步', items: data.sections?.['下一步'] || [] },
  ];
  return (
    <>
      <div className="grid-4">
        {groups.map((g) => (
          <div key={g.name} className={`card stat${g.warn && g.items.length ? ' tone-warn' : ''}`}>
            <div className="stat-label">{g.name}</div>
            <div className="stat-value">{g.items.length}</div>
            <div className="stat-list">
              {g.items.slice(0, 6).map((x, i) => <div key={i} className="status-item">• {x}</div>)}
              {g.items.length > 6 && <div className="muted">… 共 {g.items.length} 条</div>}
            </div>
          </div>
        ))}
      </div>
      <details className="card subtle raw" open>
        <summary>查看 / 复制原始 Markdown（current-status.md）</summary>
        <Markdown text={data.content} />
      </details>
    </>
  );
}
