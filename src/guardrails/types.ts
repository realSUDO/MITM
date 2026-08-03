export type GuardrailResult =
	| { action: "pass" }
	| { action: "block"; reason: string }
	| { action: "modify"; modified: string };

export interface IInputGuardrail {
	name: string;
	run(input: string): Promise<GuardrailResult>;
}

export interface IOutputGuardrail {
	name: string;
	run(output: string): Promise<GuardrailResult>;
}

export interface IToolGuardrail {
	name: string;
	run(toolName: string, input: string): Promise<GuardrailResult>;
}
