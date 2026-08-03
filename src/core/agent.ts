import { HARNESS_PROMPT } from "../app/config.js";
import type { IMessage, ITool, Interceptor, IModelProvider } from "./types.js";
import { ToolError } from "./types.js";
import { validateToolInput } from "./validate.js";

export class ToolMap {
	private map: Map<string, ITool> = new Map();

	register(tool: ITool): this {
		this.map.set(tool.name, tool);
		return this;
	}

	get(name: string): ITool | undefined {
		return this.map.get(name);
	}

	all(): ITool[] {
		return Array.from(this.map.values());
	}

	toPromptString(): string {
		return this.all()
			.map((t) =>
				JSON.stringify({
					functionName: t.name,
					functionDescription: t.description,
					functionDoc: t.doc,
				}),
			)
			.join("\n");
	}
}

export class AgentBuilder {
	private instructions: string | undefined;
	private toolList: ITool[] | undefined;
	private provider: IModelProvider | undefined;

	constructor() {
		this.toolList = [];
	}

	public tool(t: ITool) {
		this.toolList?.push(t);
		return this;
	}

	public getToolList() {
		return this.toolList;
	}

	public setInstructions(instructions: string) {
		this.instructions = instructions;
		return this;
	}

	public getInstructions() {
		return this.instructions;
	}

	public setProvider(provider: IModelProvider) {
		this.provider = provider;
		return this;
	}

	public getProvider() {
		return this.provider;
	}

	public build() {
		return new Agent(this);
	}
}

export class Agent {
	private instructions: string;
	private messageHistory: IMessage[];
	private toolMap: ToolMap;
	private MAX_ITERATIONS = 30;
	private provider: IModelProvider;
	private interceptors: Interceptor[];

	constructor(builder: AgentBuilder) {
		if (!builder.getProvider()) {
			throw new Error(
				"[MITM] No model provider set. Call .setProvider(new OpenAIProvider()) on AgentBuilder.",
			);
		}

		this.provider = builder.getProvider()!;
		this.toolMap = new ToolMap();
		this.interceptors = [];

		for (const t of builder.getToolList() ?? []) {
			this.toolMap.register(t);
		}

		this.instructions = `
			${HARNESS_PROMPT}\n\n\n

			SYSTEM PROMPT:
			${builder.getInstructions() ?? ""}

			AVAILABLE TOOLS:
			${this.toolMap.toPromptString()}
`;
		this.messageHistory = [];
	}

	public attachInterceptor(interceptor: Interceptor) {
		this.interceptors.push(interceptor);
		return this;
	}

	private notifyInterceptors(message: IMessage) {
		for (const interceptor of this.interceptors) {
			interceptor(message);
		}
	}

	public printSystemPrompt() {
		console.log(this.instructions);
	}

	static builder() {
		return new AgentBuilder();
	}

	public async run(query: string) {
		this.messageHistory.push({ role: "user", content: query });

		for (let i = 0; i <= this.MAX_ITERATIONS; i++) {
			const rawResponse = await this.provider.chat(
				this.instructions,
				this.messageHistory,
			);

			this.messageHistory.push({ role: "assistant", content: rawResponse });
			this.notifyInterceptors({ role: "assistant", content: rawResponse });

			const parsed = JSON.parse(rawResponse) as {
				step: string;
				content: string;
				tool_name?: string;
				input?: string;
			};

			if (parsed.step.toLowerCase() === "output") return this.messageHistory;

			if (parsed.step.toLowerCase() === "tool_request") {
				const { tool_name, input } = parsed;
				if (!tool_name || !input) {
					throw new Error("[MITM] TOOL_REQUEST missing tool_name or input.");
				}

				const tool = this.toolMap.get(tool_name);
				if (!tool) {
					const err = new ToolError("tool-not-found", tool_name, `Tool "${tool_name}" not found.`);
					this.messageHistory.push({ role: "developer", content: `ToolError [${err.kind}]: ${err.message}` });
					continue;
				}

				if (tool.inputSchema) {
					const validation = validateToolInput(input, tool.inputSchema);
					if (!validation.valid) {
						const err = new ToolError("validation-failed", tool_name, validation.errors.join(" "));
						this.messageHistory.push({ role: "developer", content: `ToolError [${err.kind}] on "${tool_name}": ${err.message}` });
						continue;
					}
				}

				let toolResult: string;
				try {
					toolResult = await tool.executor(input);
				} catch (e) {
					const err = new ToolError("execution-error", tool_name, e instanceof Error ? e.message : String(e));
					this.messageHistory.push({ role: "developer", content: `ToolError [${err.kind}] on "${tool_name}": ${err.message}` });
					continue;
				}

				const toolMessage: IMessage = {
					role: "developer",
					content: JSON.stringify({ tool_name, input, toolResult }),
				};
				this.messageHistory.push(toolMessage);
				this.notifyInterceptors(toolMessage);
				continue;
			}
		}
	}
}
