import type { IMessage } from "../core/types.js";

export interface IMemoryAdapter {
	get(sessionId: string): Promise<IMessage[]>;
	set(sessionId: string, history: IMessage[]): Promise<void>;
	clear(sessionId: string): Promise<void>;
}
