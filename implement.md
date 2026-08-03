
  What we have (Phase 0 foundation)

  - Agent + AgentBuilder — builder pattern,
  works
  - ToolMap — registered tools, prompt
  serialization
  - ITool / IMessage / Interceptor — core
  types
  - Basic agent loop — LLM call → parse step
  → tool dispatch → history → repeat
  - execCli + fsWrite sample tools
  - HARNESS_PROMPT with structured pipeline
  (INITIAL → BREAKDOWN → THINKING → ANALYZE
  → TOOL_REQUEST → OUTPUT)

  ──────────────────────────────────────────

  What needs to be built (graded features)

  Here's the full breakdown mapped to
  checkpoints, ordered by dependency:

  ──────────────────────────────────────────

  Checkpoint 1 — Core SDK restructure +
  Model Provider Abstraction

  Before adding features, clean up the
  architecture so everything slots in
  properly.

  - Move source into src/core/ (agent,
  toolmap, types) vs src/providers/ (OpenAI
  adapter) vs src/memory/ vs src/guardrails/
   etc.
  - IModelProvider interface — decouple
  OpenAI from Agent. Plug in Gemini/Claude
  later.
  - Clean package.json for npm publish (name
  mitm-ai, exports, types, main)
  - Commit: [FEAT] : Model provider
  abstraction + SDK restructure

  ──────────────────────────────────────────

  Checkpoint 2 — Tool input schema +
  validation + typed errors

  - Add inputSchema (zod or plain JSON
  schema) to ITool
  - Validate input before calling executor
  - Typed ToolError — distinguish
  tool-not-found, validation-fail,
  execution-error
  - Commit: [FEAT] : Tool input validation
  and typed errors

  ──────────────────────────────────────────

  Checkpoint 3 — Memory + Sessions

  - IMemoryAdapter interface with
  get(sessionId) / set(sessionId, history) /
  clear(sessionId)
  - InMemoryAdapter (default)
  - FileAdapter (JSON file per session)
  - Agent takes optional sessionId —
  persists/restores history across runs
  - Commit: [FEAT] : Memory and session
  support

  ──────────────────────────────────────────

  Checkpoint 4 — Guardrails

  - IGuardrail interface — input and output
   guardrails, return pass | block | modify
  - Input guardrail runs before agent loop
  - Output guardrail runs before returning
  final result
  - Tool guardrail — runs before any tool
  executor call
  - Commit: [FEAT] : Input, output, and tool
  guardrails

  ──────────────────────────────────────────

  Checkpoint 5 — Structured Output

  - outputSchema option on agent — JSON
  schema or zod
  - After OUTPUT step, validate
  parsedLLMResponse.content against schema
  - Retry up to N times if invalid, feeding
  validation error back to model
  - Return typed result with data + valid
   fields
  - Commit: [FEAT] : Structured output with
  schema validation and retry

  ──────────────────────────────────────────

  Checkpoint 6 — Agent Handoff

  - handoffTool — special built-in tool that
  transfers execution to another Agent
  - Handoff carries current message context
  - Loop detection — max handoff depth,
  prevent A→B→A cycles
  - Handoff appears in trace + interceptor
  events
  - Commit: [FEAT] : Agent handoff with loop
  prevention

  ──────────────────────────────────────────

  Checkpoint 7 — Tracing

  - ITrace — runId, agentName, model,
  startTime, endTime, steps[], tokenUsage,
  toolCalls[], handoffs[], errors[]
  - Each step in the loop appends to the
  trace
  - agent.getLastTrace() returns the trace
  after run()
  - Commit: [FEAT] : Run tracing with timing
  and token usage

  ──────────────────────────────────────────

  Checkpoint 8 — Streaming + Events
  (EventEmitter)

  - Agent extends or wraps EventEmitter
  - Events: step, tool:start, tool:end,
  handoff, guardrail:triggered,
  run:complete, run:failed
  - Replace interceptors with events (keep
  attachInterceptor as sugar over on('step',
  ...))
  - Commit: [FEAT] : Event emitter streaming
  and runtime events

  ──────────────────────────────────────────

  Checkpoint 9 — Reliability (retries,
  timeouts, loop prevention)

  - Per-tool retry config (maxRetries,
  timeoutMs)
  - Agent-level timeout
  - MAX_ITERATIONS already exists — surface
  it as config
  - Detect stuck loops (same step repeated N
  times → force OUTPUT)
  - Commit: [FEAT] : Retries, timeouts, and
  loop prevention

  ──────────────────────────────────────────

  Checkpoint 10 — npm publish prep + docs

  - package.json — name mitm-ai, exports
  map, types, main, module
  - README with quick start
  - JSDoc on all public APIs
  - Hosted docs (VitePress or simple
  markdown on GitHub Pages)
  - npm publish
  - Commit: [FEAT] : npm package setup and
  documentation

  ──────────────────────────────────────────

  Order of execution

  1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

  Each checkpoint is testable in isolation
  before moving to the next. We test by
  running tsc --noEmit + a manual smoke test
  in src/index.ts after each one.

  ──────────────────────────────────────────

  Ready to start Checkpoint 1? I'll
  restructure the folders and implement the
  model provider abstraction first.
