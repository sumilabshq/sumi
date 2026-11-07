import type { AssistantPort, AssistantSession } from "../packages/shared/core/src/engine/assistant-port.ts";
import type { IpcOptions, TauriIpc } from "../apps/tauri/src/assistant/assistant-bridge.ts";
import {
	ATTACHMENT_PATH_HEADER,
	droppedBytesIn,
	droppedEntriesIn,
	pickedFolderIn,
	providersAnswerIn,
} from "../apps/tauri/src/assistant/assistant-bridge.ts";
import { cssPointOf, dragStepOf, isInside } from "../apps/tauri/src/assistant/tauri-file-drop.ts";
import type { ChatSpot, WebviewDragSource } from "../apps/tauri/src/assistant/tauri-file-drop.ts";
import { AssistantModule } from "../plugins/chat/data/assistant/module.ts";
import { attachmentFilesIn } from "../plugins/chat/data/assistant/gateways/assistant-parts/port.gateway.ts";
import {
	AttachDroppedCommand,
	AttachFolderCommand,
	AttachReachQuery,
	ChooseClaudeOptionCommand,
	ClaudeOptionsQuery,
	DraftAttachmentsQuery,
	FileDragQuery,
	SendMessageCommand,
} from "../plugins/chat/data/assistant/index.ts";
import { app } from "../packages/shared/data-framework/src/index.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import {
	COMPACT_PROMPT,
	NOTHING_READY,
	NOTHING_TO_COMPACT,
	NO_SUCH_QUEUED,
	STOPPED,
	createTurnSession,
} from "../apps/tauri/src/assistant/turn-session.ts";
import { CANNOT_COMPACT, UNKNOWN_PROVIDER } from "../apps/tauri/src/assistant/tauri-assistant-port.ts";
import { readChatLogs } from "../apps/tauri/src/chat/tauri-chat-history.ts";
import { StoreClient } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { DEFAULT, FakeStore, quietly } from "./host-tauri-fake-store.ts";
import { startTauriAssistant } from "../apps/tauri/src/assistant/tauri-assistant.ts";
import { keptUsageIn } from "../apps/tauri/src/assistant/kept-usage.ts";
import type { UsageMemory } from "../apps/tauri/src/assistant/kept-usage.ts";
import type { TauriAssistant, TauriWorkspaceFolders } from "../apps/tauri/src/assistant/tauri-assistant.ts";

let failed = 0;
let checks = 0;

