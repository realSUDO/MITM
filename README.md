# mitm-ai

**Man in the Middle AI SDK** — A TypeScript-first agent SDK for building production-grade AI agents with tools, memory, guardrails, handoffs, tracing, and multi-provider support.

```
npm install mitm-ai
```

---

## Why MITM?

Most AI SDKs either give you too much magic or too little control. MITM sits in the middle — a minimal, composable SDK where every part is a plain interface you can swap, extend, or ignore.

- **No framework lock-in** — swap providers, memory backends, or guardrail logic with one line
- **Observable by default** — every step, tool call, and handoff fires a typed event
- **Safe by design** — guardrails, typed errors, retries, timeouts, and loop prevention built in
- **Production-ready** — persistent sessions, full run traces, token usage tracking

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
console.log(result);
```

---

## Installation

```bash
npm install mitm-ai
```

Set your API key:

```bash
OPENAI_API_KEY=sk-...
```

Or pass it directly:

```ts
new OpenAIProvider({ apiKey: "sk-...", model: "gpt-4o" })
```

---

## API Reference

### Agent

```ts
Agent.builder()
  .setName("agentName")                          // used in traces and handoffs
  .setProvider(new OpenAIProvider())             // required
  .setInstructions("You are...")                 // system prompt
  .tool(myTool)                                  // register tools (chainable)
  .setMemory(new FileAdapter(), "session-id")    // optional persistence
  .addInputGuardrail(guardrail)                  // runs before loop
  .addOutputGuardrail(guardrail)                 // runs before returning
  .addToolGuardrail(guardrail)                   // runs before each tool call
  .setOutputSchema(schema, maxRetries?)          // structured output validation
  .addHandoffTarget({ name, run })               // target agents for handoff
  .setTimeout(60_000)                            // ms, aborts run if exceeded
  .setMaxIterations(30)                          // default 30
  .setStuckLoopThreshold(4)                      // detect same step repeating
  .build();

agent.run(query)          // returns Promise<IMessage[] | string | undefined>
agent.getLastTrace()      // returns ITrace | null
agent.on(event, handler)  // typed EventEmitter
agent.attachInterceptor(fn) // sugar over on("step", ...)
agent.printSystemPrompt() // debug
```

---

### Tools

```ts
const myTool: ITool = {
  name: "fetchData",
  description: "Fetches data from an API",
  doc: "fetchData(url: string): string",
  inputSchema: {
    fields: {
      url: { type: "string", required: true, description: "URL to fetch" },
    },
  },
  maxRetries: 2,      // retry on failure
  timeoutMs: 5000,    // abort if takes too long
  async executor(input) {
    const { url } = JSON.parse(input);
    const res = await fetch(url);
    return await res.text();
  },
};
```

---

### Model Providers

#### OpenAI (built-in)

```ts
new OpenAIProvider({
  apiKey: "sk-...",
  baseURL: "https://api.openai.com/v1",  // or any OpenAI-compatible endpoint
  model: "gpt-4o-mini",
})
```

#### Custom Provider

Implement `IModelProvider` to use any LLM:

```ts
import type { IModelProvider, IMessage, IModelResponse } from "mitm-ai";

