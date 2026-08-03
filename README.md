<div align="center">

<img src="https://img.shields.io/badge/mitm--ai-v0.1.0-6366f1?style=for-the-badge&labelColor=09090b" alt="version" />
<img src="https://img.shields.io/npm/v/mitm-ai?style=for-the-badge&color=6366f1&labelColor=09090b" alt="npm" />
<img src="https://img.shields.io/npm/dm/mitm-ai?style=for-the-badge&color=22c55e&labelColor=09090b" alt="downloads" />
<img src="https://img.shields.io/badge/TypeScript-5.x-3b82f6?style=for-the-badge&labelColor=09090b" alt="typescript" />
<img src="https://img.shields.io/badge/license-MIT-f59e0b?style=for-the-badge&labelColor=09090b" alt="license" />
<img src="https://img.shields.io/github/actions/workflow/status/realsudo/mitm-ai/deploy.yml?style=for-the-badge&labelColor=09090b&label=deploy" alt="deploy" />

<br /><br />

<h1>mitm-ai</h1>

<p><strong>Man in the Middle AI SDK</strong></p>
<p>TypeScript-first agent SDK for building production-grade AI agents.<br>Tools, memory, guardrails, handoffs, tracing — composable by design.</p>

<br />

<a href="https://docs.mitm.sud-o.app"><strong>Documentation</strong></a>
&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://docs.mitm.sud-o.app/guide/quick-start"><strong>Quick Start</strong></a>
&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://www.npmjs.com/package/mitm-ai"><strong>npm</strong></a>
&nbsp;&nbsp;|&nbsp;&nbsp;
<a href="https://mitm.sud-o.app"><strong>Website</strong></a>

<br /><br />

</div>

---

## Why MITM?

Most AI SDKs give you too much magic or too little control. MITM sits in the middle — a minimal, composable SDK where every part is a plain interface you can swap, extend, or ignore.

| | MITM | LangChain | Vercel AI SDK |
|---|---|---|---|
| TypeScript-first | Yes | Partial | Yes |
| No framework lock-in | Yes | No | Partial |
| Observable by default | Yes | Partial | Partial |
| Multi-agent handoffs | Yes | Yes | No |
| Tool guardrails | Yes | No | No |
| Full run tracing | Yes | Partial | No |
| Bring your own provider | Yes | Yes | Yes |

---

## Installation

```bash
npm install mitm-ai
```

```bash
export OPENAI_API_KEY=sk-...
```

---

## Quick Start

```ts
import { Agent, OpenAIProvider } from "mitm-ai";
import type { ITool } from "mitm-ai";

const myTool: ITool = {
  name: "echo",
  description: "Echoes back the input",
  async executor(input) {
    return input;
  },
};

const agent = Agent.builder()
  .setName("myAgent")
  .setProvider(new OpenAIProvider())
  .setInstructions("You are a helpful assistant.")
  .tool(myTool)
  .build();

agent.on("step", (e) => console.log(`[${e.step}]`, e.content));

const result = await agent.run("Echo back: hello world");
const trace = agent.getLastTrace();
console.log(`Done in ${trace?.durationMs}ms — ${trace?.tokenUsage.totalTokens} tokens`);
```

---

## API Reference

### Agent

```ts
Agent.builder()
  .setName("agentName")
  .setProvider(new OpenAIProvider())
  .setInstructions("You are...")
  .tool(myTool)
  .setMemory(new FileAdapter(), "session-id")
  .addInputGuardrail(guardrail)
  .addOutputGuardrail(guardrail)
  .addToolGuardrail(guardrail)
  .setOutputSchema(schema, maxRetries?)
  .addHandoffTarget({ name, run })
  .setTimeout(60_000)
  .setMaxIterations(30)
  .setStuckLoopThreshold(4)
  .build();

agent.run(query)           // Promise<IMessage[] | string | undefined>
agent.getLastTrace()       // ITrace | null
agent.on(event, handler)   // typed EventEmitter
agent.attachInterceptor(fn)
```

### Tools

```ts
const myTool: ITool = {
  name: "fetchData",
  description: "Fetches data from an API",
  doc: "fetchData(url: string): string",
  inputSchema: {
    fields: {
      url: { type: "string", required: true },
    },
  },
  maxRetries: 2,
  timeoutMs: 5000,
  async executor(input) {
    const { url } = JSON.parse(input);
    return await fetch(url).then(r => r.text());
  },
};
```

### Memory

