import { agent } from "@sumi/agent-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import { CLAUDE_CODE_RUNNER } from "./features/claude-code/lib/claude-code-runner.js";
import metadata from "../metadata.json" with { type: "json" };

export const claudeCode = plugin("claude-code")
	.describe(metadata)
	.require(agent)
	.apply((app) => {
		app.use(agent).addRunner(CLAUDE_CODE_RUNNER);
	});
