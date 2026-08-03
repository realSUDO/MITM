import { OpenAI } from "openai";
import type { IMessage, IModelProvider, IModelResponse } from "../core/types.js";

export interface OpenAIProviderOptions {
	apiKey?: string;
	baseURL?: string;
	model?: string;
}

export class OpenAIProvider implements IModelProvider {
	private client: OpenAI;
	private model: string;

	constructor(options: OpenAIProviderOptions = {}) {
		this.client = new OpenAI({
			apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
			baseURL: options.baseURL ?? process.env.BASE_URL ?? "https://api.openai.com/v1",
		});
		this.model = options.model ?? "gpt-4o-mini";
	}

	async chat(systemPrompt: string, history: IMessage[]): Promise<IModelResponse> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: [
				{ role: "system", content: systemPrompt },
				...history.map((m) => ({
					role: m.role === "developer" ? ("user" as const) : m.role,
					content: m.content,
				})),
			],
		});
		return {
			text: response.choices[0]?.message?.content ?? "",
			usage: {
				promptTokens: response.usage?.prompt_tokens ?? 0,
				completionTokens: response.usage?.completion_tokens ?? 0,
				totalTokens: response.usage?.total_tokens ?? 0,
			},
		};
	}
}
