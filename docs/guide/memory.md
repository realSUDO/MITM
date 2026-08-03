# Memory & Sessions

MITM supports multi-turn conversations through pluggable memory adapters. The agent loads previous history at the start of each `run()` and saves it after every message.

## Built-in Adapters

### InMemoryAdapter

Lives in process memory. Lost on restart. Good for short-lived sessions.

```ts
import { InMemoryAdapter } from "mitm-ai";

Agent.builder()
  .setMemory(new InMemoryAdapter(), "user-123")
  .build();
```

### FileAdapter

Persists each session as a JSON file. Survives restarts.

```ts
import { FileAdapter } from "mitm-ai";

Agent.builder()
  .setMemory(new FileAdapter(".mitm-sessions"), "user-123")
  .build();
```

Files are stored as `.mitm-sessions/user-123.json`.

## Custom Adapter

Implement `IMemoryAdapter` to connect any storage backend — SQLite, Redis, Postgres:

```ts
import type { IMemoryAdapter, IMessage } from "mitm-ai";

class RedisAdapter implements IMemoryAdapter {
  async get(sessionId: string): Promise<IMessage[]> {
    const raw = await redis.get(sessionId);
    return raw ? JSON.parse(raw) : [];
  }
  async set(sessionId: string, history: IMessage[]): Promise<void> {
    await redis.set(sessionId, JSON.stringify(history));
  }
  async clear(sessionId: string): Promise<void> {
    await redis.del(sessionId);
  }
}

Agent.builder()
  .setMemory(new RedisAdapter(), "user-123")
  .build();
```

## Session Isolation

Each agent instance is scoped to a `sessionId`. Multiple agents can share a memory adapter but must use different session IDs.

```ts
const memory = new FileAdapter();

const agentA = Agent.builder().setMemory(memory, "session-a").build();
const agentB = Agent.builder().setMemory(memory, "session-b").build();
```
