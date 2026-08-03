# Agent Handoffs

Handoffs let one agent delegate a task to another. Context is preserved across the transfer.

## Setup

```ts
import { Agent, OpenAIProvider, createHandoffTool } from "mitm-ai";

const provider = new OpenAIProvider();

// The agent that receives the handoff
const reviewAgent = Agent.builder()
  .setName("reviewAgent")
  .setProvider(provider)
  .setInstructions("You are a code review expert. Run code and report findings.")
  .tool(cliTool)
  .build();

// The agent that initiates the handoff
const codingAgent = Agent.builder()
  .setName("codingAgent")
  .setProvider(provider)
  .setInstructions("Write code, then hand off to reviewAgent to verify it.")
  .tool(fsWriteTool)
  .tool(createHandoffTool("reviewAgent", "Hand off to verify the written code"))
  .addHandoffTarget({
    name: "reviewAgent",
    run: (query, chain) => reviewAgent.run(query, chain),
  })
  .build();
```

## How It Works

When the coding agent decides to hand off, it outputs a `HANDOFF` step:

```json
{
  "step": "HANDOFF",
  "agent": "reviewAgent",
  "reason": "Code written, needs verification",
  "content": "Created hello.py that prints Hello World"
}
```

The SDK:
1. Looks up `reviewAgent` in the handoff registry
2. Passes the context summary + reason as the new query
3. Calls `reviewAgent.run()` with the handoff chain

## Loop Prevention

Handoff chains are tracked automatically. If agent A hands off to B which tries to hand off back to A:

```
[MITM] Handoff loop detected: codingAgent → reviewAgent → codingAgent
```

The chain is broken and an error is returned.

## Observing Handoffs

```ts
codingAgent.on("handoff", (e) => {
  console.log(`${e.fromAgent} → ${e.toAgent}: ${e.reason}`);
});
```

Handoffs also appear in the trace:

```ts
const trace = codingAgent.getLastTrace();
console.log(trace.handoffs);
// [{ fromAgent, toAgent, reason, timestampMs }]
```
