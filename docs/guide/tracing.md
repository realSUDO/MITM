# Tracing

Every `run()` produces a full trace. Access it after the run completes.

## Getting the Trace

```ts
const result = await agent.run("...");
const trace = agent.getLastTrace();
```

## ITrace Shape

```ts
interface ITrace {
  runId: string;          // unique UUID per run
  agentName: string;
  startTimeMs: number;
  endTimeMs: number | null;
  durationMs: number | null;
  totalSteps: number;
  steps: ITraceStep[];
  toolCalls: IToolCall[];
  handoffs: IHandoffRecord[];
  errors: string[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

## Steps

```ts
for (const step of trace.steps) {
  console.log(`[${step.index}] ${step.step}: ${step.content}`);
}
```

## Tool Calls

```ts
for (const call of trace.toolCalls) {
  console.log(`${call.toolName} — ${call.durationMs}ms`);
  if (call.error) console.log(`  Error: ${call.error}`);
}
```

## Handoffs

```ts
for (const h of trace.handoffs) {
  console.log(`${h.fromAgent} → ${h.toAgent}: ${h.reason}`);
}
```

## Token Usage

```ts
console.log(`Total tokens: ${trace.tokenUsage.totalTokens}`);
console.log(`Prompt: ${trace.tokenUsage.promptTokens}`);
console.log(`Completion: ${trace.tokenUsage.completionTokens}`);
```

## Example Output

```
runId      : a784f207-0f33-43b3-9487-6c0d279b7330
agent      : codingAgent
duration   : 9872ms
steps      : 6
toolCalls  : 1  [fsWrite] 1ms
handoffs   : 1  codingAgent → reviewAgent
errors     : 0
tokens     : 16424 (prompt: 16056, completion: 368)
```
