import { Agent, OpenAIProvider, FileAdapter } from "./sdk.js";
import type { ITool, IInputGuardrail, IOutputGuardrail, IToolGuardrail } from "./sdk.js";
import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";

// --- sample guardrails ---

const noProfanityInput: IInputGuardrail = {
	name: "no-profanity-input",
	async run(input) {
		const blocked = ["rm -rf", "sudo rm", "drop table", "delete from"];
		const found = blocked.find((w) => input.toLowerCase().includes(w));
		if (found) return { action: "block", reason: `Blocked phrase detected: "${found}"` };
		return { action: "pass" };
	},
};

const noSecretOutput: IOutputGuardrail = {
	name: "no-secret-output",
	async run(output) {
		if (/api[_-]?key\s*[:=]\s*\S+/i.test(output)) {
			return { action: "modify", modified: output.replace(/api[_-]?key\s*[:=]\s*\S+/gi, "API_KEY=[REDACTED]") };
		}
		return { action: "pass" };
	},
};

const noRmTool: IToolGuardrail = {
	name: "no-rm-rf",
	async run(toolName, input) {
		if (toolName === "execCli" && /rm\s+-rf/i.test(input)) {
			return { action: "block", reason: "Destructive rm -rf command is not allowed." };
		}
		return { action: "pass" };
	},
};

const echoTool: ITool = {
	name: "echo",
	description: "Echoes back the input string as-is",
	doc: "echo(input: string): string",
	async executor(input) {
		return input;
	},
};

const cliAccessTool: ITool = {
	name: "execCli",
	description: "Runs a CLI command on user's machine and returns output",
	doc: "execCli(cmd: string): string",
	executor(cmd) {
		return new Promise((resolve) => {
			exec(cmd, (error, stdout, stderr) => {
				if (error) return resolve(`Error: ${error.message}`);
				if (stderr) return resolve(`Stderr: ${stderr}`);
				resolve(stdout);
			});
		});
	},
};

const fsWriteTool: ITool = {
	name: "fsWrite",
	description: "Writes content to a file on the user's machine",
	doc: 'fsWrite(input: string): string — input must be JSON: { "path": string, "content": string }',
	inputSchema: {
		fields: {
			path: { type: "string", description: "File path to write to", required: true },
			content: { type: "string", description: "Content to write", required: true },
		},
	},
	async executor(input) {
		const { path, content } = JSON.parse(input) as { path: string; content: string };
		await writeFile(path, content, "utf-8");
		return `File written successfully: ${path}`;
	},
};

async function init() {
	const memory = new FileAdapter(".mitm-sessions");
	const sessionId = "demo-session-001";

	const agent = Agent.builder()
		.setProvider(new OpenAIProvider())
		.setInstructions("You are an expert coding agent.")
		.setMemory(memory, sessionId)
		.addInputGuardrail(noProfanityInput)
		.addOutputGuardrail(noSecretOutput)
		.addToolGuardrail(noRmTool)
		.tool(cliAccessTool)
		.tool(fsWriteTool)
		.build();

	agent.attachInterceptor((message) =>
		console.log(`[${message.role}]: ${message.content}`),
	);

	const result = await agent.run(
		"Can you build a simple hello world program in c++ as hello.cpp and compile it using g++ to check if it works.",
	);
	console.log(result?.[result.length - 1]);
}
init();
