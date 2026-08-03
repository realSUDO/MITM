# Quick Start

## Installation

```bash
npm install mitm-ai
```

Set your API key:

```bash
export OPENAI_API_KEY=sk-...
```

## Your First Agent

```ts
import { Agent, OpenAIProvider } from "mitm-ai";
import type { ITool } from "mitm-ai";

const echoTool: ITool = {
  name: "echo",
  description: "Echoes back the input string",
  doc: "echo(input: string): string",
  async executor(input) {
    return input;
  },
};

const agent = Agent.builder()
  .setName("myAgent")
  .setProvider(new OpenAIProvider())
  .setInstructions("You are a helpful assistant.")
  .tool(echoTool)
  .build();

agent.on("step", (e) => console.log(`[${e.step}]`, e.content));

const result = await agent.run("Echo back: hello world");
console.log(result);
```

## What Happens

1. The agent receives your query
2. It reasons through the problem step by step (INITIAL → BREAKDOWN → THINKING → ANALYZE)
3. When it needs a tool, it fires `TOOL_REQUEST` — the SDK dispatches it automatically
4. The tool result goes back into the conversation
5. When done, it outputs `OUTPUT` and the run completes

## Next Steps

- [Add tools with input validation](/guide/tools)
- [Persist sessions with memory](/guide/memory)
- [Add guardrails for safety](/guide/guardrails)
- [Build multi-agent systems with handoffs](/guide/handoffs)
