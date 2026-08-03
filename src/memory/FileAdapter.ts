import { readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { IMessage } from "../core/types.js";
import type { IMemoryAdapter } from "./types.js";

export class FileAdapter implements IMemoryAdapter {
	private dir: string;

	constructor(dir = ".mitm-sessions") {
		this.dir = dir;
	}

	private filePath(sessionId: string): string {
		return join(this.dir, `${sessionId}.json`);
	}

	async get(sessionId: string): Promise<IMessage[]> {
		const path = this.filePath(sessionId);
		if (!existsSync(path)) return [];
		const raw = await readFile(path, "utf-8");
		return JSON.parse(raw) as IMessage[];
	}

	async set(sessionId: string, history: IMessage[]): Promise<void> {
		const { mkdir } = await import("node:fs/promises");
		await mkdir(this.dir, { recursive: true });
		await writeFile(this.filePath(sessionId), JSON.stringify(history, null, 2), "utf-8");
	}

	async clear(sessionId: string): Promise<void> {
		const path = this.filePath(sessionId);
		if (existsSync(path)) await unlink(path);
	}
}
