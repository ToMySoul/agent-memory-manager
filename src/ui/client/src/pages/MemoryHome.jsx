import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App.jsx';
import { MemoryCard, EmptyState, PageHead } from '../components/ui.jsx';

const TYPES = [
  { type: 'decisions', icon: '🧭', title: '决策记录', desc: '技术选型、架构取舍、方向变更' },
  { type: 'gotchas', icon: '⚠️', title: '踩坑记录', desc: '踩过的坑与解法，避免重复踩' },
  { type: 'conventions', icon: '📜', title: '项目约定', desc: '命名、目录、流程等团队约定' },
  { type: 'status', icon: '📍', title: '当前状态', desc: '进度与阻塞，每次任务后更新' },
];

export default function MemoryHome() {
  const { project, overview } = useApp();
  const navigate = useNavigate();

  if (!project) {
    return <EmptyState icon="🧠" title="先选择项目" desc="在左侧「打开项目…」选择要管理的本地项目目录。" />;
  }
  if (!project.memoryInitialized) {
    return <EmptyState icon="📄" title="尚未初始化 .memory/" desc="回到 Dashboard 点击「初始化记忆」，或使用 amm init。" />;
  }

  return (
    <div className="page">
      <PageHead title="记忆库" desc={`${project.path}${overview ? '' : ''} · 数据真相是项目内 .memory/ 目录，可被 Git 追踪`} />
      <div className="grid-4">
        {TYPES.map((t) => (
          <MemoryCard key={t.type} icon={t.icon} title={t.title} desc={t.desc}
            count={t.type === 'status' ? (overview?.statusSummary?.updates?.length ?? '—') : (overview?.counts?.[t.type] ?? '—')}
            onClick={() => navigate(`/memory/${t.type}`)} />
        ))}
      </div>
      <div className="card subtle slim">
        条目格式与 CLI 一致：<code>### YYYY-MM-DD | agent:&lt;name&gt; | 一句话摘要</code>，新条目追加在文件末尾。
      </div>
    </div>
  );
}
