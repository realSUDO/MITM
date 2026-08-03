import { randomUUID } from "node:crypto";

export interface ITraceStep {
	index: number;
	step: string;
	content: string;
	timestampMs: number;
}

export interface IToolCall {
	toolName: string;
	input: string;
	result: string;
	durationMs: number;
	error?: string;
}

export interface IHandoffRecord {
	fromAgent: string;
	toAgent: string;
	reason: string;
	timestampMs: number;
}

export interface ITrace {
	runId: string;
	agentName: string;
	startTimeMs: number;
	endTimeMs: number | null;
	durationMs: number | null;
	steps: ITraceStep[];
	toolCalls: IToolCall[];
	handoffs: IHandoffRecord[];
	errors: string[];
	totalSteps: number;
	tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export function createTrace(agentName: string): ITrace {
	return {
		runId: randomUUID(),
		agentName,
		startTimeMs: Date.now(),
		endTimeMs: null,
		durationMs: null,
		steps: [],
		toolCalls: [],
		handoffs: [],
		errors: [],
		totalSteps: 0,
		tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
	};
}
