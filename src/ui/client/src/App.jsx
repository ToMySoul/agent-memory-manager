import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MemoryHome from './pages/MemoryHome.jsx';
import MemoryType from './pages/MemoryType.jsx';
import Handoffs from './pages/Handoffs.jsx';
import Sync from './pages/Sync.jsx';
import Backup from './pages/Backup.jsx';
import Settings from './pages/Settings.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function App() {
  const [project, setProject] = useState(null);
  const [recent, setRecent] = useState([]);
  const [settings, setSettings] = useState({ theme: 'dark', defaultAgents: [], recentLimit: 8, language: 'zh-CN' });
  const [overview, setOverview] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [agentFilter, setAgentFilter] = useState(null); // 'codex' | 'dsh' | ... | null=全部
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const p = await api.get('/api/project');
      setProject(p.project);
      setRecent(p.recent || []);
      if (p.project?.memoryInitialized) {
        const o = await api.get('/api/memory/overview');
        setOverview(o.overview);
      } else {
        setOverview(null);
      }
    } catch (e) {
      showToast(e.message, 'err');
    }
  }, [showToast]);

  useEffect(() => {
    refresh();
    api.get('/api/settings').then(setSettings).catch(() => {});
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : settings.theme;
  }, [settings.theme]);

  const openProject = useCallback(async (path) => {
    const r = await api.post('/api/project/open', { path });
    setProject(r.project);
    setRecent(r.recent || []);
    setRefreshKey((k) => k + 1);
    return r.project;
  }, []);

  const value = {
    project, recent, settings, setSettings, overview,
    refresh, refreshKey, bumpRefresh: () => setRefreshKey((k) => k + 1),
    openProject, agentFilter, setAgentFilter, showToast,
  };

  return (
    <Ctx.Provider value={value}>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <div className="main">
            <Topbar />
            <div className="content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/memory" element={<MemoryHome />} />
                <Route path="/memory/:type" element={<MemoryType />} />
                <Route path="/handoffs" element={<Handoffs />} />
                <Route path="/sync" element={<Sync />} />
                <Route path="/backup" element={<Backup />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
          {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
        </div>
      </BrowserRouter>
    </Ctx.Provider>
  );
}