function check(what: string, got: unknown, wanted: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

async function refusalOf(attempt: () => Promise<unknown>): Promise<string | null> {
	try {
		await attempt();
		return null;
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

interface Called {
	readonly command: string;
	readonly args: unknown;
	readonly options: IpcOptions | undefined;
}

interface FakeChannel {
	readonly onMessage: (message: unknown) => void;
}

const FOLDER = "/tmp/widgetarium-attachments-501";
const PROJECT = "/work/app";

function factsOf(id: string, label: string, found: boolean, outputFormat = "text"): unknown {
	return {
		id,
		label,
		found,
		outputFormat,
		resumesWithoutAnId: id === "opencode",
		compacts: id === "claude-code",
		reads: { images: false, files: "path" },
	};
}

const PROVIDERS = {
	project: PROJECT,
	attachmentsFolder: FOLDER,
	providers: [
		factsOf("claude-code", "Claude Code", true, "claude-stream"),
		factsOf("codex", "Codex", false),
		factsOf("opencode", "OpenCode", true),
	],
};

interface FakeIpc extends TauriIpc {
	readonly called: Called[];
	channels: FakeChannel[];
	startRefusal: string | null;
	providersAnswer: unknown;
	pickedFolder: string | null;
	dropped: unknown;
	droppedBytes: ArrayBuffer;
}

const OPENED = {
	id: "w1",
	name: "Habits",
	folder: null,
	folderFound: false,
	lastOpenedAt: 0,
	recentFolders: [],
};

const NO_FOLDER_PICKS: TauriWorkspaceFolders = {
	client: {
		chooseFolder: async () => OPENED,
		attachFolder: async () => null,
	},
	opened: OPENED,
};

function startedAssistant(ipc: FakeIpc, page: object, usageMemory: UsageMemory = memoryShelf()): TauriAssistant {
	return startTauriAssistant({
		ipc,
		page,
		workspace: NO_FOLDER_PICKS,
		drags: fakeDrags(),
		chat: CHAT_SPOT,
		usageMemory,
	});
}

function memoryShelf(): UsageMemory {
	const held: { kept: unknown } = { kept: null };
	return {
		read: () => held.kept,
		write: (value) => {
			held.kept = JSON.parse(JSON.stringify(value));
		},
	};
}

function chatOver({ host }: TauriAssistant): StartedApp {
	return app()
		.modules(AssistantModule(host))
		.start({
			platform: "tauri",
			scope: {
				workspaceId: "w1",
			},
		});
}

function fakeIpc(): FakeIpc {
	const ipc: FakeIpc = {
		called: [],
		channels: [],
		startRefusal: null,
		pickedFolder: null,
		dropped: [],
		droppedBytes: new ArrayBuffer(0),
		providersAnswer: PROVIDERS,
		invoke: async (command, args, options) => {
			ipc.called.push({ command, args, options });
			if (command.endsWith("|providers")) return ipc.providersAnswer;
			if (command.endsWith("|pick_folder")) return ipc.pickedFolder;
			if (command.endsWith("|drop_paths")) return ipc.dropped;
			if (command.endsWith("|read_dropped")) return ipc.droppedBytes;
			if (command.endsWith("|start_turn") && ipc.startRefusal !== null) throw new Error(ipc.startRefusal);
			return command.endsWith("|start_turn") ? 40 + ipc.called.length : null;
		},
		channel: (onMessage) => {
			const channel = { onMessage };
			ipc.channels.push(channel);
			return channel;
		},
	};
	return ipc;
}

const flush = (): Promise<void> => new Promise((settle) => setTimeout(settle, 0));

function lastChannel(ipc: FakeIpc): FakeChannel {
	const channel = ipc.channels.at(-1);
	if (channel === undefined) throw new Error("no turn was started");
	return channel;
}

function said(channel: FakeChannel, event: Readonly<Record<string, unknown>>): void {
	channel.onMessage(event);
}

function streamed(channel: FakeChannel, lines: readonly unknown[]): void {
	lines.forEach((line) => said(channel, { kind: "out", text: `${JSON.stringify(line)}\n` }));
}

function lastAnswer(session: AssistantSession): AssistantSession["turns"][number] | undefined {
	return session.turns.at(-1);
}

function callsNamed(ipc: FakeIpc, name: string): Called[] {
	return ipc.called.filter(({ command }) => command === `plugin:assistant|${name}`);
}

const CLAUDE_TURN = [
	{ type: "system", session_id: "sess-1" },
	{ type: "stream_event", event: { type: "content_block_start", content_block: { type: "text" } } },
	{ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "o" } } },
	{ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "k" } } },
	{
		type: "assistant",
		message: { content: [{ type: "tool_use", id: "t1", name: "Read", input: { file_path: "a.ts" } }] },
	},
	{ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "one line" }] } },
	{ type: "result", is_error: false, usage: { output_tokens: 7 } },
];

async function sendAndStart(port: AssistantPort, ipc: FakeIpc, asked: string): Promise<FakeChannel> {
	await port.send(asked);
	await flush();
	return lastChannel(ipc);
}

async function setupChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const setup = await port.setup();
	check("the port can answer", port.can, true);
	check(
		"only the providers found on the machine are offered",
		setup.providers.map(({ id }) => id),
		["claude-code", "opencode"],
	);
	check(
		"Claude Code is chosen first",
		[setup.chosen, setup.providerLabel, setup.isReady],
		["claude-code", "Claude Code", true],
	);
	check("the providers are asked once", callsNamed(ipc, "providers").length, (await port.setup(), 1));

	const refused = await refusalOf(() => port.chooseProvider("custom"));
	check("an unknown provider is refused", refused, UNKNOWN_PROVIDER.replace("{id}", "custom"));
	const notFound = await refusalOf(() => port.chooseProvider("codex"));
	check("a provider not on the machine is refused", notFound, UNKNOWN_PROVIDER.replace("{id}", "codex"));
	await port.chooseProvider("opencode");
	check("a found provider can be chosen", (await port.setup()).chosen, "opencode");

	const noProject = fakeIpc();
	noProject.providersAnswer = { ...PROVIDERS, project: null };
	check("no project folder means not ready", (await startedAssistant(noProject, {}).port.setup()).isReady, false);

	const malformed = fakeIpc();
	malformed.providersAnswer = { providers: [{ id: 3 }] };
	const unreadable = await refusalOf(() => startedAssistant(malformed, {}).port.setup());
	check(
		"a malformed providers answer is refused",
		unreadable,
		"The assistant answered its providers in a shape Widgetarium cannot read",
	);
	check("a well-formed answer is read whole", providersAnswerIn(PROVIDERS).providers.length, 3);
}

