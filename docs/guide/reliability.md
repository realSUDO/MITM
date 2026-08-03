# Reliability

MITM has safety nets at every level to prevent runaway agents, stuck loops, and unresponsive tools.

## Agent-level Timeout

Abort the entire run if it exceeds a time limit:

```ts
Agent.builder()
  .setTimeout(30_000) // 30 seconds
  .build();
```

When triggered, the run emits `run:failed` and returns an error string.

## Max Iterations

Limit the number of LLM calls per run:

```ts
Agent.builder()
  .setMaxIterations(20) // default: 30
  .build();
```

## Stuck Loop Detection

If the model repeats the same pipeline step N times in a row, the SDK injects an error message to break it out:

```ts
Agent.builder()
  .setStuckLoopThreshold(4) // default: 4
  .build();
```

For example, if the model outputs `THINKING` four times in a row without progressing, the SDK pushes a recovery message into the history.

## Per-tool Retries

```ts
const myTool: ITool = {
  name: "callApi",
  maxRetries: 2, // retry up to 2 times on failure
  async executor(input) { ... },
};
```

Failed retries are reported in the trace and as `tool:error` events.

## Per-tool Timeout

```ts
const myTool: ITool = {
  name: "callApi",
  timeoutMs: 5000, // abort after 5 seconds
  async executor(input) { ... },
};
```

Uses `Promise.race` internally — the executor is aborted and treated as a failure.

## Safe Error Recovery

Tool errors, validation failures, and guardrail blocks are never thrown to the caller (unless the tool itself throws unhandled). They are pushed back to the model as `developer` messages, giving the model a chance to recover. Use `run:failed` event or `trace.errors` to inspect them.
