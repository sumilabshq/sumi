import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { StreamPart } from "../packages/shared/core/src/engine/provider-stream.ts";
import { claudeLaunchOf } from "../plugins/ai/claude-code/src/features/claude-code/lib/claude-command.ts";
import type { AssistantBridge, TurnEvent } from "../apps/tauri/src/assistant/assistant-bridge.ts";
import { LiveSessions } from "../apps/tauri/src/assistant/live-sessions.ts";
import type { TurnAsk } from "../apps/tauri/src/assistant/turn-run.ts";

const FOLDER = "/tmp/bg-probe";
const started = Date.now();
const runs = new Map<number, ChildProcessWithoutNullStreams>();

function stamp(): string {
	return `${((Date.now() - started) / 1000).toFixed(1).padStart(6)}s`;
}

const bridge: AssistantBridge = {
	providers: () => Promise.reject(new Error("not in the demo")),
	turnFacts: () =>
		Promise.resolve({
			project: FOLDER,
			attachments: FOLDER,
			folders: [],
			link: null,
		}),
	startLaunch: (launch, onEvent) => {
		const child = spawn(launch.program, [...launch.args], { cwd: FOLDER, env: { ...process.env, ...launch.env } });
		const id = runs.size + 1;
		runs.set(id, child);
		child.stdout.on("data", (chunk: Buffer) => onEvent({ kind: "out", text: chunk.toString() }));
		child.stderr.on("data", (chunk: Buffer) => onEvent({ kind: "err", text: chunk.toString() }));
		child.on("exit", (code) => onEvent({ kind: "exited", code }) satisfies TurnEvent);
		child.stdin.write(`${launch.live?.said ?? ""}\n`);
		console.log(stamp(), "PROCESS STARTED", id);
		return Promise.resolve(id);
	},
	stopTurn: (turnId) => Promise.resolve(void runs.get(turnId)?.kill()),
	writeTurn: (turnId, line) => Promise.resolve(void runs.get(turnId)?.stdin.write(`${line}\n`)),
	closeTurn: (turnId) => Promise.resolve(void runs.get(turnId)?.stdin.end()),
	writeAttachment: () => Promise.resolve(),
	removeAttachment: () => Promise.resolve(),
	sweepAttachments: () => Promise.resolve(),
	pickFolder: () => Promise.resolve(null),
	dropPaths: () => Promise.resolve([]),
	readDropped: () => Promise.resolve(new Uint8Array(0)),
};

function shown(part: StreamPart): string | null {
	if ("text" in part) {
		return null;
	}

	if ("background" in part) {
		return `background ${JSON.stringify(part.background)}`;
	}

	if ("answered" in part) {
		return "answered";
	}

	return "call" in part ? `call ${part.call.name}` : null;
}

const live = new LiveSessions(bridge, (chatId, part) => {
	const said = "text" in part ? `text ${part.text}` : shown(part);
	if (said !== null) {
		console.log(stamp(), "BETWEEN TURNS", chatId, said.slice(0, 100));
	}
});

function askOf(prompt: string): TurnAsk {
	return {
		provider: {
			id: "claude-code",
			label: "Claude Code",
			found: true,
			outputFormat: "claude-stream",
			resumesWithoutAnId: false,
			compacts: true,
			reads: { images: true, files: "path" },
		},
		prompt,
		resume: null,
		claude: { mode: "bypassPermissions", model: "haiku", effort: "low", sandbox: "full" },
		folders: [],
		chatId: "demo-chat",
		launcher: claudeLaunchOf,
	};
}

async function turn(prompt: string): Promise<void> {
	const texts: string[] = [];
	const run = live.run(askOf(prompt), (part) => {
		if ("text" in part) {
			texts.push(part.text);
		}

		const said = shown(part);
		if (said !== null) {
			console.log(stamp(), "IN TURN", said.slice(0, 100));
		}
	});
	const answer = await run.done;
	console.log(stamp(), "TURN ENDED", JSON.stringify(answer), "said:", texts.join("").slice(0, 80));
}

await turn(
	'Launch ONE background subagent with the Agent tool (run_in_background: true, subagent_type general-purpose). Its task: run python3 -c "import time; time.sleep(25)" in the foreground, then reply DONE. Right after launching it, end your turn with the single word LAUNCHED.',
);
await turn("Reply with the single word PONG.");
console.log(stamp(), "processes started so far:", runs.size);
await new Promise((settle) => setTimeout(settle, 60000));
live.end("demo-chat");
await new Promise((settle) => setTimeout(settle, 3000));
console.log(
	stamp(),
	"processes started in all:",
	runs.size,
	"still alive:",
	[...runs.values()].filter((child) => child.exitCode === null).length,
);