async function streamChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const channel = await sendAndStart(port, ipc, "Reply with the single word ok");
	const started = callsNamed(ipc, "start_turn")[0]?.args;
	check("the turn names the provider, the prompt and its chat, never a command line", started, {
		providerId: "claude-code",
		prompt: "Reply with the single word ok",
		resume: null,
		claude: { mode: "auto", model: "opus", effort: "medium" },
		folders: [],
		chatId: "chat-1",
		onEvent: channel,
	});
	check("a sent turn is busy", port.session().busy, true);

	streamed(channel, CLAUDE_TURN);
	const answer = lastAnswer(port.session());
	check("the streamed text lands in the answer", answer?.text, "ok");
	check(
		"a tool call is shown with its answer",
		answer?.calls.map(({ ref, name, answered, output }) => ({ ref, name, answered, output })),
		[{ ref: "t1", name: "Read", answered: true, output: "one line" }],
	);
	check("the spent tokens are read", port.session().spent, 7);

	said(channel, { kind: "exited", code: 0 });
	await flush();
	check(
		"the turn finishes on exit 0",
		[port.session().busy, lastAnswer(port.session())?.outcome, port.session().failure],
		[false, "done", null],
	);

	await sendAndStart(port, ipc, "again");
	check(
		"the next turn resumes the streamed session",
		(callsNamed(ipc, "start_turn")[1]?.args as { resume?: unknown }).resume,
		"sess-1",
	);
}

async function resumeChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const claude = await sendAndStart(port, ipc, "first");
	streamed(claude, [{ type: "system", session_id: "sess-9" }]);
	said(claude, { kind: "exited", code: 0 });
	await flush();
	await port.chooseProvider("opencode");
	const opencode = await sendAndStart(port, ipc, "second");
	const resumeOf = (index: number): unknown =>
		(callsNamed(ipc, "start_turn")[index]?.args as { resume?: unknown }).resume;
	check("a Claude session is never handed to another provider", resumeOf(1), null);
	said(opencode, { kind: "exited", code: 0 });
	await flush();
	await sendAndStart(port, ipc, "third");
	check("a CLI that resumes itself is told to resume its last", resumeOf(2), "last");
}

async function signalChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const channel = await sendAndStart(port, ipc, "hi");
	said(channel, { kind: "exited", code: null });
	await flush();
	check(
		"a CLI ended by a signal fails the turn",
		port.session().failure,
		"Claude Code was ended by a signal before it finished.",
	);
}

async function failedWriteChecks(): Promise<void> {
	const ipc = fakeIpc();
	const invoke = ipc.invoke;
	ipc.invoke = async (command, args, options) => {
		if (command.endsWith("|write_attachment")) throw new Error("disk full");
		return invoke(command, args, options);
	};
	const started = startedAssistant(ipc, { __WIDGETARIUM_ATTACHMENTS__: FOLDER });
	const { port } = started;
	attachmentFilesIn(started.host.tauriAttachments).saveAttachment("a.txt", new Uint8Array([1]));
	await port.send("read the file");
	await flush();
	await flush();
	check(
		"a failed write stops the turn before it starts",
		[port.session().failure, callsNamed(ipc, "start_turn").length],
		["The answer could not be started: An attached file could not be written: disk full", 0],
	);
}

async function stopChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const channel = await sendAndStart(port, ipc, "write a long story");
	streamed(channel, [
		{ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "Once" } } },
	]);
	port.stop();
	await flush();
	const stopCall = callsNamed(ipc, "stop_turn")[0]?.args;
	check("stop asks the host to end the turn it started", typeof (stopCall as { turnId?: unknown }).turnId, "number");
	check(
		"a stopped turn says so",
		[port.session().busy, lastAnswer(port.session())?.outcome, port.session().failure],
		[false, "stopped", STOPPED],
	);

	streamed(channel, [
		{ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: " upon" } } },
	]);
	said(channel, { kind: "exited", code: null });
	await flush();
	check("output after stop is ignored", lastAnswer(port.session())?.text, "Once");
}

async function errorChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const channel = await sendAndStart(port, ipc, "hi");
	said(channel, { kind: "err", text: "boom\n" });
	said(channel, { kind: "exited", code: 2 });
	await flush();
	check(
		"a bad exit fails the turn with stderr",
		[lastAnswer(port.session())?.outcome, port.session().failure],
		["failed", "Claude Code exited with code 2. boom"],
	);

	const streamFailure = await sendAndStart(port, ipc, "again");
	streamed(streamFailure, [{ type: "result", is_error: true, result: "Not signed in" }]);
	said(streamFailure, { kind: "exited", code: 1 });
	await flush();
	check("the stream's own reason wins over the exit code", port.session().failure, "Not signed in");

	ipc.startRefusal = "This provider is not one Widgetarium can start: custom";
	await port.send("third");
	await flush();
	await flush();
	check(
		"a refusal from the host fails the turn",
		port.session().failure,
		"This provider is not one Widgetarium can start: custom",
	);
	check("a refused turn is not left busy", port.session().busy, false);
}

