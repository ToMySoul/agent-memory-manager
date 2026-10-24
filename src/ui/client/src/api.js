async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* 空响应体 */
  }
  if (!res.ok) throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  return data;
}

export const api = {
  get: (url) => req('GET', url),
  post: (url, body) => req('POST', url, body),
};

export function qs(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') s.set(k, v);
  }
  const str = s.toString();
  return str ? `?${str}` : '';
}
