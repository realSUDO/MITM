import { HARNESS_PROMPT } from "./config.js";
import openai, { OpenAI } from "openai";

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

	public build() {
		return new Agent(this);
	}
}

export class Agent {
	private instructions: string | undefined;
	private messageHistory: IMessage[];
	private toolMap: ToolMap;
	private MAX_ITERATIONS = 30;
	private openai: OpenAI;
	private interceptors: Interceptor[];

	constructor(builder: AgentBuilder) {
		this.toolMap = new ToolMap();
		this.interceptors = [];
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			baseURL: process.env.BASE_URL || "https://api.aicredits.in/v1",
		});

		for (const t of builder.getToolList() ?? []) {
			this.toolMap.register(t);
		}

		this.instructions = `
			${HARNESS_PROMPT}\n\n\n

			SYSTEM PROMPT : 
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
		// append query to message history
		this.messageHistory.push({ role: "user", content: query });

		for (let i = 0; i <= this.MAX_ITERATIONS; i++) {
			// .. LLMResponse=call the llm ( system prompt + message history + user query ) and get the response
			const llmResponse = await this.openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [
					{ role: "system", content: this.instructions ?? "" },
					...this.messageHistory.map((m) => ({
						role: m.role === "developer" ? "user" : m.role,
						content: m.content,
					})),
				],
			});

			const RawLLMResponse: string =
				llmResponse.choices[0]?.message?.content ?? ("" as string);

			// append LLMResponse to message history
			this.messageHistory.push({ role: "assistant", content: RawLLMResponse });
			this.notifyInterceptors({ role: "assistant", content: RawLLMResponse });

			const parsedLLMResponse = JSON.parse(RawLLMResponse) as {
				step: string;
				content: string;
				tool_name?: string;
				input?: string;
			};

			// if LLMResponse.step === "OUTPUT" then break
			if (parsedLLMResponse.step.toLowerCase() === "output")
				return this.messageHistory;

			// if LLMResponse.step === "TOOL_REQUEST" then call the tool and get the output and append it to message history ? how
			/**
				   * tool = ToolMap.find(LLMResponse.tool_name)
				   toolResult = tool.executor(LLMResponse.input)
				   Append toolResult to message history
				   continue 
				   *
				   */

			if (parsedLLMResponse.step.toLowerCase() === "tool_request") {
				const { tool_name, input } = parsedLLMResponse;
				if (!tool_name || !input) {
					throw new Error("Tool request must include tool_name and input.");
				}

				const tool = this.toolMap.get(tool_name);
				if (!tool) {
					this.messageHistory.push({
						role: "developer",
						content: `Error: Tool "${tool_name}" not found.`,
					});
					continue;
				}

				const toolResult = await tool.executor(input);
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
