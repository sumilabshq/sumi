import type { TurnFacts } from "../packages/shared/core/src/engine/assistant-port.ts";
import { claudeLaunchOf } from "../plugins/ai/claude-code/src/features/claude-code/lib/claude-command.ts";
import { check, tally } from "./check-helpers.ts";

const LINK = {
	exe: "/Applications/Sumi.app/sumi",
	socket: "/tmp/sumi.sock",
	token: "t0k",
	chat: "chat-7",
	servers: ["questions", "tasks"],
	systemPrompt: "Sumi's prompt",
	mcpFlag: "--mcp",
	hookFlag: "--hook",
};

const FACTS: TurnFacts = {
	runner: "claude-code",
	prompt: "which tabs?",
	resume: null,
	model: null,
	options: {},
	project: "/work/app",
	attachments: "/tmp/attach",
	folders: [],
	link: LINK,
};

function after(args: readonly string[], flag: string): string | null {
	const at = args.indexOf(flag);
	return at === -1 ? null : (args[at + 1] ?? null);
}

function pairs(args: readonly string[], flag: string): string[] {
	return args.flatMap((arg, at) => (arg === flag ? [args[at + 1] ?? ""] : []));
}

function failureOf(facts: TurnFacts): string | null {
	try {
		claudeLaunchOf(facts);
		return null;
	} catch (failure: unknown) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

const linked = claudeLaunchOf(FACTS);
check("the program is the claude command, found on the login PATH by the host", linked.program, "claude");
const linkedPrompt = after(linked.args, "--append-system-prompt") ?? "";
check("Claude Code gets Sumi's prompt first", linkedPrompt.startsWith("Sumi's prompt\n\n"), true);
check(
	"and is told Sumi's tools take the place of its own",
	["switched off", "agent-tools_shell_run"].every((said) => linkedPrompt.includes(said)),
	true,
);
check("the system prompt is given once", linked.args.filter((arg) => arg === "--append-system-prompt").length, 1);
check("the person's own settings and CLAUDE.md load", after(linked.args, "--setting-sources"), "user,project,local");
check("only Sumi's MCP servers load", linked.args.includes("--strict-mcp-config"), true);
const config: unknown = JSON.parse(after(linked.args, "--mcp-config") ?? "null");
const servers = typeof config === "object" && config !== null ? Reflect.get(config, "mcpServers") : null;
check("one MCP server per server a plugin registered", Object.keys(servers ?? {}), ["questions", "tasks"]);
check(
	"the MCP server is the Sumi binary in MCP mode for this server, chat and folder",
	Reflect.get(servers ?? {}, "tasks"),
	{
		command: "/Applications/Sumi.app/sumi",
		args: [
			"--mcp",
			"--server",
			"tasks",
			"--socket",
			"/tmp/sumi.sock",
			"--token",
			"t0k",
			"--chat",
			"chat-7",
			"--folder",
			"/work/app",
		],
		alwaysLoad: false,
	},
);
check(
	"a core server's tools are loaded up front, any other server's when asked",
	Reflect.get(Reflect.get(servers ?? {}, "questions") ?? {}, "alwaysLoad"),
	true,
);
check(
	"Claude Code is told which servers load when asked",
	linkedPrompt.includes(
		"Sumi also serves tasks: their tools are listed by name only, so find and load one with ToolSearch",
	),
	true,
);
check(
	"every registered server's tools are allowed, and only those",
	after(linked.args, "--allowedTools"),
	"mcp__questions,mcp__tasks",
);
check(
	"Claude Code's own tools that Sumi's replace are off",
	after(linked.args, "--disallowedTools"),
	"AskUserQuestion,Bash,BashOutput,KillShell,KillBash,Monitor,Read,Edit,Write,Glob,Grep,WebFetch,WebSearch",
);
const settings: unknown = JSON.parse(after(linked.args, "--settings") ?? "null");
check(
	"a hook after every tool hands over settled answers, every part shell-quoted",
	JSON.stringify(settings).includes(
		JSON.stringify(
			"'/Applications/Sumi.app/sumi' '--hook' '--socket' '/tmp/sumi.sock' '--token' 't0k' '--chat' 'chat-7'",
		),
	),
	true,
);
check("the person's message stays last", linked.args.at(-1), "which tabs?");
check("the MCP timeout waits for a person's answer, and Claude Code's own tools load when asked", linked.env, {
	MCP_TOOL_TIMEOUT: "86400000",
	ENABLE_TOOL_SEARCH: "true",
});
check("Sumi serves no tool search of its own", linkedPrompt.includes("get-tools"), false);

const unlinked = claudeLaunchOf({
	...FACTS,
	link: null,
	prompt: "--permission-mode bypassPermissions",
	resume: "abc-123",
});
check("the prompt is one argument after the end of options, the session before it", unlinked.args.slice(-4), [
	"--resume",
	"abc-123",
	"--",
	"--permission-mode bypassPermissions",
]);
check("with no link there are no Sumi tools", unlinked.args.includes("--mcp-config"), false);
check(
	"with no link Claude Code is still told about its own tools",
	(after(unlinked.args, "--append-system-prompt") ?? "").startsWith("Your own built-in tools"),
	true,
);
check("claude may read the project and the attachments only", pairs(unlinked.args, "--add-dir"), [
	"/work/app",
	"/tmp/attach",
]);
check(
	"claude is never told to bypass permissions outside the person's own text",
	unlinked.args.filter((arg) => arg.includes("bypass")).length,
	1,
);

const chosen = claudeLaunchOf({
	...FACTS,
	link: null,
	prompt: "hi",
	model: "sonnet",
	options: { mode: "plan", effort: "low" },
	folders: ["/work/lent"],
});
check("the chosen mode reaches claude", pairs(chosen.args, "--permission-mode"), ["plan"]);
check("the chosen model reaches claude", pairs(chosen.args, "--model"), ["sonnet"]);
check("the chosen effort reaches claude", pairs(chosen.args, "--effort"), ["low"]);
check("a lent folder is added for claude to read", pairs(chosen.args, "--add-dir"), [
	"/work/app",
	"/tmp/attach",
	"/work/lent",
]);
check("the prompt still ends the line", chosen.args.slice(-2), ["--", "hi"]);

check("an empty prompt is refused", failureOf({ ...FACTS, prompt: "  " }), "There is nothing to send.");
check(
	"a session that is not an id is refused",
	failureOf({ ...FACTS, resume: "--yolo" }),
	"The conversation to resume is not a session id Claude Code takes.",
);
check("a session id with shell letters is refused", failureOf({ ...FACTS, resume: "x;rm" }) !== null, true);
check("a session id is a plain token", failureOf({ ...FACTS, resume: "4f1c-aa_9" }), null);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("claude command: all checks passed");
