# Structured Output

Force the agent to return a specific JSON shape. Invalid responses are automatically retried.

## Basic Usage

```ts
Agent.builder()
  .setOutputSchema({
    fields: {
      summary:  { type: "string",  required: true },
      success:  { type: "boolean", required: true },
      files:    { type: "array",   required: true },
    },
  })
  .build();
```

The agent's `OUTPUT` step content is validated against this schema. If validation fails, the error is fed back and the model retries.

## With Retry Count

```ts
.setOutputSchema(schema, 3) // retry up to 3 times
```

## Field Types

| type | JavaScript equivalent |
|---|---|
| `"string"` | `string` |
| `"number"` | `number` |
| `"boolean"` | `boolean` |
| `"array"` | `Array<any>` |
| `"object"` | `object` |

## Validation Errors

If all retries are exhausted, the run still completes — the last message in the history contains the model's best attempt. Check `trace.errors` to see validation failures.

## Custom Validation

Use `validateOutput` directly for manual validation:

```ts
import { validateOutput } from "mitm-ai";

const result = validateOutput(someString, schema);
if (!result.valid) {
  console.log(result.errors);
} else {
  console.log(result.data); // typed Record<string, unknown>
}
```
