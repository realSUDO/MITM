export interface IMessage {
	role: "user" | "assistant" | "developer";
	content: string;
}

export interface IToolInputField {
	type: "string" | "number" | "boolean" | "object";
	description?: string;
	required?: boolean;
}

export interface IToolInputSchema {
	fields: Record<string, IToolInputField>;
}

export interface ITool {
	name: string;
	description: string;
	doc?: string;
	inputSchema?: IToolInputSchema;
	executor: (input: string) => Promise<string>;
}

export type Interceptor = (message: IMessage) => void;

export interface IModelProvider {
	chat(systemPrompt: string, history: IMessage[]): Promise<string>;
}

export type ToolErrorKind = "tool-not-found" | "validation-failed" | "execution-error";

export class ToolError extends Error {
	kind: ToolErrorKind;
	toolName: string;

	constructor(kind: ToolErrorKind, toolName: string, message: string) {
		super(message);
		this.name = "ToolError";
		this.kind = kind;
		this.toolName = toolName;
	}
}
