import React from 'react';

/** 从条目正文提取「影响范围」等字段 */
export function bodyField(body, name) {
  const m = new RegExp(`^-[\\s]*${name}[：:]\\s*(.+)$`, 'm').exec(body || '');
  return m ? m[1].trim() : '';
}

export default function EntryList({ entries, onSelect, emptyText }) {
  if (!entries || entries.length === 0) {
    return <div className="card subtle">{emptyText || '还没有条目，点右上角「＋ 新建」写下第一条。'}</div>;
  }
  return (
    <div className="entry-list">
      <div className="entry-row head">
        <span>日期</span><span>Agent</span><span className="grow">摘要</span><span>影响范围</span><span />
      </div>
      {entries.map((e, i) => (
        <div key={`${e.line}-${i}`} className={`entry-row${e.ok ? '' : ' bad'}`} onClick={() => onSelect(e)}>
          <span className="e-date">{e.date || '—'}</span>
          <span className="e-agent">{e.agent ? <span className="chip">{e.agent}</span> : '—'}</span>
          <span className="grow e-summary" title={e.summary || e.heading}>{e.summary || e.heading}</span>
          <span className="e-scope">{bodyField(e.body, '影响范围') || '—'}</span>
          <span className="e-go">›</span>
        </div>
      ))}
    </div>
  );
}
