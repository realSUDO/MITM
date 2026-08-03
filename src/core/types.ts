export interface IMessage {
	role: "user" | "assistant" | "developer";
	content: string;
}

export interface ITool {
	name: string;
	description: string;
	doc?: string;
	executor: (input: string) => Promise<string>;
}

export type Interceptor = (message: IMessage) => void;

export interface IModelProvider {
	chat(systemPrompt: string, history: IMessage[]): Promise<string>;
}
