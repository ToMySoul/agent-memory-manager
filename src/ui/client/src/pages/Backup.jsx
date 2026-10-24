import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { EmptyState, PageHead, Field } from '../components/ui.jsx';

export default function Backup() {
  const { project, showToast } = useApp();
  const [validate, setValidate] = useState(null);
  const [busy, setBusy] = useState('');
  const [repoStatus, setRepoStatus] = useState(null);
  const [remote, setRemote] = useState('');
  const [branch, setBranch] = useState('');
  const [message, setMessage] = useState('');
  const [log, setLog] = useState(null);

  async function refreshRepoStatus() {
    if (!project?.memoryInitialized) return;
    try {
      const st = await api.get('/api/backup/status');
      setRepoStatus(st);
      if (st.remote) setRemote(st.remote);
    } catch (e) {
      showToast(e.message, 'err');
    }
  }

  useEffect(() => { refreshRepoStatus(); }, [project?.path, project?.memoryInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runValidate() {
    setBusy('validate');
    try {
      setValidate(await api.get('/api/memory/validate'));
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setBusy('');
    }
  }

  async function initRepo() {
    setBusy('init');
    setLog(null);
    try {
      const r = await api.post('/api/backup/repo/init', { remote: remote.trim(), branch: branch.trim() });
      setRepoStatus(r.status);
      setLog(r.log.join('\n'));
      showToast('备份仓库已就绪');
    } catch (e) {
      showToast(e.message, 'err');
      setLog([String(e.message)]);
    } finally {
      setBusy('');
    }
  }

  async function push() {
    setBusy('push');
    setLog(null);
    try {
      const r = await api.post('/api/backup/push', { message: message.trim() || undefined });
      setRepoStatus(r.status);
      setLog(r.log.join('\n'));
      showToast(r.committed ? '已提交并推送' : '没有新改动，已同步远端');
    } catch (e) {
      showToast(e.message, 'err');
      setLog([String(e.message)]);
    } finally {
      setBusy('');
    }
  }

  if (!project) return <EmptyState icon="🧠" title="先选择项目" desc="备份针对项目的 .memory/ 目录。" />;

  const st = repoStatus;

  return (
    <div className="page">
      <PageHead title="备份" desc="记忆是资产：推送到你的私有 Git 仓库（推荐），或导出 zip 归档。" />

      <div className="card">
        <div className="card-title">
          Git 备份仓库
          <span className="muted" style={{ fontWeight: 400 }}>（借鉴 Skills Manager「一份原件 + 同步」：.memory 自成私有仓库，不碰开源代码）</span>
        </div>

        {!st ? (
          <div className="card-text">读取状态中…</div>
        ) : (
          <>
            <div className="detect-list">
              <div className="detect-row"><span>git 环境</span>
                <span className={`badge ${st.gitAvailable ? 'ok' : 'err'}`}>{st.gitAvailable ? '可用' : '未安装'}</span></div>
              <div className="detect-row"><span>.memory 是否已是仓库</span>
                <span className={`badge ${st.isRepo ? 'ok' : ''}`}>{st.isRepo ? `是（分支 ${st.branch}）` : '否'}</span></div>
              <div className="detect-row"><span>备份远程 origin</span>
                <span className={`badge ${st.remote ? 'ok' : ''}`}>{st.remote ? '已配置' : '未配置'}</span></div>
              <div className="detect-row"><span>未提交改动</span>
                <span className={`badge ${st.dirty ? 'warn' : 'ok'}`}>{st.dirty ? `${st.dirtyCount} 个文件待备份` : '无（已全部提交）'}</span></div>
              {st.lastCommit && (
                <div className="detect-row"><span>最近提交</span>
                  <span className="muted mono-sm">{st.lastCommit.hash} · {st.lastCommit.date} · {st.lastCommit.subject?.slice(0, 40)}</span></div>
              )}
            </div>

            <Field label="备份仓库地址" hint="私有仓库；支持 https:// 、git@ 、ssh:// 或本地裸仓库路径">
              <div className="form-row">
                <input className="input" placeholder="例如 git@github.com:yourname/all-memory.git（建议 Private）"
                  value={remote} onChange={(e) => setRemote(e.target.value)} />
                <button className="btn" style={{ flex: 'none' }} disabled={!st.gitAvailable || busy === 'init'} onClick={initRepo}>
                  {busy === 'init' ? '初始化中…' : st.isRepo ? '更新远程地址' : '初始化仓库'}
                </button>
              </div>
            </Field>

            <Field label="分支名" hint="可选；多项目共用同一个备份仓库时填项目名（如 yudao），各项目推到各自分支">
              <input className="input narrow" placeholder={`默认：${st.branch || 'master'}`}
                value={branch} onChange={(e) => setBranch(e.target.value)} />
            </Field>

            <Field label="提交说明" hint="留空自动生成「AMM 备份 日期 时间」">
              <div className="form-row">
                <input className="input" placeholder="例如：考勤模块联调完成，同步记忆" value={message} onChange={(e) => setMessage(e.target.value)} />
                <button className="btn btn-primary" style={{ flex: 'none' }}
                  disabled={!st.gitAvailable || !st.isRepo || !st.remote || busy === 'push'} onClick={push}>
                  {busy === 'push' ? '推送中…' : '⬆ 提交并推送'}
                </button>
              </div>
            </Field>

            {st.notInitialized && <div className="card-text">当前项目尚未初始化 .memory/，先去 Dashboard 初始化记忆。</div>}

            {log && <pre className="backup-log">{log}</pre>}

            <div className="card-text muted">
              开源项目工作区适用：.memory 在工作区根部独立成库，推送到你的私有仓库，
              与 yudao-cloud / vben 等开源仓库互不影响；换电脑时 clone 该仓库到 .memory 即可恢复。
            </div>
          </>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">导出 zip（离线归档）</div>
          <p className="card-text">
            把 <code>{project.path}\.memory\</code> 打包下载（不含 .git）。适合归档 / 迁移，日常备份建议用上面的 Git 推送。
          </p>
          <a className={`btn btn-primary${project.memoryInitialized ? '' : ' disabled'}`}
            href={project.memoryInitialized ? '/api/backup.zip' : undefined}
            onClick={(e) => !project.memoryInitialized && e.preventDefault()}>
            ⬇ 下载 .memory 备份（zip）
          </a>
        </div>

        <div className="card">
          <div className="card-title">结构校验</div>
          <p className="card-text">等同 <code>amm validate</code>：必需文件、条目格式、交接规范。</p>
          <button className="btn" disabled={!project.memoryInitialized || busy === 'validate'} onClick={runValidate}>
            {busy === 'validate' ? '校验中…' : '运行校验'}
          </button>
          {validate && (
            <div style={{ marginTop: 10 }}>
              <div className="validate-summary">
                <span className="badge ok">{validate.counts.ok} OK</span>
                <span className={`badge${validate.counts.warn ? ' warn' : ''}`}>{validate.counts.warn} WARN</span>
                <span className={`badge${validate.counts.error ? ' err' : ''}`}>{validate.counts.error} ERROR</span>
              </div>
              <div className="validate-lines">
                {validate.lines.map((l, i) => (
                  <div key={i} className={`validate-line lv-${l.level.toLowerCase()}`}>
                    <span className="lv-tag">[{l.level}]</span> {l.msg}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
