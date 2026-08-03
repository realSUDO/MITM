import { HARNESS_PROMPT } from "../app/config.js";
import type { IMessage, ITool, Interceptor, IModelProvider } from "./types.js";
import { ToolError } from "./types.js";
import { validateToolInput } from "./validate.js";
import type { IMemoryAdapter } from "../memory/types.js";
import type { IInputGuardrail, IOutputGuardrail, IToolGuardrail } from "../guardrails/types.js";
import type { IOutputSchema } from "./schema.js";
import { validateOutput } from "./schema.js";
import type { HandoffTarget } from "./handoff.js";

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
	private memoryAdapter: IMemoryAdapter | undefined;
	private sessionId: string | undefined;
	private inputGuardrails: IInputGuardrail[] = [];
	private outputGuardrails: IOutputGuardrail[] = [];
	private toolGuardrails: IToolGuardrail[] = [];
	private outputSchema: IOutputSchema | undefined;
	private maxOutputRetries: number = 3;
	private agentName: string = "agent";
	private handoffTargets: Map<string, HandoffTarget> = new Map();

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

	public setMemory(adapter: IMemoryAdapter, sessionId: string) {
		this.memoryAdapter = adapter;
		this.sessionId = sessionId;
		return this;
	}

	public getMemoryAdapter() {
		return this.memoryAdapter;
	}

	public getSessionId() {
		return this.sessionId;
	}

	public addInputGuardrail(g: IInputGuardrail) {
		this.inputGuardrails.push(g);
		return this;
	}

	public addOutputGuardrail(g: IOutputGuardrail) {
		this.outputGuardrails.push(g);
		return this;
	}

	public addToolGuardrail(g: IToolGuardrail) {
		this.toolGuardrails.push(g);
		return this;
	}

	public getInputGuardrails() { return this.inputGuardrails; }
	public getOutputGuardrails() { return this.outputGuardrails; }
	public getToolGuardrails() { return this.toolGuardrails; }

	public setOutputSchema(schema: IOutputSchema, maxRetries = 3) {
		this.outputSchema = schema;
		this.maxOutputRetries = maxRetries;
		return this;
	}

	public getOutputSchema() { return this.outputSchema; }
	public getMaxOutputRetries() { return this.maxOutputRetries; }

	public setName(name: string) {
		this.agentName = name;
		return this;
	}

	public getName() { return this.agentName; }

	public addHandoffTarget(target: HandoffTarget) {
		this.handoffTargets.set(target.name, target);
		return this;
	}

	public getHandoffTargets() { return this.handoffTargets; }

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
	private memoryAdapter: IMemoryAdapter | undefined;
	private sessionId: string | undefined;
	private inputGuardrails: IInputGuardrail[];
	private outputGuardrails: IOutputGuardrail[];
	private toolGuardrails: IToolGuardrail[];
	private outputSchema: IOutputSchema | undefined;
	private maxOutputRetries: number;
	private agentName: string;
	private handoffTargets: Map<string, HandoffTarget>;

	constructor(builder: AgentBuilder) {
		if (!builder.getProvider()) {
			throw new Error(
				"[MITM] No model provider set. Call .setProvider(new OpenAIProvider()) on AgentBuilder.",
			);
		}

		this.provider = builder.getProvider()!;
		this.toolMap = new ToolMap();
		this.interceptors = [];
		this.memoryAdapter = builder.getMemoryAdapter();
		this.sessionId = builder.getSessionId();
		this.inputGuardrails = builder.getInputGuardrails();
		this.outputGuardrails = builder.getOutputGuardrails();
		this.toolGuardrails = builder.getToolGuardrails();
		this.outputSchema = builder.getOutputSchema();
		this.maxOutputRetries = builder.getMaxOutputRetries();
		this.agentName = builder.getName();
		this.handoffTargets = builder.getHandoffTargets();

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

	private async persistHistory(): Promise<void> {
		if (this.memoryAdapter && this.sessionId) {
			await this.memoryAdapter.set(this.sessionId, this.messageHistory);
		}
	}

	public printSystemPrompt() {
		console.log(this.instructions);
	}

	static builder() {
		return new AgentBuilder();
	}

	public async run(query: string, _handoffChain: string[] = []) {
		// --- loop detection ---
		if (_handoffChain.includes(this.agentName)) {
			return `[MITM] Handoff loop detected: ${[..._handoffChain, this.agentName].join(" → ")}`;
		}
		const handoffChain = [..._handoffChain, this.agentName];
		// --- input guardrails ---
		let effectiveQuery = query;
		for (const g of this.inputGuardrails) {
			const result = await g.run(effectiveQuery);
			if (result.action === "block") {
				return `[MITM] Input blocked by guardrail "${g.name}": ${result.reason}`;
			}
			if (result.action === "modify") {
				effectiveQuery = result.modified;
			}
		}

		// load session history
		if (this.memoryAdapter && this.sessionId) {
			this.messageHistory = await this.memoryAdapter.get(this.sessionId);
		}

		this.messageHistory.push({ role: "user", content: effectiveQuery });
		await this.persistHistory();

		for (let i = 0; i <= this.MAX_ITERATIONS; i++) {
			const rawResponse = await this.provider.chat(
				this.instructions,
				this.messageHistory,
			);

			this.messageHistory.push({ role: "assistant", content: rawResponse });
			this.notifyInterceptors({ role: "assistant", content: rawResponse });
			await this.persistHistory();

			const parsed = JSON.parse(rawResponse) as {
				step: string;
				content: string;
				tool_name?: string;
				input?: string;
			};

			if (parsed.step.toLowerCase() === "output") {
				// --- structured output validation ---
				if (this.outputSchema) {
					const validation = validateOutput(parsed.content, this.outputSchema);
					if (!validation.valid) {
						if (i < this.maxOutputRetries) {
							this.messageHistory.push({
								role: "developer",
								content: `Output schema validation failed. Errors: ${validation.errors.join(" ")} — Please output valid JSON matching the required schema and repeat the OUTPUT step.`,
							});
							await this.persistHistory();
							continue;
						}
					}
				}

				// --- output guardrails ---
				let finalOutput = parsed.content;
				for (const g of this.outputGuardrails) {
					const result = await g.run(finalOutput);
					if (result.action === "block") {
						return `[MITM] Output blocked by guardrail "${g.name}": ${result.reason}`;
					}
					if (result.action === "modify") {
						finalOutput = result.modified;
					}
				}
				return this.messageHistory;
			}

			if (parsed.step.toLowerCase() === "handoff") {
				const p = parsed as unknown as { step: string; agent: string; reason: string; content: string };
				const targetName = p.agent;
				const target = this.handoffTargets.get(targetName);

				if (!target) {
					this.messageHistory.push({
						role: "developer",
						content: `[MITM] Handoff failed: no agent named "${targetName}" is registered.`,
					});
					await this.persistHistory();
					continue;
				}

				this.notifyInterceptors({
					role: "developer",
					content: `[HANDOFF] ${this.agentName} → ${targetName}: ${p.reason}`,
				});

				const handoffQuery = `Context from ${this.agentName}: ${p.content}\n\nContinue the task: ${p.reason}`;
				return target.run(handoffQuery, handoffChain);
			}

			if (parsed.step.toLowerCase() === "tool_request") {
				const { tool_name, input } = parsed;
				if (!tool_name || !input) {
					throw new Error("[MITM] TOOL_REQUEST missing tool_name or input.");
				}

				// --- tool guardrails ---
				let effectiveInput = input;
				let toolBlocked = false;
				for (const g of this.toolGuardrails) {
					const result = await g.run(tool_name, effectiveInput);
					if (result.action === "block") {
						this.messageHistory.push({
							role: "developer",
							content: `ToolGuardrail "${g.name}" blocked tool "${tool_name}": ${result.reason}`,
						});
						await this.persistHistory();
						toolBlocked = true;
						break;
					}
					if (result.action === "modify") {
						effectiveInput = result.modified;
					}
				}
				if (toolBlocked) continue;

				const tool = this.toolMap.get(tool_name);
				if (!tool) {
					const err = new ToolError("tool-not-found", tool_name, `Tool "${tool_name}" not found.`);
					this.messageHistory.push({ role: "developer", content: `ToolError [${err.kind}]: ${err.message}` });
					await this.persistHistory();
					continue;
				}

				if (tool.inputSchema) {
					const validation = validateToolInput(effectiveInput, tool.inputSchema);
					if (!validation.valid) {
						const err = new ToolError("validation-failed", tool_name, validation.errors.join(" "));
						this.messageHistory.push({ role: "developer", content: `ToolError [${err.kind}] on "${tool_name}": ${err.message}` });
						await this.persistHistory();
						continue;
					}
				}

				let toolResult: string;
				try {
					toolResult = await tool.executor(effectiveInput);
				} catch (e) {
					const err = new ToolError("execution-error", tool_name, e instanceof Error ? e.message : String(e));
					this.messageHistory.push({ role: "developer", content: `ToolError [${err.kind}] on "${tool_name}": ${err.message}` });
					await this.persistHistory();
					continue;
				}

				const toolMessage: IMessage = {
					role: "developer",
					content: JSON.stringify({ tool_name, input: effectiveInput, toolResult }),
				};
				this.messageHistory.push(toolMessage);
				this.notifyInterceptors(toolMessage);
				await this.persistHistory();
				continue;
			}
		}
	}
}
