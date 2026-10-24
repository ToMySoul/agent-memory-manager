/**
 * 极简 Markdown → HTML 渲染（覆盖 .memory 与 adapters 文档用到的语法：
 * 标题 / 段落 / 列表 / 代码块 / 引用 / 表格 / 分割线 / 行内代码、加粗、链接）。
 * 先整体转义 HTML，杜绝注入。
 */

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function renderMarkdown(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  let i = 0;

  const flushList = (ordered, items) => {
    const tag = ordered ? 'ol' : 'ul';
    out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${tag}>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (/^\s*```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++; // 跳过结束围栏
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // 标题
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level + 1}>${inline(esc(h[2]))}</h${level + 1}>`); // 整体降一级，配合页面样式
      i++;
      continue;
    }

    // 分割线
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push('<hr/>');
      i++;
      continue;
    }

    // 引用块
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${inline(esc(buf.join(' ')))}</blockquote>`);
      continue;
    }

    // 表格（| a | b |）
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const head = line.split('|').slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i++].split('|').slice(1, -1).map((c) => c.trim()));
      }
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(esc(c))}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      );
      continue;
    }

    // 无序列表
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''));
      flushList(false, items);
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      flushList(true, items);
      continue;
    }

    // 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 段落
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```|#{1,4}\s|>|[-*]\s|\d+\.\s|\|)/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    out.push(`<p>${inline(esc(buf.join(' ')))}</p>`);
  }

  return out.join('\n');
}
