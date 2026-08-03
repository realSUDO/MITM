import { Agent, OpenAIProvider, FileAdapter, InMemoryAdapter, createHandoffTool } from "./sdk.js";
import type { ITool, IInputGuardrail, IOutputGuardrail, IToolGuardrail } from "./sdk.js";
import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";

// ─────────────────────────────────────────────────────────────────────────────
// MITM SDK — Checkpoint 1-9 Verification Demo
// ─────────────────────────────────────────────────────────────────────────────

const sep = (label: string) => console.log(`\n${"─".repeat(60)}\n  ${label}\n${"─".repeat(60)}`);
const pass = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string) => console.log(`  ✗ ${msg}`);

// ─── CP1: Model Provider Abstraction ─────────────────────────────────────────
// OpenAIProvider wired via AgentBuilder.setProvider()

// ─── CP2: Tools + Input Schema + Typed Errors ────────────────────────────────

const cliTool: ITool = {
	name: "execCli",
	description: "Runs a CLI command and returns output",
	doc: "execCli(cmd: string): string",
	maxRetries: 1,         // CP9: per-tool retry
	timeoutMs: 10_000,     // CP9: per-tool timeout
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
	description: "Writes content to a file",
	doc: 'fsWrite(input: string) — JSON: { "path": string, "content": string }',
	inputSchema: {   // CP2: input schema validation
		fields: {
			path: { type: "string", required: true },
			content: { type: "string", required: true },
		},
	},
	async executor(input) {
		const { path, content } = JSON.parse(input) as { path: string; content: string };
		await writeFile(path, content, "utf-8");
		return `File written: ${path}`;
	},
};

// ─── CP4: Guardrails ─────────────────────────────────────────────────────────

const noDangerousInput: IInputGuardrail = {
	name: "no-dangerous-input",
	async run(input) {
		const blocked = ["rm -rf /", "sudo rm", "drop table"];
		const found = blocked.find((w) => input.toLowerCase().includes(w));
		if (found) return { action: "block", reason: `Blocked: "${found}"` };
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
			return { action: "block", reason: "rm -rf is not allowed." };
		}
		return { action: "pass" };
	},
};

// ─── CP6: Agents + Handoff ───────────────────────────────────────────────────

const provider = new OpenAIProvider();                    // CP1: provider abstraction
const fileMemory = new FileAdapter(".mitm-sessions");     // CP3: file-based session
const inMemory = new InMemoryAdapter();                   // CP3: in-memory session

// Review agent (receives handoff)
const reviewAgent = Agent.builder()
	.setName("reviewAgent")
	.setProvider(provider)
	.setInstructions("You are a code review expert. Run the code and report what happens.")
	.setMemory(inMemory, "review-session")                // CP3: memory
	.setMaxIterations(15)                                 // CP9: configurable iterations
	.tool(cliTool)
	.build();