```ts
import { InMemoryAdapter, FileAdapter } from "mitm-ai";

.setMemory(new InMemoryAdapter(), "user-123")
.setMemory(new FileAdapter(".sessions"), "user-123")

// Custom — implement IMemoryAdapter
interface IMemoryAdapter {
  get(sessionId: string): Promise<IMessage[]>;
  set(sessionId: string, history: IMessage[]): Promise<void>;
  clear(sessionId: string): Promise<void>;
}
```

### Guardrails

```ts
import type { IInputGuardrail, IOutputGuardrail, IToolGuardrail } from "mitm-ai";

const input: IInputGuardrail = {
  name: "filter",
  async run(input) {
    if (input.includes("badword")) return { action: "block", reason: "..." };
    return { action: "pass" };
    // or: return { action: "modify", modified: sanitized }
  },
};

const output: IOutputGuardrail = {
  name: "redact",
  async run(output) {
    return { action: "modify", modified: output.replace(/sk-\S+/g, "[REDACTED]") };
  },
};

const tool: IToolGuardrail = {
  name: "no-rm-rf",
  async run(toolName, input) {
    if (toolName === "execCli" && /rm -rf/.test(input))
      return { action: "block", reason: "Blocked" };
    return { action: "pass" };
  },
};
```

### Handoffs

```ts
import { createHandoffTool } from "mitm-ai";

const reviewAgent = Agent.builder()
  .setName("reviewAgent")
  .setProvider(provider)
  .setInstructions("You review code.")
  .tool(cliTool)
  .build();

const codingAgent = Agent.builder()
  .setName("codingAgent")
  .setProvider(provider)
  .setInstructions("Write code, then hand off to reviewAgent.")
  .tool(createHandoffTool("reviewAgent", "Verify the code"))
  .addHandoffTarget({
    name: "reviewAgent",
    run: (query, chain) => reviewAgent.run(query, chain),
  })
  .build();
```

### Events

```ts
agent.on("step",                (e) => console.log(e.step, e.content));
agent.on("tool:start",          (e) => console.log("Starting", e.toolName));
agent.on("tool:end",            (e) => console.log("Done", e.toolName, e.durationMs + "ms"));
agent.on("tool:error",          (e) => console.log("Error", e.toolName, e.error));
agent.on("handoff",             (e) => console.log(e.fromAgent, "to", e.toAgent));
agent.on("guardrail:triggered", (e) => console.log(e.guardrailName, e.action));
agent.on("run:complete",        (e) => console.log("Done", e.history.length, "messages"));
agent.on("run:failed",          (e) => console.error("Failed", e.error));
```

### Tracing

```ts
const trace = agent.getLastTrace();

trace.runId           // unique UUID
trace.agentName
trace.durationMs
trace.totalSteps
trace.tokenUsage      // { promptTokens, completionTokens, totalTokens }
trace.toolCalls       // [{ toolName, input, result, durationMs, error? }]
trace.handoffs        // [{ fromAgent, toAgent, reason, timestampMs }]
trace.errors          // string[]
```

### Reliability

```ts
Agent.builder()
  .setTimeout(30_000)
  .setMaxIterations(20)
  .setStuckLoopThreshold(4)

// Per-tool
const tool: ITool = {
  maxRetries: 2,
  timeoutMs: 5000,
  ...
}
```

---

## Project Structure

```
src/
  core/
    agent.ts          Agent, AgentBuilder, ToolMap
    types.ts          IMessage, ITool, IModelProvider, ...
    trace.ts          ITrace, createTrace
    events.ts         MITMEventMap, event payloads
    schema.ts         IOutputSchema, validateOutput
    validate.ts       validateToolInput
    handoff.ts        HandoffTarget, createHandoffTool
  providers/
    openai.ts         OpenAIProvider
  memory/
    InMemoryAdapter.ts
    FileAdapter.ts
  guardrails/
    types.ts          IInputGuardrail, IOutputGuardrail, IToolGuardrail
  sdk.ts              Public barrel export
```

---

## License

MIT — see [LICENSE](./LICENSE)

---

<div align="center">

<img src="https://img.shields.io/badge/built_with-TypeScript-3b82f6?style=flat-square&labelColor=09090b" />
<img src="https://img.shields.io/badge/runs_on-Node.js_18+-22c55e?style=flat-square&labelColor=09090b" />
<img src="https://img.shields.io/badge/provider-OpenAI_compatible-6366f1?style=flat-square&labelColor=09090b" />

</div>
