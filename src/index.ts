import { Agent, OpenAIProvider, FileAdapter, createHandoffTool } from "./sdk.js";
import type { ITool, IInputGuardrail, IOutputGuardrail, IToolGuardrail } from "./sdk.js";
import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";

// ─── Tools ────────────────────────────────────────────────────────────────────

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
			path: { type: "string", required: true, description: "File path to write to" },
			content: { type: "string", required: true, description: "Content to write" },
		},
	},
	async executor(input) {
		const { path, content } = JSON.parse(input) as { path: string; content: string };
		await writeFile(path, content, "utf-8");
		return `File written successfully: ${path}`;
	},
};

// ─── Guardrails ───────────────────────────────────────────────────────────────

const noDangerousInput: IInputGuardrail = {
	name: "no-dangerous-input",
	async run(input) {
		const blocked = ["rm -rf /", "sudo rm", "drop table", "delete from"];
		const found = blocked.find((w) => input.toLowerCase().includes(w));
		if (found) return { action: "block", reason: `Blocked phrase: "${found}"` };
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
			return { action: "block", reason: "Destructive rm -rf is not allowed." };
		}
		return { action: "pass" };
	},
};

// ─── Agents ───────────────────────────────────────────────────────────────────

const provider = new OpenAIProvider();
const memory = new FileAdapter(".mitm-sessions");

// Review agent — receives handoff from coding agent to verify the output
const reviewAgent = Agent.builder()
	.setName("reviewAgent")
	.setProvider(provider)
	.setInstructions(
		"You are a code review expert. You verify that code files exist, compile correctly, and run as expected. Report your findings clearly.",
	)
	.tool(cliAccessTool)
	.build();

// Coding agent — writes code, then hands off to reviewAgent
const codingAgent = Agent.builder()
	.setName("codingAgent")
	.setProvider(provider)
	.setInstructions(
		"You are an expert coding agent. Write code using fsWrite, then hand off to 'reviewAgent' to verify the result.",
	)
	.setMemory(memory, "coding-session-001")
	.addInputGuardrail(noDangerousInput)
	.addOutputGuardrail(noSecretOutput)
	.addToolGuardrail(noRmTool)
	.tool(cliAccessTool)
	.tool(fsWriteTool)
	.tool(createHandoffTool("reviewAgent", "Hand off to the review agent to verify the written code compiles and runs correctly"))
	.addHandoffTarget({
		name: "reviewAgent",
		run: (query, chain) => reviewAgent.run(query, chain),
	})
	.build();

// ─── Run ──────────────────────────────────────────────────────────────────────

async function init() {
	codingAgent.on("step", (e) =>
		console.log(`[codingAgent][${e.step}]: ${e.content}`),
	);

	codingAgent.on("tool:start", (e) =>
		console.log(`[codingAgent][tool:start] ${e.toolName}(${e.input})`),
	);

	codingAgent.on("tool:end", (e) =>
		console.log(`[codingAgent][tool:end] ${e.toolName} → ${e.result} (${e.durationMs}ms)`),
	);

	codingAgent.on("handoff", (e) =>
		console.log(`[codingAgent][handoff] ${e.fromAgent} → ${e.toAgent}: ${e.reason}`),
	);

	codingAgent.on("run:complete", (e) =>
		console.log(`[codingAgent][run:complete] ${e.history.length} messages`),
	);

	reviewAgent.on("step", (e) =>
		console.log(`[reviewAgent][${e.step}]: ${e.content}`),
	);

	reviewAgent.on("run:complete", (e) =>
		console.log(`[reviewAgent][run:complete] ${e.history.length} messages`),
	);

	const result = await codingAgent.run(
		"Write a hello world Python script as hello.py, then hand off to the review agent to run it with python3 and confirm it works.",
	);

	if (Array.isArray(result)) {
		console.log("\n=== FINAL OUTPUT ===");
		console.log(result[result.length - 1]);
	} else {
		console.log("\n=== RESULT ===");
		console.log(result);
	}

	const trace = codingAgent.getLastTrace();
	if (trace) {
		console.log("\n=== TRACE ===");
		console.log(`runId      : ${trace.runId}`);
		console.log(`agent      : ${trace.agentName}`);
		console.log(`duration   : ${trace.durationMs}ms`);
		console.log(`steps      : ${trace.totalSteps}`);
		console.log(`toolCalls  : ${trace.toolCalls.length}`);
		console.log(`handoffs   : ${trace.handoffs.length}`);
		console.log(`errors     : ${trace.errors.length}`);
		console.log(`tokens     : ${trace.tokenUsage.totalTokens} (prompt: ${trace.tokenUsage.promptTokens}, completion: ${trace.tokenUsage.completionTokens})`);
		if (trace.toolCalls.length > 0) {
			console.log("\nTool Calls:");
			for (const tc of trace.toolCalls) {
				console.log(`  [${tc.toolName}] ${tc.durationMs}ms${tc.error ? ` ERROR: ${tc.error}` : ""}`);
			}
		}
		if (trace.handoffs.length > 0) {
			console.log("\nHandoffs:");
			for (const h of trace.handoffs) {
				console.log(`  ${h.fromAgent} → ${h.toAgent}: ${h.reason}`);
			}
		}
	}
}

init();
