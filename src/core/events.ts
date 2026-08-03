import type { IMessage } from "./types.js";
import type { ITrace } from "./trace.js";

export interface StepEvent {
	step: string;
	content: string;
	raw: string;
}

export interface ToolStartEvent {
	toolName: string;
	input: string;
}

export interface ToolEndEvent {
	toolName: string;
	input: string;
	result: string;
	durationMs: number;
}

export interface ToolErrorEvent {
	toolName: string;
	input: string;
	error: string;
}

export interface HandoffEvent {
	fromAgent: string;
	toAgent: string;
	reason: string;
}

export interface GuardrailTriggeredEvent {
	guardrailName: string;
	kind: "input" | "output" | "tool";
	action: "block" | "modify";
	reason?: string;
}

export interface RunCompleteEvent {
	history: IMessage[];
	trace: ITrace;
}

export interface RunFailedEvent {
	error: string;
	trace: ITrace;
}

export interface MITMEventMap {
	step: [StepEvent];
	"tool:start": [ToolStartEvent];
	"tool:end": [ToolEndEvent];
	"tool:error": [ToolErrorEvent];
	handoff: [HandoffEvent];
	"guardrail:triggered": [GuardrailTriggeredEvent];
	"run:complete": [RunCompleteEvent];
	"run:failed": [RunFailedEvent];
}
