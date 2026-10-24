import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Markdown, EmptyState, PageHead } from '../components/ui.jsx';

const AGENT_LABEL = { codex: 'Codex', zcode: 'ZCode', dsh: 'DeepSeek Harness', grok: 'Grok / 其他' };

export default function Sync() {
  const { project, refreshKey, bumpRefresh, showToast, agentFilter } = useApp();
  const [data, setData] = useState(null);
  const [doc, setDoc] = useState(null); // { id, content }
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api.get('/api/adapters').then(setData).catch((e) => showToast(e.message, 'err'));
  }, [refreshKey, project?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="page loading">检测中…</div>;

  async function applyAgentsMd() {
    setBusy('agents-md');
    try {
      const r = await api.post('/api/adapters/agents-md', {});
      showToast(r.message);
      bumpRefresh();
    } catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  }

  async function installSkill(id) {
    if (!window.confirm(`将把技能 shared-memory 复制到项目内约定目录（不会写你的用户主目录）。继续？`)) return;
    setBusy(id);
    try {
      const r = await api.post('/api/adapters/install-skill', { agent: id });
      showToast(r.message);
      bumpRefresh();
    } catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  }

  function copyInstructions(a) {
    const text = [
      `== ${a.name} 挂载说明 ==`,
      ...a.instructions,
      a.doc ? `详细说明：${a.doc}（AMM 仓库内）` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(
      () => showToast('挂载说明已复制到剪贴板'),
      () => showToast('复制失败，请手动选择文本复制', 'err')
    );
  }

  async function toggleDoc(id) {
    if (doc?.id === id) { setDoc(null); return; }
    try {
      const d = await api.get(`/api/adapters/doc?id=${id}`);
      setDoc(d);
    } catch (e) {
      showToast(e.message, 'err');
    }
  }

  return (
    <div className="page">
      <PageHead title="同步 / 挂载"
        desc="检测各智能体在本项目与机器上的挂载状态。检测是只读的；写入操作只针对当前项目目录。" />

      {!project && <EmptyState icon="🧠" title="未选择项目" desc="挂载检测针对具体项目，请先在左侧打开项目。" />}

      <div className="card subtle slim">
        <b>AGENTS.md 记忆纪律段落</b>（所有支持 AGENTS.md 的智能体通用，推荐先写入）：
        <span className={`badge ${data.agents.some((a) => a.detection.agentsMd.hasSection) ? 'ok' : ''} inline-badge`}>
          {data.agents.some((a) => a.detection.agentsMd.hasSection) ? '已写入' : '未写入'}
        </span>
        <button className="btn inline-btn" disabled={!project || busy === 'agents-md'} onClick={applyAgentsMd}>
          {busy === 'agents-md' ? '写入中…' : '写入 / 合并到项目 AGENTS.md'}
        </button>
      </div>

      <div className="grid-2">
        {data.agents.map((a) => {
          const d = a.detection;
          const highlight = agentFilter === a.id;
          return (
            <div key={a.id} className={`card agent-card${highlight ? ' highlight' : ''}`}>
              <div className="agent-head">
                <div className="agent-name">{a.name}</div>
                <span className="badge">{a.adaptAction === 'write' ? 'adapt 可直接写入' : 'adapt 打印指引'}</span>
              </div>

              <div className="detect-list">
                <div className="detect-row">
                  <span>AGENTS.md 记忆段落</span>
                  <span className={`badge ${d.agentsMd.hasSection ? 'ok' : d.agentsMd.exists ? 'warn' : ''}`}>
                    {d.agentsMd.hasSection ? '已写入' : d.agentsMd.exists ? '有 AGENTS.md 但无段落' : '未创建'}
                  </span>
                </div>
                {d.skills.map((s) => (
                  <div className="detect-row" key={s.target}>
                    <span>技能 <code>{s.target}</code></span>
                    <span className={`badge ${s.installed ? 'ok' : ''}`}>{s.installed ? '已安装' : '未安装'}</span>
                  </div>
                ))}
                {d.privateMemoryDir && (
                  <div className="detect-row">
                    <span title={d.privateMemoryDir.path}>私有记忆目录（仅缓存）</span>
                    <span className={`badge ${d.privateMemoryDir.exists ? 'ok' : ''}`}>
                      {d.privateMemoryDir.exists ? '存在' : '不存在'}
                    </span>
                  </div>
                )}
              </div>

              <div className="agent-actions">
                <button className="btn" onClick={() => copyInstructions(a)}>复制挂载说明</button>
                {a.doc && <button className="btn btn-ghost" onClick={() => toggleDoc(a.id)}>{doc?.id === a.id ? '收起说明文档' : '查看说明文档'}</button>}
                {a.adaptAction === 'write' && (
                  <button className="btn" disabled={!project || busy === a.id} onClick={() => installSkill(a.id)}>
                    {busy === a.id ? '复制中…' : '安装技能到项目'}
                  </button>
                )}
              </div>

              <details className="agent-instructions">
                <summary>挂载步骤</summary>
                <pre>{a.instructions.join('\n')}</pre>
              </details>

              {doc?.id === a.id && (
                <div className="agent-doc">
                  <div className="card-title small">{doc.title} · {doc.path}</div>
                  <Markdown text={doc.content} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
