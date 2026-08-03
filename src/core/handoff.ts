import type { IMessage } from "./types.js";

export interface IHandoffContext {
	fromAgent: string;
	toAgent: string;
	reason: string;
	history: IMessage[];
}

export type HandoffRegistry = Map<string, HandoffTarget>;

export interface HandoffTarget {
	name: string;
	run: (query: string, handoffChain: string[]) => Promise<IMessage[] | string | undefined>;
}

export function createHandoffTool(
	targetAgentName: string,
	description: string,
) {
	return {
		name: `handoff_to_${targetAgentName}`,
		description,
		doc: `handoff_to_${targetAgentName}(input: string): string — input must be JSON: { "reason": string }`,
		inputSchema: {
			fields: {
				reason: { type: "string" as const, required: true, description: "Why you are handing off to this agent" },
			},
		},
		// executor is intentionally a stub — Agent.run() intercepts HANDOFF steps directly
		async executor(_input: string): Promise<string> {
			return `Handoff to ${targetAgentName} requested.`;
		},
	};
}
