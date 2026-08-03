import { Agent } from "./app/agent.js";
import type { ITool } from "./app/agent.js";

const echoTool: ITool = {
	name: "echo",
	description: "Echoes back the input string as-is",
	doc: "echo(input: string): string",
	async executor(input) {
		return input;
	},
};

async function init() {
	const agent: Agent = Agent.builder()
		.setInstructions(`You're a joke specialist`)
		.tool(echoTool)
		.build();

	const result = await agent.run(
		"Can you echo back this string using tool call? 'lmao lmao lmao'",
	);
	console.log(result)
}
init();
