# Guardrails

Guardrails add a safety and validation layer at three points in the agent lifecycle.

## Input Guardrails

Run before the agent loop starts. Can block, modify, or pass through the user query.

```ts
import type { IInputGuardrail } from "mitm-ai";

const profanityFilter: IInputGuardrail = {
  name: "profanity-filter",
  async run(input) {
    if (input.includes("badword")) {
      return { action: "block", reason: "Profanity detected" };
    }
    return { action: "pass" };
  },
};

// Or modify the input before it reaches the agent:
const sanitizer: IInputGuardrail = {
  name: "sanitizer",
  async run(input) {
    return { action: "modify", modified: input.trim().toLowerCase() };
  },
};
```

## Output Guardrails

Run on the final `OUTPUT` content before it's returned.

```ts
import type { IOutputGuardrail } from "mitm-ai";

const redactSecrets: IOutputGuardrail = {
  name: "redact-secrets",
  async run(output) {
    const redacted = output.replace(/sk-[A-Za-z0-9]+/g, "[REDACTED]");
    return { action: "modify", modified: redacted };
  },
};
```

## Tool Guardrails

Run before every tool executor call. Inspect or block tool usage.

```ts
import type { IToolGuardrail } from "mitm-ai";

const noDestructive: IToolGuardrail = {
  name: "no-destructive-commands",
  async run(toolName, input) {
    if (toolName === "execCli" && /rm\s+-rf/i.test(input)) {
      return { action: "block", reason: "Destructive commands not allowed" };
    }
    return { action: "pass" };
  },
};
```

## Registering Guardrails

```ts
Agent.builder()
  .addInputGuardrail(profanityFilter)
  .addInputGuardrail(sanitizer)       // multiple guardrails run in order
  .addOutputGuardrail(redactSecrets)
  .addToolGuardrail(noDestructive)
  .build();
```

## GuardrailResult

Every guardrail returns one of three actions:

| action | effect |
|---|---|
| `{ action: "pass" }` | Allow through unchanged |
| `{ action: "block", reason: string }` | Abort run, return blocked message |
| `{ action: "modify", modified: string }` | Replace with modified value and continue |
