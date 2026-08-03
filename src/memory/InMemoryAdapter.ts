import type { IMessage } from "../core/types.js";
import type { IMemoryAdapter } from "./types.js";

export class InMemoryAdapter implements IMemoryAdapter {
	private store: Map<string, IMessage[]> = new Map();

	async get(sessionId: string): Promise<IMessage[]> {
		return this.store.get(sessionId) ?? [];
	}

	async set(sessionId: string, history: IMessage[]): Promise<void> {
		this.store.set(sessionId, history);
	}

	async clear(sessionId: string): Promise<void> {
		this.store.delete(sessionId);
	}
}
