# Tools

Tools are the actions your agent can take. Each tool has a name, description, and an async executor function.

## Defining a Tool

```ts
import type { ITool } from "mitm-ai";

const fetchTool: ITool = {
  name: "fetchUrl",
  description: "Fetches the content of a URL",
  doc: "fetchUrl(url: string): string",
  async executor(input) {
    const res = await fetch(input);
    return await res.text();
  },
};
```

## Input Schema Validation

Add an `inputSchema` to validate the model's input before your executor runs:

```ts
const writeTool: ITool = {
  name: "fsWrite",
  description: "Writes content to a file",
  doc: 'fsWrite(input: string) — JSON: { "path": string, "content": string }',
  inputSchema: {
    fields: {
      path:    { type: "string", required: true,  description: "File path" },
      content: { type: "string", required: true,  description: "File content" },
    },
  },
  async executor(input) {
    const { path, content } = JSON.parse(input);
    await fs.writeFile(path, content, "utf-8");
    return `Written: ${path}`;
  },
};
```

If validation fails, the error is fed back to the model automatically so it can fix its input and retry.

## Retries and Timeouts

```ts
const flakeyTool: ITool = {
  name: "callApi",
  description: "Calls an external API",
  maxRetries: 2,       // retry up to 2 times on failure
  timeoutMs: 5000,     // abort after 5 seconds
  async executor(input) {
    const res = await fetch(`https://api.example.com/${input}`);
    return await res.json();
  },
};
```

## Registering Tools

```ts
Agent.builder()
  .tool(fetchTool)
  .tool(writeTool)
  .tool(flakeyTool)
  .build();
```

Tools are chainable. Register as many as you need.

## Typed Errors

When a tool fails, the SDK throws a `ToolError` with a typed `kind`:

| kind | when |
|---|---|
| `tool-not-found` | Model requested a tool that isn't registered |
| `validation-failed` | Input didn't match `inputSchema` |
| `execution-error` | Executor threw an error |

All errors are fed back to the model as `developer` messages so it can recover.