// Coding agent (writes code, hands off)
const codingAgent = Agent.builder()
	.setName("codingAgent")
	.setProvider(provider)
	.setInstructions(
		"You are an expert coding agent. Write a Python script using fsWrite, " +
		"then hand off to 'reviewAgent' to run it and verify it works.",
	)
	.setMemory(fileMemory, "coding-session-demo")         // CP3: persistent memory
	.addInputGuardrail(noDangerousInput)                  // CP4: input guardrail
	.addOutputGuardrail(noSecretOutput)                   // CP4: output guardrail
	.addToolGuardrail(noRmTool)                           // CP4: tool guardrail
	.setTimeout(120_000)                                  // CP9: agent timeout
	.setMaxIterations(20)                                 // CP9: max iterations
	.setStuckLoopThreshold(4)                             // CP9: stuck loop prevention
	.tool(cliTool)
	.tool(fsWriteTool)
	.tool(createHandoffTool("reviewAgent", "Verify the written code runs correctly"))  // CP6: handoff tool
	.addHandoffTarget({
		name: "reviewAgent",
		run: (query, chain) => reviewAgent.run(query, chain),
	})
	.build();

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
	sep("MITM SDK — Checkpoint 1-9 Verification");

	// CP8: EventEmitter events
	codingAgent.on("step",      (e) => console.log(`  [codingAgent][${e.step}] ${e.content.slice(0, 80)}...`));
	codingAgent.on("tool:start",(e) => console.log(`  [codingAgent][tool:start] ${e.toolName}`));
	codingAgent.on("tool:end",  (e) => console.log(`  [codingAgent][tool:end]   ${e.toolName} (${e.durationMs}ms)`));
	codingAgent.on("handoff",   (e) => console.log(`  [codingAgent][handoff]    ${e.fromAgent} → ${e.toAgent}`));
	codingAgent.on("run:failed",(e) => console.log(`  [codingAgent][run:failed] ${e.error}`));

	reviewAgent.on("step",       (e) => console.log(`  [reviewAgent][${e.step}] ${e.content.slice(0, 80)}...`));
	reviewAgent.on("tool:end",   (e) => console.log(`  [reviewAgent][tool:end]  ${e.toolName} → ${e.result.slice(0, 60)}`));
	reviewAgent.on("run:complete",(e) => console.log(`  [reviewAgent][run:complete] ${e.history.length} messages`));

	sep("TEST 1: Guardrail blocks dangerous input (CP4)");
	const blockedResult = await codingAgent.run("Please run rm -rf / on my machine");
	if (typeof blockedResult === "string" && blockedResult.includes("blocked")) {
		pass("Input guardrail correctly blocked dangerous query");
	} else {
		fail("Input guardrail did NOT block dangerous query");
	}

	sep("TEST 2: Main run — tools + memory + handoff + events + trace (CP1-9)");
	const result = await codingAgent.run(
		"Write a Python script hello.py that prints 'MITM SDK Works!' then hand off to reviewAgent to run it with python3.",
	);

	if (Array.isArray(result)) {
		pass("Agent loop completed and returned message history");
		const last = result[result.length - 1];
		console.log(`\n  Final message:\n  ${last?.content?.slice(0, 200)}`);
	} else {
		fail(`Unexpected result: ${String(result).slice(0, 100)}`);
	}

	// CP7: Tracing
	sep("TEST 3: Trace verification (CP7)");
	const trace = codingAgent.getLastTrace();
	if (trace) {
		pass(`runId         : ${trace.runId}`);
		pass(`agent         : ${trace.agentName}`);
		pass(`duration      : ${trace.durationMs}ms`);
		pass(`steps         : ${trace.totalSteps}`);
		pass(`toolCalls     : ${trace.toolCalls.length}`);
		pass(`handoffs      : ${trace.handoffs.length}`);
		pass(`errors        : ${trace.errors.length}`);
		pass(`tokens total  : ${trace.tokenUsage.totalTokens} (prompt: ${trace.tokenUsage.promptTokens}, completion: ${trace.tokenUsage.completionTokens})`);
		if (trace.toolCalls.length > 0) {
			console.log("\n  Tool Calls:");
			for (const tc of trace.toolCalls) {
				console.log(`    [${tc.toolName}] ${tc.durationMs}ms${tc.error ? ` ✗ ${tc.error}` : " ✓"}`);
			}
		}
		if (trace.handoffs.length > 0) {
			console.log("\n  Handoffs:");
			for (const h of trace.handoffs) {
				console.log(`    ${h.fromAgent} → ${h.toAgent}: ${h.reason}`);
			}
		}
	} else {
		fail("No trace found");
	}

	// CP3: Session persistence check
	sep("TEST 4: Session file persistence (CP3)");
	const { existsSync } = await import("node:fs");
	const sessionFile = ".mitm-sessions/coding-session-demo.json";
	if (existsSync(sessionFile)) {
		pass(`Session persisted to ${sessionFile}`);
	} else {
		fail(`Session file not found: ${sessionFile}`);
	}

	sep("ALL TESTS DONE");
}

main().catch(console.error);
