import React, { useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Field, PageHead } from '../components/ui.jsx';

export default function Settings() {
  const { settings, setSettings, showToast, refresh, bumpRefresh } = useApp();
  const [draft, setDraft] = useState(settings);
  const [newAgent, setNewAgent] = useState('');
  const [busy, setBusy] = useState(false);

  // settings 异步加载完成后同步一次草稿
  React.useEffect(() => { setDraft(settings); }, [settings]);

  async function save() {
    setBusy(true);
    try {
      const s = await api.post('/api/settings', draft);
      setSettings(s);
      setDraft(s);
      bumpRefresh();
      showToast('设置已保存');
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  function addAgent() {
    const a = newAgent.trim();
    if (!a) return;
    if (!draft.defaultAgents.includes(a)) setDraft({ ...draft, defaultAgents: [...draft.defaultAgents, a] });
    setNewAgent('');
  }

  return (
    <div className="page">
      <PageHead title="设置"
        actions={<button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? '保存中…' : '保存设置'}</button>} />

      <div className="card">
        <Field label="主题">
          <div className="seg">
            <button className={`seg-item${draft.theme === 'dark' ? ' on' : ''}`}
              onClick={() => setDraft({ ...draft, theme: 'dark' })}>深色（固定）</button>
            <button className={`seg-item${draft.theme === 'system' ? ' on' : ''}`}
              onClick={() => setDraft({ ...draft, theme: 'system' })}>跟随系统</button>
          </div>
        </Field>

        <Field label="默认 Agent 列表" hint="用于新建条目 / 交接时的候选">
          <div className="chip-row">
            {draft.defaultAgents.map((a) => (
              <span key={a} className="chip removable" title="点击移除"
                onClick={() => setDraft({ ...draft, defaultAgents: draft.defaultAgents.filter((x) => x !== a) })}>
                {a} ✕
              </span>
            ))}
          </div>
          <div className="form-row">
            <input className="input" placeholder="新增 agent 名称，如 trae" value={newAgent}
              onChange={(e) => setNewAgent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAgent())} />
            <button className="btn" onClick={addAgent}>添加</button>
          </div>
        </Field>

        <Field label="最近项目数量" hint={`1 – 50，当前保留 ${draft.recentLimit} 个`}>
          <input className="input narrow" type="number" min={1} max={50} value={draft.recentLimit}
            onChange={(e) => setDraft({ ...draft, recentLimit: Number(e.target.value) || 8 })} />
        </Field>

        <Field label="语言">
          <input className="input narrow" value="简体中文" disabled />
        </Field>
      </div>

      <div className="card subtle slim">
        界面偏好保存在本机 <code>~/.amm/ui-state.json</code>；记忆数据本身永远只存在项目的 <code>.memory/</code> 里。
      </div>
    </div>
  );
}