async function folderAndOptionChecks(): Promise<void> {
	const ipc = fakeIpc();
	ipc.pickedFolder = "/Users/me/Apps/habits";
	const shelf = memoryShelf();
	const chat = chatOver(startedAssistant(ipc, { __WIDGETARIUM_ATTACHMENTS__: FOLDER }, shelf));
	const reach = await chat.send(AttachReachQuery);
	check("Tauri offers folders to attach", reach.ok ? reach.output.canAttachFolders : null, true);
	await chat.send(AttachFolderCommand);
	check("the folder is picked by Rust's dialog, not named by the page", callsNamed(ipc, "pick_folder").length, 1);
	const drafts = await chat.send(DraftAttachmentsQuery);
	check(
		"the picked folder shows as a folder card with its path from home",
		drafts.ok ? drafts.output.map(({ kind, name, where }) => [kind, name, where]) : null,
		[["folder", "habits", "~/Apps/habits"]],
	);
	await chat.send(ChooseClaudeOptionCommand, { model: "sonnet" });
	await chat.send(ChooseClaudeOptionCommand, { effort: "xhigh" });
	await chat.send(SendMessageCommand, { said: "Match its style" });
	await flush();
	const started = callsNamed(ipc, "start_turn").at(-1)?.args;
	const startedArgs = typeof started === "object" && started !== null ? started : {};
	check(
		"the turn lends the picked folder and carries the chosen options as names",
		[Reflect.get(startedArgs, "folders"), Reflect.get(startedArgs, "claude")],
		[["/Users/me/Apps/habits"], { mode: "auto", model: "sonnet", effort: "xhigh" }],
	);
	check(
		"the message names the folder by its path, as a folder to read",
		String(Reflect.get(startedArgs, "prompt")).includes(
			'- folder "habits" (a folder you may read): /Users/me/Apps/habits',
		),
		true,
	);
	streamed(lastChannel(ipc), [
		{
			type: "rate_limit_event",
			rate_limit_info: {
				status: "allowed",
				unifiedWindows: {
					five_hour: { utilization: 0.38, resetsAt: 1792326000 },
					seven_day: { utilization: 0.12, resetsAt: 1792731600 },
				},
			},
		},
	]);
	const options = await chat.send(ClaudeOptionsQuery);
	check("the plan usage Claude Code reports with a turn reaches the strip", options.ok ? options.output?.usage : null, {
		fiveHour: { used: 0.38, resetsAt: 1792326000000 },
		week: { used: 0.12, resetsAt: 1792731600000 },
	});
	check("the reported plan usage is kept for the next start", keptUsageIn(shelf, 1792300000000), {
		fiveHour: { used: 0.38, resetsAt: 1792326000000 },
		week: { used: 0.12, resetsAt: 1792731600000 },
	});
	check("a kept window that already reset is not shown", keptUsageIn(shelf, 1792500000000), {
		fiveHour: null,
		week: { used: 0.12, resetsAt: 1792731600000 },
	});
	check("kept usage whose windows all reset is no usage", keptUsageIn(shelf, 1792800000000), null);
	check(
		"a picked path that is not absolute is refused",
		await refusalOf(async () => pickedFolderIn("relative/x")),
		"The assistant answered a picked folder that is not a path",
	);
	check("a cancelled pick attaches nothing", pickedFolderIn(null), null);
}

async function attachmentChecks(): Promise<void> {
	const ipc = fakeIpc();
	const files = attachmentFilesIn(startedAssistant(ipc, { __WIDGETARIUM_ATTACHMENTS__: FOLDER }).host.tauriAttachments);
	const path = files.saveAttachment("my shot.png", new Uint8Array([1, 2, 3]));
	check(
		"an attachment is written inside the private folder with a safe name",
		path.startsWith(`${FOLDER}/`) && path.endsWith("-my_shot.png"),
		true,
	);
	const write = callsNamed(ipc, "write_attachment")[0];
	check(
		"the bytes travel raw with the path in a header",
		[write?.args instanceof Uint8Array, write?.options?.headers[ATTACHMENT_PATH_HEADER]],
		[true, path],
	);

	files.removeAttachmentsOlderThan(3600000, Date.now());
	check("the folder is swept by the host", callsNamed(ipc, "sweep_attachments")[0]?.args, { ageMs: 3600000 });

	const noFolder = startedAssistant(fakeIpc(), {});
	const refused = await refusalOf(async () =>
		attachmentFilesIn(noFolder.host.tauriAttachments).saveAttachment("a.txt", new Uint8Array()),
	);
	check("without a private folder nothing is attached", refused, "Files cannot be attached on this host");
}

interface FakeDrags extends WebviewDragSource {
	readonly heard: ((event: { readonly payload: unknown }) => void)[];
	unlistened: number;
}

