# Events

`Agent` extends Node.js `EventEmitter` with fully typed events. Subscribe to anything happening inside a run.

## Subscribing

```ts
agent.on("step", (e) => console.log(`[${e.step}]`, e.content));
```

## All Events

### `step`

Fires on every reasoning step (INITIAL, BREAKDOWN, THINKING, ANALYZE, OUTPUT).

```ts
agent.on("step", (e: StepEvent) => {
  console.log(e.step);    // "INITIAL" | "BREAKDOWN" | "THINKING" | ...
  console.log(e.content); // the step's text content
  console.log(e.raw);     // full raw JSON string from the model
});
```

### `tool:start`

Fires just before a tool executor is called.

```ts
agent.on("tool:start", (e: ToolStartEvent) => {
  console.log(e.toolName); // "execCli"
  console.log(e.input);    // the input string
});
```

### `tool:end`

Fires after a tool returns successfully.

```ts
agent.on("tool:end", (e: ToolEndEvent) => {
  console.log(e.toolName);   // "execCli"
  console.log(e.result);     // tool output
  console.log(e.durationMs); // execution time
});
```

### `tool:error`

Fires when a tool throws (after all retries exhausted).

```ts
agent.on("tool:error", (e: ToolErrorEvent) => {
  console.log(e.toolName);
  console.log(e.error); // error message
});
```

### `handoff`

Fires when the agent initiates a handoff.

```ts
agent.on("handoff", (e: HandoffEvent) => {
  console.log(`${e.fromAgent} → ${e.toAgent}`);
  console.log(e.reason);
});
```

### `run:complete`

Fires when the run finishes successfully.

```ts
agent.on("run:complete", (e: RunCompleteEvent) => {
  console.log(e.history); // IMessage[]
  console.log(e.trace);   // ITrace
});
```

### `run:failed`

Fires when the run fails (timeout, max iterations, blocked guardrail).

```ts
agent.on("run:failed", (e: RunFailedEvent) => {
  console.log(e.error);
  console.log(e.trace);
});
```

## attachInterceptor

A convenience method that registers a callback on every `step` event:

```ts
agent.attachInterceptor((message) => {
  console.log(`[${message.role}]:`, message.content);
});
```

This is equivalent to `agent.on("step", ...)`.
