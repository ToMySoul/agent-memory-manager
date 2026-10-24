# Agent Memory Manager (AMM)

> **One memory. Every agent.**

Initialize once per project, and every coding agent — Codex, DeepSeek Harness (dsh), ZCode, Grok, ... — reads and writes the same decisions, gotchas, conventions and progress.

- **Single source of truth**: `.memory/` inside the project, tracked by Git
- **Multi-agent mounting**: a standard Skill (`skills/shared-memory/SKILL.md`) plus an AGENTS.md section enforce the same read/write discipline — no agent source code is modified
- **Zero hard dependencies**: no Docker, no vector DB, no cloud; memory is plain Markdown; the CLI is dependency-free Node.js
- **Optional enhancement**: MCP semantic memory is supported but never required ([docs/mcp-optional.md](docs/mcp-optional.md))

## Quick start

```bash
npm install -g github:ToMySoul/agent-memory-manager

cd your-project
amm init --with-agents-md

amm status
amm handoff "login flow done" --from codex --to dsh
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
