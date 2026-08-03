# Interfaces

## IMessage

```ts
interface IMessage {
  role: "user" | "assistant" | "developer";
  content: string;
}
```

## ITool

```ts
interface ITool {
  name: string;
  description: string;
  doc?: string;
  inputSchema?: IToolInputSchema;
  maxRetries?: number;
  timeoutMs?: number;
  executor: (input: string) => Promise<string>;
}
```

## IModelProvider

```ts
interface IModelProvider {
  chat(systemPrompt: string, history: IMessage[]): Promise<IModelResponse>;
}
```

## IModelResponse

```ts
interface IModelResponse {
  text: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}
```

## IMemoryAdapter

```ts
interface IMemoryAdapter {
  get(sessionId: string): Promise<IMessage[]>;
  set(sessionId: string, history: IMessage[]): Promise<void>;
  clear(sessionId: string): Promise<void>;
}
```

## IInputGuardrail / IOutputGuardrail / IToolGuardrail

```ts
interface IInputGuardrail {
  name: string;
  run(input: string): Promise<GuardrailResult>;
}

interface IOutputGuardrail {
  name: string;
  run(output: string): Promise<GuardrailResult>;
}

interface IToolGuardrail {
  name: string;
  run(toolName: string, input: string): Promise<GuardrailResult>;
}

type GuardrailResult =
  | { action: "pass" }
  | { action: "block"; reason: string }
  | { action: "modify"; modified: string };
```

## IOutputSchema

```ts
interface IOutputSchema {
  fields: Record<string, {
    type: "string" | "number" | "boolean" | "array" | "object";
    description?: string;
    required?: boolean;
  }>;
}
```

## ITrace

```ts
interface ITrace {
  runId: string;
  agentName: string;
  startTimeMs: number;
  endTimeMs: number | null;
  durationMs: number | null;
  totalSteps: number;
  steps: ITraceStep[];
  toolCalls: IToolCall[];
  handoffs: IHandoffRecord[];
  errors: string[];
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}
```

## HandoffTarget

```ts
interface HandoffTarget {
  name: string;
  run: (query: string, chain: string[]) => Promise<IMessage[] | string | undefined>;
}
```
