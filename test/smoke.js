'use strict';

/**
 * 冒烟测试：在临时目录中完整走一遍 init / validate / status / handoff / sync / adapt，
 * 覆盖 README「验收标准」。运行：npm test
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AMM = path.join(ROOT, 'bin', 'amm');

let pass = 0;
let fail = 0;

function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  ok    ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${extra ? '\n        ' + String(extra).split('\n').join('\n        ') : ''}`);
  }
}

function amm(args, cwd) {
  const r = spawnSync(process.execPath, [AMM, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amm-smoke-'));
console.log(`临时目录：${tmp}\n`);

console.log('== 1. amm init ==');
let r = amm(['init'], tmp);
check('退出码 0', r.code === 0, r.out);
for (const f of ['decisions.md', 'gotchas.md', 'conventions.md', 'current-status.md', 'README.md']) {
  check(`存在 .memory/${f}`, fs.existsSync(path.join(tmp, '.memory', f)));
}
check('存在 .memory/handoffs/_template.md', fs.existsSync(path.join(tmp, '.memory', 'handoffs', '_template.md')));

console.log('\n== 2. amm validate（全新结构应成功）==');
r = amm(['validate'], tmp);
check('退出码 0', r.code === 0, r.out);
check('输出 OK 且无 ERROR', r.out.includes('[OK]') && !r.out.includes('[ERROR]'), r.out);

console.log('\n== 3. amm handoff ==');
r = amm(['handoff', '完成登录模块联调', '--from', 'codex', '--to', 'dsh'], tmp);
check('退出码 0', r.code === 0, r.out);
const handoffs = fs
  .readdirSync(path.join(tmp, '.memory', 'handoffs'))
  .filter((f) => f !== '_template.md');
check('生成 1 个交接文件', handoffs.length === 1, handoffs.join(','));
check(
  '文件名格式 YYYY-MM-DD_HHMM_<slug>.md',
  handoffs.every((f) => /^\d{4}-\d{2}-\d{2}_\d{4}_.+\.md$/.test(f)),
  handoffs.join(',')
);
const hText = fs.readFileSync(path.join(tmp, '.memory', 'handoffs', handoffs[0]), 'utf8');
check('内容含 from：codex / to：dsh', /from[：:]codex/.test(hText) && /to[：:]dsh/.test(hText));
check('内容含交接四节', ['已完成', '未完成', '风险与注意', '下一步'].every((s) => hText.includes(s)));

console.log('\n== 4. amm status ==');
r = amm(['status'], tmp);
check('退出码 0', r.code === 0, r.out);
check('输出包含最近交接文件名', r.out.includes(handoffs[0]), r.out);
check('输出包含 current-status 摘要', r.out.includes('current-status 摘要'), r.out);

console.log('\n== 5. amm init --force 幂等 ==');
r = amm(['init', '--force'], tmp);
check('退出码 0', r.code === 0, r.out);
check('已有内容被保留（不删条目）', fs.readFileSync(path.join(tmp, '.memory', 'current-status.md'), 'utf8').includes('初始化'));
r = amm(['validate'], tmp);
check('force 后 validate 仍为 0', r.code === 0, r.out);

console.log('\n== 6. validate 的 WARN / ERROR 行为 ==');
fs.appendFileSync(path.join(tmp, '.memory', 'decisions.md'), '\n### 这是一个格式不规范的条目\n- 详情：测试\n');
r = amm(['validate'], tmp);
check('不规范条目 → WARN，退出码仍 0', r.code === 0 && r.out.includes('[WARN]'), r.out);
fs.rmSync(path.join(tmp, '.memory', 'gotchas.md'));
r = amm(['validate'], tmp);
check('缺失必需文件 → 退出码 1', r.code === 1, r.out);

console.log('\n== 7. init --with-agents-md 幂等 ==');
const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'amm-agents-'));
amm(['init', '--with-agents-md'], tmp2);
const a1 = fs.readFileSync(path.join(tmp2, 'AGENTS.md'), 'utf8');
check('AGENTS.md 已写入记忆段落', a1.includes('amm:memory-section begin') && a1.includes('读写纪律'));
amm(['init', '--with-agents-md'], tmp2);
const a2 = fs.readFileSync(path.join(tmp2, 'AGENTS.md'), 'utf8');
check('重复执行不重复追加', (a2.match(/amm:memory-section begin/g) || []).length === 1);

console.log('\n== 8. amm sync ==');
const priv = path.join(tmp2, 'fake-codex-mem');
fs.mkdirSync(priv, { recursive: true });
fs.writeFileSync(path.join(priv, '2026-10-20.md'), '# 笔记\n\n- 最终决定使用 SQLite 作为本地缓存，避免引入服务端\n- 登录接口在并发下会报错，注意加锁\n');
r = amm(['sync', '--dir', priv], tmp2);
check('退出码 0', r.code === 0, r.out);
check('列出最近文件', r.out.includes('2026-10-20.md'), r.out);
check('给出 decisions.md 建议', r.out.includes('→ decisions.md'), r.out);
check('给出 gotchas.md 建议', r.out.includes('→ gotchas.md'), r.out);
r = amm(['sync', '--dir', path.join(tmp2, 'not-exist')], tmp2);
check('目录不存在时正常退出', r.code === 0 && r.out.includes('未找到'), r.out);

console.log('\n== 9. amm adapt ==');
r = amm(['adapt', '--agent', 'codex', '--dry-run'], tmp2);
check('codex --dry-run 不写入', r.code === 0 && !fs.existsSync(path.join(tmp2, '.agents')), r.out);
r = amm(['adapt', '--agent', 'codex'], tmp2);
check('退出码 0', r.code === 0, r.out);
check(
  '技能已装到 .agents/skills/shared-memory/SKILL.md',
  fs.existsSync(path.join(tmp2, '.agents', 'skills', 'shared-memory', 'SKILL.md'))
);
r = amm(['adapt', '--agent', 'codex'], tmp2);
check('重复 adapt 幂等（AGENTS.md 不重复）', r.code === 0);
r = amm(['adapt', '--agent', 'zcode,grok'], tmp2);
check('打印型智能体输出指引', r.code === 0 && r.out.includes('ZCode') && r.out.includes('Grok'), r.out);
r = amm(['adapt', '--agent', 'nope'], tmp2);
check('未知智能体 → 退出码 1', r.code === 1, r.out);

console.log('\n== 10. 帮助与版本 ==');
r = amm(['--help'], tmp2);
check('--help 输出命令表', r.code === 0 && r.out.includes('amm init') && r.out.includes('One memory'), r.out);
r = amm(['handoff', '--help'], tmp2);
check('命令级 --help', r.code === 0 && r.out.includes('--from'), r.out);
r = amm(['--version'], tmp2);
check('--version', r.code === 0 && /^\d+\.\d+\.\d+/.test(r.out.trim()), r.out);

fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(tmp2, { recursive: true, force: true });

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
