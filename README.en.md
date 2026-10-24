# Agent Memory Manager (AMM)

> **One memory. Every agent.**

Initialize once per project, and every coding agent — Codex, DeepSeek Harness (dsh), ZCode, Grok, ... — reads and writes the same decisions, gotchas, conventions and progress.

- **Single source of truth**: `.memory/` inside the project, tracked by Git
- **Multi-agent mounting**: a standard Skill (`skills/shared-memory/SKILL.md`) plus an AGENTS.md section enforce the same read/write discipline — no agent source code is modified
- **Local Web UI**: `amm ui` starts a dark-themed management interface at `http://127.0.0.1:8787` (see [Web UI](#web-ui))
- **Private Git backup**: turn `.memory/` itself into a standalone private repo and push with one click — ideal for open-source workspaces (memory never mixes into the public code)
- **Zero hard dependencies**: no Docker, no vector DB, no cloud; memory is plain Markdown; the CLI is dependency-free Node.js
- **Optional enhancement**: MCP semantic memory is supported but never required ([docs/mcp-optional.md](docs/mcp-optional.md))

## Quick start

```bash
npm install -g github:ToMySoul/agent-memory-manager

cd your-project
amm init --with-agents-md

amm status
amm handoff "login flow done" --from codex --to dsh

amm ui    # open the local web interface
```

## Commands

| Command | Description |
|---|---|
| `amm init [--force] [--with-agents-md]` | Create the `.memory/` skeleton; `--force` only fills missing/empty files |
| `amm validate` | Check structure and entry format; non-zero exit on ERROR |
| `amm status` | Overview: line/entry counts, latest handoff, status summary |
| `amm handoff "<summary>" [--from] [--to]` | Create `handoffs/YYYY-MM-DD_HHMM_<slug>.md` |
| `amm sync [--dir]` | Scan private memory (default `~/.codex/memories/`) and print backfill suggestions |
| `amm adapt --agent codex,dsh,zcode,grok` | Write/print mounting instructions per agent |
| `amm ui [--port] [--project] [--no-open]` | Start the local web interface (listens on 127.0.0.1 only) |

## Web UI

`amm ui` is the visual layer of the CLI — the data stays in `.memory/` inside your project, and file formats are identical, so CLI and UI can be used interchangeably.

| Page | What you do |
|---|---|
| Dashboard | Project path, init status, counts, blocked-or-not summary, latest 5 handoffs, quick actions |
| Memory | decisions / gotchas / conventions / current-status cards; entry list with detail drawer; create entries (appended to the md files) |
| Handoffs | `.memory/handoffs/` list (newest first), detail rendering, form to create handoffs (same template & naming as `amm handoff`) |
| Sync / Mount | Detect Codex / ZCode / DeepSeek Harness / Grok mounting status; write AGENTS.md section, install skill into the project, copy mount instructions, render adapter docs |
| Backup | **Git backup repo** (`.memory/` becomes its own private repo; one-click commit & push) + zip export + structure validation (`amm validate`) |
| Settings | Theme, default agent list, recent projects |

UI preferences live in `~/.amm/ui-state.json`; memory data never leaves your project directory.

To rebuild the frontend from source: `npm install && npm run build:ui`.

## Entry format

```markdown
### YYYY-MM-DD | agent:<name> | one-line summary
- Details:
- Scope:
- Related paths:
```

Full specs: [`packages/spec/`](packages/spec/). Agent guides: [`adapters/`](adapters/).

> The main documentation is in Simplified Chinese: [README.md](README.md)

## License

[MIT](LICENSE) © 2026 ToMySoul
