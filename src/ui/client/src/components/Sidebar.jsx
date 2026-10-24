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
  const [picking, setPicking] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    function onOpen() { setOpenModal(true); }
    window.addEventListener('amm:open-project', onOpen);
    return () => window.removeEventListener('amm:open-project', onOpen);
  }, []);

  async function doPickFolder() {
    setPicking('folder');
    try {
      const r = await api.post('/api/system/pick-folder', {});
      if (r.error) showToast(r.error, 'err');
      else if (r.canceled) showToast('已取消选择');
      else if (r.path) setPath(r.path);
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setPicking('');
    }
  }

  async function doPickFiles() {
    setPicking('file');
    try {
      const r = await api.post('/api/system/pick-file', {});
      if (r.error) { showToast(r.error, 'err'); return; }
      if (r.canceled) { showToast('已取消选择'); return; }
      // 取每个文件所在目录（去重）作为项目；多个 = 批量添加
      const dirs = [...new Set((r.paths || []).map((p) => p.replace(/[\\/][^\\/]+$/, '')))];
      if (dirs.length === 1) {
        setPath(dirs[0]);
        showToast('已定位目录，点「打开」确认');
      } else if (dirs.length > 1) {
        let ok = 0;
        for (const d of dirs) {
          try { await openProject(d); ok++; } catch { /* 单个失败不中断 */ }
        }
        setOpenModal(false);
        showToast(`已批量打开 ${ok} 个项目`);
        navigate('/');
      }
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setPicking('');
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
            <p className="modal-hint">
              「浏览文件夹…」选目录；「浏览文件…」选项目里的任意文件（自动取所在目录，<b>可多选批量添加</b>）；也可以直接粘贴路径。
            </p>
            <div className="form-row">
              <input autoFocus className="input" placeholder="例如 D:\workspace\my-project"
                value={path} onChange={(e) => setPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doOpen()} />
              <button className="btn" style={{ flex: 'none' }} disabled={!!picking} onClick={doPickFolder}
                title="打开系统文件夹选择弹窗">
                {picking === 'folder' ? '选择中…' : '浏览文件夹…'}
              </button>
              <button className="btn" style={{ flex: 'none' }} disabled={!!picking} onClick={doPickFiles}
                title="选择项目内任意文件，取其所在目录；多选 = 批量添加">
                {picking === 'file' ? '选择中…' : '浏览文件…'}
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
