import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../App.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', exact: true },
  { to: '/memory', label: '记忆库', icon: '🧠' },
  { to: '/handoffs', label: '交接', icon: '🤝' },
  { to: '/sync', label: '同步 / 挂载', icon: '🔌' },
  { to: '/backup', label: '备份', icon: '💾' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];

const AGENT_ITEMS = [
  { id: null, label: '全部 Agents', icon: '👥' },
  { id: 'codex', label: 'Codex', icon: '🟢' },
  { id: 'zcode', label: 'ZCode', icon: '🔵' },
  { id: 'dsh', label: 'DeepSeek Harness', icon: '🐋' },
  { id: 'grok', label: 'Grok', icon: '✖' },
];

export default function Sidebar() {
  const { project, recent, openProject, agentFilter, setAgentFilter, showToast } = useApp();
  const [openModal, setOpenModal] = useState(false);
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onOpen() { setOpenModal(true); }
    window.addEventListener('amm:open-project', onOpen);
    return () => window.removeEventListener('amm:open-project', onOpen);
  }, []);

  async function doPick() {
    setPicking(true);
    try {
      const r = await api.post('/api/system/pick-folder', {});
      if (r.error) showToast(r.error, 'err');
      else if (r.canceled) showToast('已取消选择');
      else if (r.path) setPath(r.path);
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setPicking(false);
    }
  }

  async function doOpen() {
    const p = path.trim().replace(/^"|"$/g, '');
    if (!p) return;
    setBusy(true);
    try {
      const proj = await openProject(p);
      setOpenModal(false);
      setPath('');
      showToast(`已打开项目：${proj.name}`);
      navigate('/');
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => navigate('/')}>
        <span className="brand-icon">🧠</span>
        <div>
          <div className="brand-name">Agent Memory Manager</div>
          <div className="brand-slogan">One memory. Every agent.</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </NavLink>
        ))}
      </nav>

      <div className="side-section">
        <div className="side-title">Agents</div>
        {AGENT_ITEMS.map((a) => (
          <button key={String(a.id)} className={`side-agent${agentFilter === a.id ? ' active' : ''}`}
            onClick={() => setAgentFilter(a.id)}
            title={a.id ? `只看 ${a.label} 的记录` : '查看全部智能体的记录'}>
            <span className="nav-icon">{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      <div className="side-section grow">
        <div className="side-title">项目工作区</div>
        {project && (
          <div className={`side-project current`} title={project.path}
            onClick={() => navigate('/')}>
            <span className="dot ok" />{project.name}
          </div>
        )}
        {recent.filter((r) => r.path !== project?.path).map((r) => (
          <div key={r.path} className="side-project" title={r.path}
            onClick={() => openProject(r.path).catch((e) => showToast(e.message, 'err'))}>
            <span className="dot" />{r.name}
          </div>
        ))}
        <button className="btn btn-ghost side-open" onClick={() => setOpenModal(true)}>＋ 打开项目…</button>
      </div>

      {openModal && (
        <div className="modal-mask" onClick={(e) => e.target === e.currentTarget && setOpenModal(false)}>
          <div className="modal">
            <div className="modal-title">打开本地项目</div>
            <p className="modal-hint">点击「浏览…」从系统弹窗选择目录（可反复选择多个，选过的会留在左侧「最近项目」）；也可以直接粘贴路径（目录内可已有 <code>.memory/</code>，或稍后初始化）。</p>
            <div className="form-row">
              <input autoFocus className="input" placeholder="例如 D:\workspace\my-project"
                value={path} onChange={(e) => setPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doOpen()} />
              <button className="btn" style={{ flex: 'none' }} disabled={picking} onClick={doPick}>
                {picking ? '选择中…' : '浏览…'}
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpenModal(false)}>取消</button>
              <button className="btn btn-primary" disabled={busy || !path.trim()} onClick={doOpen}>
                {busy ? '打开中…' : '打开'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