function fakeDrags(): FakeDrags {
	const drags: FakeDrags = {
		heard: [],
		unlistened: 0,
		onDragDropEvent: (handler) => {
			drags.heard.push(handler);
			return Promise.resolve(() => {
				drags.unlistened += 1;
			});
		},
	};
	return drags;
}

function dragged(drags: FakeDrags, payload: unknown): void {
	drags.heard.forEach((handler) => handler({ payload }));
}

const CHAT_SPOT: ChatSpot = {
	rect: () => ({
		left: 0,
		top: 0,
		right: 400,
		bottom: 800,
	}),
	scale: () => 2,
};

const INSIDE = {
	x: 200,
	y: 400,
};
const OUTSIDE = {
	x: 1000,
	y: 400,
};

function dragMappingChecks(): void {
	check("a physical position is divided into css pixels", cssPointOf({ x: 300, y: 90 }, 2), { x: 150, y: 45 });
	check(
		"a point inside the chat column is a hit",
		isInside({ left: 10, top: 10, right: 20, bottom: 20 }, { x: 15, y: 20 }),
		true,
	);
	check("no chat column on screen is never a hit", isInside(null, { x: 0, y: 0 }), false);
	check(
		"an enter over the chat is an enter",
		dragStepOf({ type: "enter", paths: ["/a"], position: INSIDE }, CHAT_SPOT),
		{ kind: "enter" },
	);
	check("an over outside the chat is a leave", dragStepOf({ type: "over", position: OUTSIDE }, CHAT_SPOT), {
		kind: "leave",
	});
	check(
		"a drop outside the chat is a leave",
		dragStepOf({ type: "drop", paths: ["/a"], position: OUTSIDE }, CHAT_SPOT),
		{ kind: "leave" },
	);
	check(
		"a drop on the chat carries its paths",
		dragStepOf({ type: "drop", paths: ["/a", 3], position: INSIDE }, CHAT_SPOT),
		{
			kind: "drop",
			paths: ["/a"],
		},
	);
	check("a leave is a leave", dragStepOf({ type: "leave" }, CHAT_SPOT), { kind: "leave" });
	check("an event of no known shape is ignored", dragStepOf("noise", CHAT_SPOT), null);
	check(
		"dropped entries in a wrong shape are refused",
		(() => {
			try {
				droppedEntriesIn([{ path: "relative", name: "a", kind: "file", size: 1 }]);
				return null;
			} catch (failure) {
				return failure instanceof Error ? failure.message : null;
			}
		})(),
		"The assistant answered dropped paths in a shape Widgetarium cannot read",
	);
	check("dropped bytes arrive raw", [...droppedBytesIn(new Uint8Array([7, 8]).buffer)], [7, 8]);
}

async function fileDropChecks(): Promise<void> {
	dragMappingChecks();
	const ipc = fakeIpc();
	const drags = fakeDrags();
	const assistant = startTauriAssistant({
		ipc,
		page: { __WIDGETARIUM_ATTACHMENTS__: FOLDER },
		workspace: NO_FOLDER_PICKS,
		drags,
		chat: CHAT_SPOT,
	});
	check("nothing listens for drops before the chat starts", drags.heard.length, 0);
	const chat = chatOver(assistant);
	const isOver = async (): Promise<unknown> => {
		await flush();
		const drag = await chat.send(FileDragQuery);
		return drag.ok ? drag.output.isOver : null;
	};
	await flush();
	check("the started chat listens to the webview's drag events", drags.heard.length, 1);
	dragged(drags, { type: "enter", paths: ["/Users/me/notes.md"], position: INSIDE });
	check("a file dragged over the chat shows the drop zone", await isOver(), true);
	dragged(drags, { type: "over", position: OUTSIDE });
	check("a file dragged off the chat hides it", await isOver(), false);
	dragged(drags, { type: "drop", paths: ["/Users/me/notes.md"], position: OUTSIDE });
	await flush();
	check("a drop off the chat sends nothing to Rust", callsNamed(ipc, "drop_paths").length, 0);
	ipc.dropped = [
		{ path: "/Users/me/notes.md", name: "notes.md", kind: "file", size: 4 },
		{ path: "/Users/me/Apps/habits", name: "habits", kind: "folder", size: 0 },
	];
	ipc.droppedBytes = new TextEncoder().encode("# hi").buffer;
	dragged(drags, { type: "over", position: INSIDE });
	dragged(drags, { type: "drop", paths: ["/Users/me/notes.md", "/Users/me/Apps/habits"], position: INSIDE });
	await flush();
	check("the dropped paths go to Rust", callsNamed(ipc, "drop_paths")[0]?.args, {
		paths: ["/Users/me/notes.md", "/Users/me/Apps/habits"],
	});
	await flush();
	await flush();
	const drag = await chat.send(FileDragQuery);
	const dropped = drag.ok ? drag.output.dropped : null;
	check(
		"the drop hides the zone and waits to be attached",
		[drag.ok && drag.output.isOver, typeof dropped],
		[false, "string"],
	);
	await chat.send(AttachDroppedCommand, { id: dropped ?? "" });
	check("the dropped file's bytes are read by its path", callsNamed(ipc, "read_dropped")[0]?.args, {
		path: "/Users/me/notes.md",
	});
	const drafts = await chat.send(DraftAttachmentsQuery);
	check(
		"the drop attaches the folder and the file",
		drafts.ok ? drafts.output.map(({ kind, name }) => [kind, name]) : null,
		[
			["folder", "habits"],
			["text", "notes.md"],
		],
	);
	await chat.send(AttachDroppedCommand, { id: dropped ?? "" });
	const again = await chat.send(DraftAttachmentsQuery);
	check("one drop attaches once", again.ok ? again.output.length : null, 2);
	chat.stop();
	check("stopping the chat stops listening", drags.unlistened, 1);
}

