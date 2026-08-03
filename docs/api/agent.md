# Agent API

## Agent.builder()

Returns a new `AgentBuilder` instance.

```ts
const builder = Agent.builder();
```

## AgentBuilder Methods

All methods return `this` for chaining.

| Method | Type | Description |
|---|---|---|
| `.setName(name)` | `string` | Agent name, used in traces and handoffs |
| `.setProvider(provider)` | `IModelProvider` | **Required.** The LLM provider |
| `.setInstructions(text)` | `string` | System prompt |
| `.tool(tool)` | `ITool` | Register a tool (chainable) |
| `.setMemory(adapter, sessionId)` | `IMemoryAdapter, string` | Enable session persistence |
| `.addInputGuardrail(g)` | `IInputGuardrail` | Add input guardrail |
| `.addOutputGuardrail(g)` | `IOutputGuardrail` | Add output guardrail |
| `.addToolGuardrail(g)` | `IToolGuardrail` | Add tool guardrail |
| `.setOutputSchema(schema, retries?)` | `IOutputSchema, number` | Structured output validation |
| `.addHandoffTarget(target)` | `HandoffTarget` | Register a handoff target agent |
| `.setTimeout(ms)` | `number` | Abort run after N milliseconds |
| `.setMaxIterations(n)` | `number` | Max LLM calls per run (default: 30) |
| `.setStuckLoopThreshold(n)` | `number` | Stuck-loop detection window (default: 4) |
| `.build()` | — | Returns the configured `Agent` instance |

## Agent Methods

| Method | Returns | Description |
|---|---|---|
| `run(query)` | `Promise<IMessage[] \| string \| undefined>` | Execute the agent |
| `getLastTrace()` | `ITrace \| null` | Trace from the last run |
| `on(event, handler)` | `this` | Subscribe to a typed event |
| `off(event, handler)` | `this` | Unsubscribe |
| `attachInterceptor(fn)` | `this` | Sugar over `on("step", ...)` |
| `printSystemPrompt()` | `void` | Print compiled system prompt |

## run() Return Value

| Result | Meaning |
|---|---|
| `IMessage[]` | Run completed — full message history |
| `string` | Blocked by guardrail, timeout, or loop |
| `undefined` | Max iterations reached without OUTPUT |
