import type { TurnFacts, TurnLaunch } from "@sumi/agent-plugin";

type AgentLinkFacts = NonNullable<TurnFacts["link"]>;

const PROGRAM = "claude";
const FIXED_ARGS = [
	"-p",
	"--output-format",
	"stream-json",
	"--verbose",
	"--include-partial-messages",
	"--setting-sources",
	"user,project,local",
];
const REPLACED_BY_SUMI_TOOLS = [
	"AskUserQuestion",
	"Bash",
	"BashOutput",
	"KillShell",
	"KillBash",
	"Monitor",
	"Read",
	"Edit",
	"Write",
	"Glob",
	"Grep",
	"WebFetch",
	"WebSearch",
];
const TOOL_SEARCH = "ENABLE_TOOL_SEARCH";
const CLAUDE_TOOLS_LOADED_WHEN_ASKED = "true";
const END_OF_OPTIONS = "--";
const HOOK_TIMEOUT_SECONDS = 10;
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const MCP_TOOL_TIMEOUT = "MCP_TOOL_TIMEOUT";
const PERSON_ANSWER_MS = "86400000";
const NOTHING_TO_SEND = "There is nothing to send.";
const NOT_A_SESSION = "The conversation to resume is not a session id Claude Code takes.";
const BUILT_IN_TOOLS = [
	"Your own built-in tools work here too: Read, Edit, Write, Glob and Grep for files, Bash for commands, WebSearch to search the web and WebFetch to read a page.",
	"Some of them may be listed only by name until loaded: load one with ToolSearch before its first use instead of saying you do not have it.",
].join(" ");
const SUMI_TOOLS = [
	"Your own Bash, Read, Edit, Write, Glob, Grep, WebSearch and WebFetch are switched off here: Sumi's tools under mcp__agent-tools__ take their place.",
	"Files: agent-tools_files_get-text, _write, _edit, _find-paths (glob), _find-matches (grep), _get-image. Commands: agent-tools_shell_run, and _start, _get-output, _stop for processes that keep running.",
	"Web: agent-tools_web_search and _fetch-page. Also agent-tools_clock_get-now and _wait.",
].join(" ");
const ALWAYS_LOADED_SERVERS = ["agent-tools", "questions"];

export function claudeLaunchOf(facts: TurnFacts): TurnLaunch {
	if (facts.prompt.trim() === "") {
		throw new Error(NOTHING_TO_SEND);
	}

	if (facts.resume !== null && !SESSION_ID.test(facts.resume)) {
		throw new Error(NOT_A_SESSION);
	}

	return {
		program: PROGRAM,
		args: [
			...FIXED_ARGS,
			...folderArgsOf(facts),
			...choiceArgsOf(facts),
			"--append-system-prompt",
			systemPromptOf(facts),
			...(facts.link === null ? [] : linkArgsOf(facts.link, facts)),
			...(facts.resume === null ? [] : ["--resume", facts.resume]),
			END_OF_OPTIONS,
			facts.prompt,
		],
		env: {
			[MCP_TOOL_TIMEOUT]: PERSON_ANSWER_MS,
			...(facts.link === null ? {} : { [TOOL_SEARCH]: CLAUDE_TOOLS_LOADED_WHEN_ASKED }),
		},
	};
}

function folderArgsOf({ project, attachments, folders }: TurnFacts): string[] {
	return [project, attachments, ...folders].flatMap((folder) => ["--add-dir", folder]);
}

function choiceArgsOf({ model, options }: TurnFacts): string[] {
	const mode = options["mode"];
	const effort = options["effort"];

	if (model === null || mode === undefined || effort === undefined) {
		return [];
	}

	return ["--permission-mode", mode, "--model", model, "--effort", effort];
}

function systemPromptOf({ link }: TurnFacts): string {
	return link === null ? BUILT_IN_TOOLS : `${link.systemPrompt}\n\n${sumiToolsPromptOf(link.servers)}`;
}

function sumiToolsPromptOf(servers: readonly string[]): string {
	const loadedWhenAsked = servers.filter((server) => !ALWAYS_LOADED_SERVERS.includes(server));

	if (loadedWhenAsked.length === 0) {
		return SUMI_TOOLS;
	}

	return `${SUMI_TOOLS} Sumi also serves ${loadedWhenAsked.join(", ")}: their tools are listed by name only, so find and load one with ToolSearch before its first call.`;
}

function linkArgsOf(link: AgentLinkFacts, facts: TurnFacts): string[] {
	return [
		"--mcp-config",
		mcpConfigOf(link, facts),
		"--strict-mcp-config",
		"--allowedTools",
		link.servers.map((server) => `mcp__${server}`).join(","),
		"--disallowedTools",
		REPLACED_BY_SUMI_TOOLS.join(","),
		"--settings",
		hookSettingsOf(link),
	];
}

function mcpConfigOf(link: AgentLinkFacts, { project, model }: TurnFacts): string {
	const mcpServers = Object.fromEntries(
		link.servers.map((server) => [
			server,
			{
				command: link.exe,
				args: [
					link.mcpFlag,
					"--server",
					server,
					"--socket",
					link.socket,
					"--token",
					link.token,
					"--chat",
					link.chat,
					"--folder",
					project,
					...(model === null ? [] : ["--model", model]),
				],
				alwaysLoad: ALWAYS_LOADED_SERVERS.includes(server),
			},
		]),
	);
	return JSON.stringify({ mcpServers });
}

function hookSettingsOf(link: AgentLinkFacts): string {
	const command = [link.exe, link.hookFlag, "--socket", link.socket, "--token", link.token, "--chat", link.chat]
		.map(shellQuoted)
		.join(" ");
	return JSON.stringify({
		hooks: {
			PostToolUse: [
				{
					matcher: "*",
					hooks: [
						{
							type: "command",
							command,
							timeout: HOOK_TIMEOUT_SECONDS,
						},
					],
				},
			],
		},
	});
}

function shellQuoted(part: string): string {
	return `'${part.replaceAll("'", "'\\''")}'`;
}