const COMPACT_RUN = [
	{ type: "system", subtype: "status", status: "compacting", session_id: "sess-9" },
	{ type: "system", subtype: "status", status: null, compact_result: "success", session_id: "sess-9" },
	{ type: "system", subtype: "init", session_id: "sess-9" },
	{
		type: "system",
		subtype: "compact_boundary",
		session_id: "sess-9",
		compact_metadata: { trigger: "manual", pre_tokens: 69131, post_tokens: 13637 },
	},
	{
		type: "user",
		isSynthetic: true,
		session_id: "sess-9",
		message: {
			role: "user",
			content:
				"This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\nSummary:\n1. Primary Request and Intent:\n   The user said hi.",
		},
	},
	{
		type: "user",
		session_id: "sess-9",
		message: { role: "user", content: "<local-command-stdout>Compacted</local-command-stdout>" },
	},
	{ type: "result", subtype: "success", is_error: false, result: "", session_id: "sess-9" },
];

function startedPrompts(ipc: FakeIpc): unknown[] {
	return callsNamed(ipc, "start_turn").map(({ args }) => {
		const { prompt, resume } = args as { prompt?: unknown; resume?: unknown };
		return [prompt, resume];
	});
}

function lostResult(sessionId: string): unknown {
	return {
		type: "result",
		subtype: "error_during_execution",
		is_error: true,
		session_id: sessionId,
		errors: [`No conversation found with session ID: ${sessionId}`],
	};
}

async function lostResumeChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const first = await sendAndStart(port, ipc, "hi");
	streamed(first, [{ type: "system", session_id: "gone-1" }]);
	said(first, { kind: "exited", code: 0 });
	await flush();

	const lost = await sendAndStart(port, ipc, "again");
	streamed(lost, [lostResult("gone-1")]);
	said(lost, { kind: "exited", code: 1 });
	await flush();
	await flush();
	check(
		"a session Claude no longer has is dropped and the message runs again as a new one",
		startedPrompts(ipc).slice(1),
		[
			["again", "gone-1"],
			["again", null],
		],
	);
	check("while it runs again, no failure is shown", [port.session().busy, port.session().failure], [true, null]);

	const fresh = lastChannel(ipc);
	streamed(fresh, CLAUDE_TURN);
	said(fresh, { kind: "exited", code: 0 });
	await flush();
	check(
		"the new run answers the turn",
		[lastAnswer(port.session())?.outcome, lastAnswer(port.session())?.text, port.session().failure],
		["done", "ok", null],
	);
	await sendAndStart(port, ipc, "next");
	check("the next message resumes the new session", startedPrompts(ipc).at(-1), ["next", "sess-1"]);
	said(lastChannel(ipc), { kind: "exited", code: 0 });
	await flush();

	const lostAgain = await sendAndStart(port, ipc, "third");
	streamed(lostAgain, [lostResult("sess-1")]);
	said(lostAgain, { kind: "exited", code: 1 });
	await flush();
	await flush();
	const retried = lastChannel(ipc);
	streamed(retried, [lostResult("sess-1")]);
	said(retried, { kind: "exited", code: 1 });
	await flush();
	check(
		"it runs again only once, then fails with Claude's own words",
		[startedPrompts(ipc).slice(-3), port.session().failure],
		[
			[
				["next", "sess-1"],
				["third", "sess-1"],
				["third", null],
			],
			"No conversation found with session ID: sess-1",
		],
	);
}