class MyProvider implements IModelProvider {
  async chat(systemPrompt: string, history: IMessage[]): Promise<IModelResponse> {
    // call your LLM
    return { text: "...", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
  }
}
```

---

### Memory & Sessions

```ts
import { InMemoryAdapter, FileAdapter } from "mitm-ai";

// In-memory (lost on process restart)
agent.builder().setMemory(new InMemoryAdapter(), "user-123")

// File-based (persists to .mitm-sessions/user-123.json)
agent.builder().setMemory(new FileAdapter(".mitm-sessions"), "user-123")

// Custom adapter — implement IMemoryAdapter
interface IMemoryAdapter {
  get(sessionId: string): Promise<IMessage[]>;
  set(sessionId: string, history: IMessage[]): Promise<void>;
  clear(sessionId: string): Promise<void>;
}
```

---

### Guardrails

```ts
import type { IInputGuardrail, IOutputGuardrail, IToolGuardrail } from "mitm-ai";

// Input guardrail — runs before the agent loop
const inputGuardrail: IInputGuardrail = {
  name: "profanity-filter",
  async run(input) {
    if (input.includes("badword")) return { action: "block", reason: "Profanity detected" };
    return { action: "pass" };
    // or: return { action: "modify", modified: sanitized }
  },
};

// Output guardrail — runs before returning OUTPUT
const outputGuardrail: IOutputGuardrail = {
  name: "redact-secrets",
  async run(output) {
    return { action: "modify", modified: output.replace(/sk-\S+/g, "[REDACTED]") };
  },
};

// Tool guardrail — runs before each tool executor call
const toolGuardrail: IToolGuardrail = {
  name: "no-dangerous-commands",
  async run(toolName, input) {
    if (toolName === "execCli" && input.includes("rm -rf")) {
      return { action: "block", reason: "Destructive command blocked" };
    }
    return { action: "pass" };
  },
};
```

---

### Structured Output

```ts
agent.builder().setOutputSchema({
  fields: {
    summary: { type: "string", required: true },
    success: { type: "boolean", required: true },
    files:   { type: "array",   required: true },
  },
}, 3) // max 3 retries if schema validation fails
```

---

### Agent Handoffs

```ts
import { createHandoffTool } from "mitm-ai";

const reviewAgent = Agent.builder()
  .setName("reviewAgent")
  .setProvider(provider)
  .setInstructions("You review code and report findings.")
  .tool(cliTool)
  .build();

const codingAgent = Agent.builder()
  .setName("codingAgent")
  .setProvider(provider)
  .setInstructions("Write code, then hand off to reviewAgent.")
  .tool(createHandoffTool("reviewAgent", "Hand off to verify code"))
  .addHandoffTarget({
    name: "reviewAgent",
    run: (query, chain) => reviewAgent.run(query, chain),
  })
  .build();
```

Handoff loop detection is automatic — if agent A hands off to B which hands off back to A, the chain is broken with an error.

---

### Events

```ts
agent.on("step",               (e) => console.log(e.step, e.content));
agent.on("tool:start",         (e) => console.log("Starting", e.toolName));
agent.on("tool:end",           (e) => console.log("Done", e.toolName, e.durationMs + "ms"));
agent.on("tool:error",         (e) => console.log("Error", e.toolName, e.error));
agent.on("handoff",            (e) => console.log(e.fromAgent, "→", e.toAgent));
agent.on("guardrail:triggered",(e) => console.log(e.guardrailName, e.action));
agent.on("run:complete",       (e) => console.log("Done", e.history.length, "messages"));
agent.on("run:failed",         (e) => console.error("Failed", e.error));
```

---

### Tracing

```ts
const result = await agent.run("...");
const trace = agent.getLastTrace();

console.log(trace.runId);
console.log(trace.agentName);
console.log(trace.durationMs);
console.log(trace.totalSteps);
console.log(trace.tokenUsage);   // { promptTokens, completionTokens, totalTokens }
console.log(trace.toolCalls);    // [{ toolName, input, result, durationMs, error? }]
console.log(trace.handoffs);     // [{ fromAgent, toAgent, reason, timestampMs }]
console.log(trace.errors);       // string[]
```

---

### Reliability

```ts
Agent.builder()
  .setTimeout(30_000)          // abort entire run after 30s
  .setMaxIterations(20)        // stop after 20 LLM calls
  .setStuckLoopThreshold(4)    // detect if model repeats same step 4 times

// Per-tool:
const myTool: ITool = {
  maxRetries: 2,     // retry up to 2 times on failure
  timeoutMs: 5000,   // abort tool call after 5s
  ...
}
```

---

## Examples

See `src/index.ts` in the repository for a full demo with:
- Two agents with handoff
- File memory + in-memory sessions
- Input, output, and tool guardrails
- Tool input schema validation
- EventEmitter event logging
- Full trace output with token usage

---

## License

MIT
