# Product Manager (Antigravity) -> Developer (Claude Code) Workflow

**Version:** 1.0
**Date:** 2026-02-08
**Status:** ACTIVE

---

## 1. Roles & Responsibilities

### 🧠 Antigravity (Product Manager / Architect)
- **Primary Goal:** High-level planning, requirement gathering, and architectural oversight.
- **Responsibilities:**
    - Updates `PRD.md` with new feature requirements.
    - Maintains `TODO.md` backlog.
    - Creates "Sprint Specs" in `context/active_sprint.md` for execution.
    - Reviews completed work against requirements.
    - Manages the `context/Channel.md` history.

### 🤖 Claude Code (Lead Developer)
- **Primary Goal:** Efficient and correct code execution.
- **Responsibilities:**
    - Reads `context/active_sprint.md` to understand the current task.
    - Executes code changes (modifying files, running tests).
    - Updates `context/Channel.md` with implementation details and status.
    - **does NOT** modify `PRD.md` or `active_sprint.md` (read-only for dev).

---

## 2. The Sprint Cycle

### Phase 1: Planning (Antigravity)
1.  Antigravity identifies the next priority from `TODO.md`.
2.  Antigravity writes a detailed spec in `context/active_sprint.md`.
    -   *Must include:* Goal, Context, Acceptance Criteria, and Technical Guidelines.
3.  Antigravity notifies the User to "Run Claude".

### Phase 2: Execution (Claude Code)
1.  User runs `claude`.
2.  Claude Code reads `context/active_sprint.md`.
3.  Claude Code implements the changes.
4.  Claude Code runs verification (tests, linting).
5.  Claude Code appends a "Completion Report" to `context/Channel.md`.

### Phase 3: Review (Antigravity)
1.  Antigravity reads `context/Channel.md` and verifies the changes.
2.  If satisfied:
    -   Antigravity clears `context/active_sprint.md`.
    -   Antigravity updates `TODO.md` (mark done).
3.  If issues found:
    -   Antigravity updates `context/active_sprint.md` with feedback/fixes.
    -   Cycle returns to Phase 2.

---

## 3. Communication Channel (`context/Channel.md`)

All technical discussion and handoffs happen here.

**Format for Claude Code updates:**
```markdown
## [EXECUTION] {Date}
**Task:** {Task Name from active_sprint.md}
**Changes:**
- Modified `src/components/Example.tsx`
- Added `tests/Example.test.ts`
**Status:** {COMPLETED | BLOCKED | IN_PROGRESS}
**Notes:** {Any specific decisions or issues encountered}
```