async function compactChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	check(
		"Claude Code is offered as able to compact, OpenCode is not",
		(await port.setup()).providers.map(({ id, compacts }) => [id, compacts]),
		[
			["claude-code", true],
			["opencode", false],
		],
	);
	check(
		"a chat with no agent session has nothing to compact",
		await refusalOf(() => port.compact()),
		NOTHING_TO_COMPACT,
	);

	const first = await sendAndStart(port, ipc, "hi");
	streamed(first, [{ type: "system", session_id: "sess-9" }]);
	said(first, { kind: "exited", code: 0 });
	await flush();
	await port.compact();
	await flush();
	check("/compact runs the same session with the compact prompt", startedPrompts(ipc).at(-1), [
		COMPACT_PROMPT,
		"sess-9",
	]);
	check(
		"while it runs, the chat shows one compact turn, not a question and an answer",
		[port.session().turns.map((turn) => turn.role), port.session().busy],
		[["user", "agent", "compact"], true],
	);
	const compacting = lastChannel(ipc);
	streamed(compacting, COMPACT_RUN);
	said(compacting, { kind: "exited", code: 0 });
	await flush();
	const compacted = port.session().turns.at(-1);
	check(
		"the compact turn holds the summary without Claude's preface, and ends done",
		[compacted?.role, compacted?.text, compacted?.outcome, port.session().failure],
		["compact", "1. Primary Request and Intent:\n   The user said hi.", "done", null],
	);
	await sendAndStart(port, ipc, "next");
	check("the next message resumes the compacted session", startedPrompts(ipc).at(-1), ["next", "sess-9"]);
	said(lastChannel(ipc), { kind: "exited", code: 0 });
	await flush();

	await port.compact();
	await flush();
	said(lastChannel(ipc), { kind: "err", text: "Not logged in" });
	said(lastChannel(ipc), { kind: "exited", code: 1 });
	await flush();
	check(
		"a failed compact ends its turn failed and names why",
		[port.session().turns.at(-1)?.outcome, port.session().failure?.includes("Not logged in")],
		["failed", true],
	);
	const turnsBefore = port.session().turns.length;
	port.retry();
	await flush();
	check(
		"try again reruns the compact in place of the failed one",
		[startedPrompts(ipc).at(-1), port.session().turns.length, port.session().turns.at(-1)?.role],
		[[COMPACT_PROMPT, "sess-9"], turnsBefore, "compact"],
	);
	said(lastChannel(ipc), { kind: "exited", code: 0 });
	await flush();

	await port.chooseProvider("opencode");
	check(
		"a provider that cannot compact is refused before anything starts",
		await refusalOf(() => port.compact()),
		CANNOT_COMPACT.replace("{label}", "OpenCode"),
	);
}

async function clearChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put(`workspace:${DEFAULT.id}:chat/index.json`, {
		v: 1,
		rev: 1,
		currentId: "c1",
		resumes: { "claude-code": "s-1" },
	});
	const store = new StoreClient(fake.invoke);
	const logs = await readChatLogs(store, DEFAULT.id);
	const history = await logs.historyOf("c1");
	const started: unknown[] = [];
	const session = createTurnSession(
		async (asked, resumeOf) => {
			started.push([asked, resumeOf("claude-code")]);
			return Promise.reject(new Error("no provider"));
		},
		{ history },
	);
	history.settled(
		{
			...history.kept.session,
			turns: [
				{ role: "user", text: "hi", calls: [] },
				{ role: "agent", text: "hello", calls: [], outcome: "done" },
			],
		},
		new Map([["claude-code", "s-1"]]),
	);
	await session.clear();
	await quietly(() => logs.sessions.flush());
	const sessions: unknown = fake.files.get(`workspace:${DEFAULT.id}:chat/sessions.json`)?.["sessions"];
	const cleared: unknown = typeof sessions === "object" && sessions !== null ? Reflect.get(sessions, "c1") : null;
	const clearedLog: unknown = typeof cleared === "object" && cleared !== null ? Reflect.get(cleared, "logId") : null;
	const clearedResumes: unknown =
		typeof cleared === "object" && cleared !== null ? Reflect.get(cleared, "resumes") : null;
	check(
		"/clear empties the chat and gives it a new log, with no resume",
		[session.now().turns.length, typeof clearedLog === "string" && clearedLog !== "c1", clearedResumes],
		[0, true, {}],
	);
	check(
		"the cleared chat stays on disk under its own id",
		fake.lines.get(`workspace:${DEFAULT.id}:chat/c1.jsonl`)?.length,
		2,
	);
	await session.send("fresh start");
	await flush();
	check("the first message after /clear starts a new agent session", started, [["fresh start", null]]);
	check("and /compact has nothing to compact yet", await refusalOf(() => session.compact()), NOTHING_TO_COMPACT);
}

