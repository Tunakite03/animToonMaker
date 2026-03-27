# Repository Agent Rules

## Default Codebase Read Path

For every user request that touches this repository's code, architecture, debugging, refactoring, implementation, review, or file-level behavior, start by using `vexp` before using slower ad hoc inspection.

Required default order:
1. Call `mcp__vexp__run_pipeline` first for any non-trivial repository task.
2. If only a single file needs quick inspection, use `mcp__vexp__get_skeleton` instead of broad file reads.
3. For tasks involving external libraries, frameworks, APIs, platform features, or implementation patterns that may have changed, use `Context7` to fetch current official documentation before coding.
4. Use shell/file reads only after `vexp` if exact raw lines, command output, or verification is still needed.

Exceptions:
- Skip `vexp` only for requests that are clearly unrelated to the codebase, such as casual conversation, pure translation, or simple environment checks.
- Skip `Context7` only when the task is purely local to this repository and does not depend on external library or platform behavior.
- If `vexp` is unavailable or fails, state that briefly and fall back to direct repository inspection.
- If `Context7` is unavailable or does not have good coverage for the relevant dependency, state that briefly and fall back to the best available primary source.

Behavioral requirement:
- Optimize for fastest repository understanding path. Prefer `vexp` over manual search, broad recursive reads, or piecemeal file exploration.
- Optimize for up-to-date implementation guidance. Prefer `Context7` over memory for framework and library usage when correctness depends on current docs.
- Default combined workflow for technical work: `vexp` to understand local code, `Context7` to confirm current external API guidance, then implement.


## vexp <!-- vexp v1.2.30 -->

**MANDATORY: use `run_pipeline` — do NOT grep or glob the codebase.**
vexp returns pre-indexed, graph-ranked context in a single call.

### Workflow
1. `run_pipeline` with your task description — ALWAYS FIRST (replaces all other tools)
2. Make targeted changes based on the context returned
3. `run_pipeline` again only if you need more context

### Available MCP tools
- `run_pipeline` — **PRIMARY TOOL**. Runs capsule + impact + memory in 1 call.
  Auto-detects intent. Includes file content. Example: `run_pipeline({ "task": "fix auth bug" })`
- `get_context_capsule` — lightweight, for simple questions only
- `get_impact_graph` — impact analysis of a specific symbol
- `search_logic_flow` — execution paths between functions
- `get_skeleton` — compact file structure
- `index_status` — indexing status
- `get_session_context` — recall observations from sessions
- `search_memory` — cross-session search
- `save_observation` — persist insights (prefer run_pipeline's observation param)

### Agentic search
- Do NOT use built-in file search, grep, or codebase indexing — always call `run_pipeline` first
- If you spawn sub-agents or background tasks, pass them the context from `run_pipeline`
  rather than letting them search the codebase independently

### Smart Features
Intent auto-detection, hybrid ranking, session memory, auto-expanding budget.

### Multi-Repo
`run_pipeline` auto-queries all indexed repos. Use `repos: ["alias"]` to scope. Run `index_status` to see aliases.
<!-- /vexp -->