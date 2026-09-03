# Hooks

Hook scripts are deterministic enforcement — unlike rules (advisory), hooks **guarantee** behavior by blocking or modifying tool calls before/after they execute.

Hooks are wired in `settings.json` under the `"hooks"` key. Each hook specifies an event, a matcher, and a command to run.

## Available Hooks

### protect-files.sh
**Event**: PreToolUse (Edit|Write)

Blocks edits to sensitive and generated files. Fails closed (blocks if `jq` is missing).
- `.env`, `.env.*` — secrets (by basename and path)
- `*.pem`, `*.key`, `*.crt`, `*.p12`, `*.pfx` — certificates and keys
- `id_rsa`, `id_ed25519`, `credentials.json`, `.npmrc`, `.pypirc` — credentials
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` — lock files
- `*.gen.ts`, `*.generated.*` — generated code
- `*.min.js`, `*.min.css` — minified bundles
- Anything inside `.git/`, `secrets/`, or `.claude/hooks/`
- Self-protecting: blocks edits to hook scripts and `settings.json`

### warn-large-files.sh
**Event**: PreToolUse (Edit|Write)

Blocks writes to build artifacts, dependency directories, and binary files. Fails closed.
- `node_modules/`, `vendor/`, `dist/`, `build/`, `.next/`, `__pycache__/`, `.venv/`
- `*.wasm`, `*.so`, `*.dylib`, `*.dll`, `*.exe`, `*.zip`, `*.tar.*`
- `*.mp4`, `*.mov`, `*.mp3`, `*.pyc`, `*.class`

### block-dangerous-commands.sh
**Event**: PreToolUse (Bash)

Blocks dangerous shell commands. Detects patterns even in chained commands (`&&`, `;`). Fails closed.
- **Git**: `git push origin main/master`, `git push --force` (allows `--force-with-lease`), bare `git push` on main
- **Filesystem**: `rm -rf /`, `rm -rf ~`, recursive delete on root/home paths
- **Database**: `DROP TABLE/DATABASE`, `DELETE FROM` without WHERE, `TRUNCATE TABLE`
- **System**: `chmod 777`, piping `curl`/`wget` to `bash`/`sh`, `mkfs`, `dd if=`, writes to `/dev/`

### block-supabase-prod.sh — NOT IN THIS DIRECTORY
**Event**: PreToolUse (Bash)
**Lives at**: `~/.claude/hooks/block-supabase-prod.sh`, registered in `~/.claude/settings.json`

Deliberately not in this directory. A copy used to be, was never registered in `.claude/settings.json`, and therefore never ran — editing it changed nothing while the machine-local copy did the actual gating. The duplicate was deleted on 2026-09-03. See `docs/POST_INCIDENT_FRAMEWORK.md` incident 2, which carries the open item to bring it back under version control properly.

Its expected behaviour is pinned by `scripts/test-supabase-guard.sh` (tracked) — the reviewable contract while the hook itself is machine-local. Run it after any edit to the hook.

Denies any Bash invocation of the Supabase CLI or Management API that does not explicitly and exclusively target DEV (`ctppzqnysmzynkxjlzta`). Fails closed.
- **PROD ref**: any Supabase command naming `ecyivrxjpsmjmexqatym` is blocked outright
- **History rewrites**: `db push`, `db reset`, `migration repair` are blocked on every target
- **Implicit targets**: `--linked` and any command with no `--project-ref` are blocked, because both inherit a default that resolves to PROD
- **Read-only exception**: `migration list`, `db diff` and `inspect db *` are allowed when the hook itself reads `supabase/.temp/project-ref` and confirms DEV at invoke time. `--db-url` and `--workdir` are refused there because they make the target unverifiable from inside the hook. `db query` is excluded by design — it executes arbitrary SQL and is what reached PROD on 2026-08-27
- **Management API**: `curl`/`wget` to `api.supabase.com` is held to the same rule

Companion to `block-supabase-mcp-writes.sh`, which covers the MCP tool route only and never sees a Bash command. Neither hook gates a human's own terminal, which is where CLAUDE.md says PROD Edge Function deploys are run by hand.

### format-on-save.sh
**Event**: PostToolUse (Edit|Write)

Auto-formats files after Claude edits them. Auto-detects formatters by checking for both the binary and a config file:
- Biome: `biome.json` + `node_modules/.bin/biome`
- Prettier: `.prettierrc*` or `package.json` prettier key + `node_modules/.bin/prettier`
- Ruff: `ruff.toml` or `pyproject.toml [tool.ruff]` + `ruff` binary
- Black: `pyproject.toml [tool.black]` + `black` binary
- rustfmt: standard for Rust (no config needed)
- gofmt: standard for Go (no config needed)

### session-start.sh
**Event**: SessionStart

Injects dynamic project context at session start: current branch (or detached HEAD warning), last commit, uncommitted changes count, staged changes indicator, and stash count.

## Adding Your Own

1. Create a `.sh` script in this directory
2. Make it executable: `chmod +x your-hook.sh`
3. Wire it in `settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/your-hook.sh"
          }
        ]
      }
    ]
  }
}
```

- Exit 0 = allow, Exit 2 = block
- Scripts receive JSON on stdin with `tool_input`
- Requires `jq` for JSON parsing

See [Claude Code docs](https://code.claude.com/docs/en/hooks) for all hook events.