const READ_CALL = {
	type: "assistant",
	message: { content: [{ type: "tool_use", id: "q1", name: "Read", input: { file_path: "a.ts" } }] },
};
const READ_RESULT = {
	type: "user",
	message: { content: [{ type: "tool_result", tool_use_id: "q1", content: "one line" }] },
};

async function queueChecks(): Promise<void> {
	const ipc = fakeIpc();
	const { port } = startedAssistant(ipc, {});
	const first = await sendAndStart(port, ipc, "build the queue");
	const startsBefore = callsNamed(ipc, "start_turn").length;
	await port.send("use a pencil icon");
	await flush();
	check(
		"a message sent while the agent works is queued, not refused and not started",
		[port.session().queued.map(({ text }) => text), port.session().turns.length, callsNamed(ipc, "start_turn").length],
		[["use a pencil icon"], 2, startsBefore],
	);

	streamed(first, [READ_CALL]);
	const handed = port.handQueueToAgent("chat-1");
	check("the hook between steps takes the ready queue as one text", handed?.includes("use a pencil icon"), true);
	check(
		"and the chat shows it as the person's message inside the running answer",
		[port.session().queued.length, port.session().turns.map(({ role }) => role)],
		[0, ["user", "agent", "user", "agent"]],
	);
	check("an empty queue hands the hook nothing", port.handQueueToAgent("chat-1"), null);

	streamed(first, [READ_RESULT]);
	check(
		"a tool result after the split lands on its own call",
		port.session().turns[1]?.calls.map(({ answered }) => answered),
		[true],
	);

	await port.send("then run the tests");
	const held = port.session().queued[0]?.id ?? "";
	check("a change that lands answers no refusal", port.changeQueue?.({ kind: "hold", id: held, isHeld: true }), null);
	streamed(first, [{ type: "result", is_error: false, usage: { output_tokens: 3 } }]);
	said(first, { kind: "exited", code: 0 });
	await flush();
	check(
		"a held message waits for its edit when the turn ends",
		[port.session().busy, port.session().queued.map(({ isHeld }) => isHeld)],
		[false, [true]],
	);

	port.changeQueue?.({ kind: "edit", id: held, said: "then run the chat tests" });
	await flush();
	const edited = callsNamed(ipc, "start_turn").at(-1)?.args;
	check(
		"an edit saved while the agent is idle sends the queue at once",
		[Reflect.get(edited ?? {}, "prompt"), port.session().busy, port.session().queued.length],
		["then run the chat tests", true, 0],
	);

	const running = lastChannel(ipc);
	await port.send("first");
	await port.send("second");
	port.changeQueue?.({ kind: "remove", id: port.session().queued[0]?.id ?? "" });
	check(
		"remove takes one message out",
		port.session().queued.map(({ text }) => text),
		["second"],
	);
	await port.send("third");
	streamed(running, [{ type: "result", is_error: false, usage: { output_tokens: 1 } }]);
	said(running, { kind: "exited", code: 0 });
	await flush();
	const next = callsNamed(ipc, "start_turn").at(-1)?.args;
	check(
		"a turn that ends sends the ready queue as the next prompt, each message its own bubble",
		[
			Reflect.get(next ?? {}, "prompt"),
			port
				.session()
				.turns.slice(-3)
				.map(({ role, text }) => `${role}:${text}`),
		],
		["second\n\nthird", ["user:second", "user:third", "agent:"]],
	);

	check(
		"a change to a message that is already gone is refused, never dropped in silence",
		port.changeQueue?.({ kind: "edit", id: "gone", said: "too late" }),
		NO_SUCH_QUEUED,
	);
	check("send now with nothing ready says so", port.changeQueue?.({ kind: "send-now" }), NOTHING_READY);

	await port.send("stop and read this");
	const stopsBefore = callsNamed(ipc, "stop_turn").length;
	port.changeQueue?.({ kind: "send-now" });
	await flush();
	check(
		"send now stops the running step and sends the queue",
		[
			callsNamed(ipc, "stop_turn").length - stopsBefore,
			Reflect.get(callsNamed(ipc, "start_turn").at(-1)?.args ?? {}, "prompt"),
		],
		[1, "stop and read this"],
	);
}

await queueChecks();
await setupChecks();
await streamChecks();
await stopChecks();
await resumeChecks();
await signalChecks();
await failedWriteChecks();
await errorChecks();
await lostResumeChecks();
await attachmentChecks();
await folderAndOptionChecks();
await fileDropChecks();
await compactChecks();
await clearChecks();

console.log(`\nhost-tauri assistant: ${failed === 0 ? "clean" : "BLOCKED"} — ${checks - failed}/${checks} checks`);
process.exit(failed === 0 ? 0 : 1);
