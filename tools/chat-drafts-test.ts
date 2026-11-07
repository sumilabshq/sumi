import { app } from "../packages/shared/data-framework/src/index.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import { NO_ASSISTANT } from "../packages/shared/core/src/engine/assistant-port.ts";
import type { AssistantPort, AssistantSetup } from "../packages/shared/core/src/engine/assistant-port.ts";
import { StoreClient } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { AssistantModule } from "../plugins/chat/data/assistant/module.ts";
import {
	AttachFilesCommand,
	ChooseClaudeOptionCommand,
	ChooseProviderCommand,
	ClaudeOptionsQuery,
	DraftAttachmentsQuery,
	HoldDraftTextCommand,
	OpenChatDraftCommand,
	SendMessageCommand,
} from "../plugins/chat/data/assistant/index.ts";
import { portAssistantParts } from "../plugins/chat/data/assistant/gateways/assistant-parts/port.gateway.ts";
import { PrivateFolderAttachmentFilesGateway } from "../plugins/chat/data/assistant/gateways/attachment-files/private-folder.gateway.ts";
import { ShelfChatDraftsGateway } from "../plugins/chat/data/assistant/gateways/chat-drafts/shelf.gateway.ts";
import { CellClaudeOptionsGateway } from "../plugins/chat/data/assistant/gateways/claude-options/cell.gateway.ts";
import { claudeOptionsCell } from "../apps/tauri/src/assistant/claude-options-cell.ts";
import { z } from "zod";
import { HeldDoc } from "../packages/shared/behaviors/src/tauri-store/held-doc.ts";
import { TauriChatDraftShelf } from "../apps/tauri/src/chat/tauri-chat-drafts.ts";
import type { ChatDraft, ChatDraftsAt, DraftFiles } from "../apps/tauri/src/chat/tauri-chat-drafts.ts";
import { FLUSH_BEFORE_QUIT_EVENT, savesBeforeQuit } from "../apps/tauri/src/startup/saves-before-quit.ts";
import { TauriChatQueueShelf, queueKeptLink } from "../apps/tauri/src/chat/tauri-chat-queues.ts";
import type { QueuedFiles } from "../apps/tauri/src/chat/tauri-chat-queues.ts";
import { ChatSessions, ONE_CHAT_LINK } from "../apps/tauri/src/assistant/chat-sessions.ts";
import type { RunAnswer } from "../apps/tauri/src/assistant/turn-run.ts";
import { DEFAULT, FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally, waitFor } from "./check-helpers.ts";
import { layJsdomGlobals } from "./jsdom-globals.ts";

const DAILY = "3b0c1d7e-2f4a-4c55-9a1e-6d2b8f0c4a11";
const OTHER = "9e2f6a10-7b3c-4d8e-8f21-0c5d3a9b7e42";
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const TYPED = "the daily notes, half written";
const SETUP: AssistantSetup = {
	isReady: true,
	providerLabel: "Claude Code",
	providers: [
		{
			id: "claude-code",
			label: "Claude Code",
			canEdit: true,
			reads: {
				images: true,
				files: "path",
			},
		},
		{
			id: "codex",
			label: "Codex",
			canEdit: true,
			reads: {
				images: false,
				files: "none",
			},
		},
	],
	chosen: "claude-code",
	helperAgents: false,
	renderMarkdown: null,
};

const sent: string[] = [];
const chosen = { provider: "claude-code" };
const port: AssistantPort = {
	...NO_ASSISTANT,
	can: true,
	setup: async () => ({
		...SETUP,
		chosen: chosen.provider,
	}),
	chooseProvider: async (id) => {
		chosen.provider = id;
	},
	send: async (said) => {
		sent.push(said);
	},
};

const diskFiles = new Map<string, Uint8Array>();
const files: DraftFiles = {
	write: async (root, path, bytes) => {
		diskFiles.set(`${root}:${path}`, bytes);
	},
	read: async (root, path) => {
		const bytes = diskFiles.get(`${root}:${path}`);

		if (bytes === undefined) {
			throw new Error(`no file ${root}:${path}`);
		}

		return bytes;
	},
	remove: async (root, path) => {
		diskFiles.delete(`${root}:${path}`);
	},
};
const fake = new FakeStore();
const store = new StoreClient(fake.invoke, undefined);

function readShelf(): Promise<TauriChatDraftShelf> {
	return TauriChatDraftShelf.read({
		store,
		files,
		workspaceId: DEFAULT.id,
	});
}

function chatServerOver(shelf: TauriChatDraftShelf): StartedApp {
	const tempFiles = new Map<string, Uint8Array>();
	const attachmentFiles = new PrivateFolderAttachmentFilesGateway(
		{
			write: (path, data) => void tempFiles.set(path, data),
			remove: (path) => void tempFiles.delete(path),
			removeOlderThan: () => undefined,
		},
		"/attachments",
	);
	return app()
		.modules(
			AssistantModule.with({
				...portAssistantParts(port, attachmentFiles),
				claudeOptions: new CellClaudeOptionsGateway(claudeOptionsCell()),
				chatDrafts: new ShelfChatDraftsGateway(shelf, port),
			}),
		)
		.start({
			platform: "browser",
			scope: {
				workspaceId: "chat-drafts-test",
			},
		});
}

interface ComposerSeen {
	readonly said: string | null;
	readonly files: readonly string[];
	readonly effort: string | null;
}

async function opened(server: StartedApp, chatId: string): Promise<ComposerSeen> {
	const draft = await server.send(OpenChatDraftCommand, { chatId });
	const chips = await server.send(DraftAttachmentsQuery);
	const options = await server.send(ClaudeOptionsQuery);
	return {
		said: draft.ok ? draft.output.said : null,
		files: chips.ok ? chips.output.map(({ name }) => name) : [],
		effort: options.ok ? (options.output?.effort ?? null) : null,
	};
}

const firstShelf = await readShelf();
const frame = chatServerOver(firstShelf);
await opened(frame, DAILY);
await frame.send(AttachFilesCommand, { files: [new File([PNG], "shot.png")] });
await frame.send(HoldDraftTextCommand, { said: TYPED });
await frame.send(ChooseClaudeOptionCommand, { effort: "high" });
const inOther = await opened(frame, OTHER);
await frame.send(ChooseClaudeOptionCommand, { effort: "low" });
check("another chat opens with an empty composer and none of Daily's files", [inOther.said, inOther.files], ["", []]);
check("coming back to Daily brings its text, its image and its effort", await opened(frame, DAILY), {
	said: TYPED,
	files: ["shot.png"],
	effort: "high",
});

const remounted = chatServerOver(firstShelf);
check("a chat frame started again (the old one stopped) opens Daily whole", await opened(remounted, DAILY), {
	said: TYPED,
	files: ["shot.png"],
	effort: "high",
});

await firstShelf.flush();
const kept = fake.files.get(`workspace:${DEFAULT.id}:chat/drafts.json`);
check(
	"the draft is a workspace file and the image a file beside it",
	[
		kept === undefined
			? null
			: Object.keys(kept)
					.filter((key) => key.startsWith("chat:"))
					.map((key) => key.slice(5))
					.sort(),
		diskFiles.size,
	],
	[[DAILY, OTHER].sort(), 1],
);

const restartedShelf = await readShelf();
const restarted = chatServerOver(restartedShelf);
const afterRestart = await opened(restarted, DAILY);
const restoredFile = restartedShelf.draftOf(DAILY)?.attachments[0];
check(
	"after a restart Daily opens with its text, image bytes, preview and effort",
	[afterRestart, restoredFile?.bytes.length, restoredFile?.preview?.startsWith("data:image/png;base64,") ?? false],
	[
		{
			said: TYPED,
			files: ["shot.png"],
			effort: "high",
		},
		PNG.length,
		true,
	],
);
check("and the other chat keeps its own effort", (await opened(restarted, OTHER)).effort, "low");

const lateComposer = chatServerOver(restartedShelf);
await opened(lateComposer, DAILY);
await lateComposer.send(HoldDraftTextCommand, { said: "" });
check(
	"an empty hold from a composer that has not shown the text yet leaves the kept text alone",
	restartedShelf.draftOf(DAILY)?.said,
	TYPED,
);
await lateComposer.send(HoldDraftTextCommand, { said: TYPED });
await lateComposer.send(SendMessageCommand, { said: TYPED });
await lateComposer.send(HoldDraftTextCommand, { said: "" });
await restartedShelf.flush();
check(
	"sending empties the draft: no text, no files kept, the image sent",
	[
		restartedShelf.draftOf(DAILY)?.said ?? "",
		restartedShelf.draftOf(DAILY)?.attachments.length ?? 0,
		diskFiles.size,
		sent.length,
	],
	["", 0, 0, 1],
);

const NOTE = "e4a1b2c3-0d5f-4a6b-8c7d-9e0f1a2b3c4d";
const noteFrame = chatServerOver(restartedShelf);
await opened(noteFrame, NOTE);
await noteFrame.send(HoldDraftTextCommand, { said: "a short note" });
const noteAgain = chatServerOver(restartedShelf);
await opened(noteAgain, NOTE);
await noteAgain.send(HoldDraftTextCommand, { said: "a short note" });
await noteAgain.send(HoldDraftTextCommand, { said: "" });
check("text deleted right after it was put back is deleted for good", restartedShelf.draftOf(NOTE)?.said ?? "", "");

const providerFrame = chatServerOver(restartedShelf);
await opened(providerFrame, DAILY);
await providerFrame.send(ChooseProviderCommand, { id: "codex" });
await opened(providerFrame, OTHER);
await providerFrame.send(ChooseProviderCommand, { id: "claude-code" });
await opened(providerFrame, DAILY);
const dailyProvider = chosen.provider;
await restartedShelf.flush();
const providersRestarted = await readShelf();
await opened(chatServerOver(providersRestarted), OTHER);
const otherAfterRestart = chosen.provider;
await opened(chatServerOver(providersRestarted), DAILY);
check(
	"each chat keeps its provider, across a switch and a restart",
	[dailyProvider, otherAfterRestart, chosen.provider],
	["codex", "claude-code", "codex"],
);

layJsdomGlobals();
const { createElement: h, Suspense } = await import("react");
const { createRoot } = await import("react-dom/client");
const { AppProvider } = await import("../packages/shared/data-framework/src/index.ts");
const { useComposerDraft } = await import("../plugins/chat/src/features/assistant/lib/use-composer-draft.ts");
const RACE = "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f";
const FAST = "typed a moment before the switch";
interface ProbeHands {
	fill: ((text: string) => void) | null;
	send: (() => void) | null;
	settleSend: (isSent: boolean) => void;
}

function handsOf(): ProbeHands {
	return {
		fill: null,
		send: null,
		settleSend: () => undefined,
	};
}

function TypingProbe({ hands }: { readonly hands: ProbeHands }): null {
	const draft = useComposerDraft({
		busy: false,
		onSend: () =>
			new Promise<boolean>((settle) => {
				hands.settleSend = settle;
			}),
		onTyped: () => undefined,
	});
	hands.fill = draft.fill;
	hands.send = draft.sendDraft;
	return null;
}

async function probeOver(frame: StartedApp): Promise<ProbeHands> {
	const hands = handsOf();
	createRoot(document.createElement("div")).render(
		h(AppProvider, { app: frame }, h(Suspense, { fallback: null }, h(TypingProbe, { hands }))),
	);
	await waitFor(() => hands.fill !== null);
	return hands;
}

const raceFrame = chatServerOver(providersRestarted);
await opened(raceFrame, RACE);
const typing = await probeOver(raceFrame);
typing.fill?.(FAST);
const isHeldSoon = await waitFor(() => providersRestarted.draftOf(RACE)?.said === FAST, 100);
check(
	"typed text reaches the shelf at once, not 400 ms later: a frame removed right after keeps it",
	[isHeldSoon, (await opened(chatServerOver(providersRestarted), RACE)).said],
	[true, FAST],
);

const tempFolder = "/private/att";
function tempFiles(): QueuedFiles & { readonly held: Map<string, Uint8Array> } {
	const held = new Map<string, Uint8Array>();
	return {
		held,
		folder: tempFolder,
		write: (path, data) => void held.set(path, data),
		bytesOf: (path) => held.get(path) ?? null,
	};
}

const finishers: Array<() => void> = [];
const starts: string[] = [];
function sessionsOver(queues: TauriChatQueueShelf, files: QueuedFiles): ChatSessions {
	return new ChatSessions(queueKeptLink(ONE_CHAT_LINK, queues, files), async (_chatId, asked) => {
		starts.push(asked);
		const done = new Promise<RunAnswer>((finish) => {
			finishers.push(() => finish({ failure: null, failureKind: null, resumesAt: null }));
		});
		return {
			run: {
				stop: () => undefined,
				done,
			},
			providerId: "claude-code",
			resumesWithoutAnId: false,
		};
	});
}

const queueAt = {
	store,
	files,
	workspaceId: DEFAULT.id,
	ownWindow: "studio-1",
	liveWindows: async () => [],
};
const shotPath = `${tempFolder}/0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e-shot.png`;
const withShot = `look at this\n\n<attachments>\n- image "shot.png" (8 B): ${shotPath}\n</attachments>`;
const beforeRestart = tempFiles();
beforeRestart.write(shotPath, PNG);
const queuesBefore = await TauriChatQueueShelf.read(queueAt);
const working = await sessionsOver(queuesBefore, beforeRestart).sessionOf("chat-1");
void working.send("start the work");
await waitFor(() => working.now().busy);
await working.send(withShot);
await working.send("and this too");
const heldId = working.now().queued[1]?.id ?? "";
working.changeQueue({
	kind: "hold",
	id: heldId,
	isHeld: true,
});
await queuesBefore.flush();
const afterReboot = tempFiles();
const startsBeforeRestart = starts.length;
const restoredSession = await sessionsOver(await TauriChatQueueShelf.read(queueAt), afterReboot).sessionOf("chat-1");
const restoredQueue = restoredSession.now().queued;
const restoredPath = [...afterReboot.held.keys()][0] ?? "";
check(
	"after a reboot the queue comes back as it was, waiting: same order, held stays held, nothing sent",
	[
		restoredQueue.map(({ isHeld }) => isHeld),
		restoredQueue[1]?.text,
		starts.length - startsBeforeRestart,
		restoredSession.now().busy,
	],
	[[false, true], "and this too", 0, false],
);
check(
	"its image is put back into the attachments folder and the message names the new file",
	[
		afterReboot.held.get(restoredPath)?.length,
		restoredQueue[0]?.text.includes(restoredPath) ?? false,
		restoredPath === shotPath,
	],
	[PNG.length, true, false],
);

const SENDING = "7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a";
const sendFrame = chatServerOver(providersRestarted);
await opened(sendFrame, SENDING);
const sender = await probeOver(sendFrame);
sender.fill?.("send me");
await waitFor(() => providersRestarted.draftOf(SENDING)?.said === "send me");
sender.send?.();
await pause(40);
const whileSending = providersRestarted.draftOf(SENDING)?.said;
sender.settleSend(false);
await pause(40);
const afterFailedSend = providersRestarted.draftOf(SENDING)?.said;
sender.send?.();
await pause(40);
sender.settleSend(true);
const isClearedAfterSent = await waitFor(() => (providersRestarted.draftOf(SENDING)?.said ?? "") === "");
check(
	"the kept text stays while a message is being sent and after a failed send; it clears only once sent",
	[whileSending, afterFailedSend, isClearedAfterSent],
	["send me", "send me", true],
);

function pause(ms: number): Promise<void> {
	return new Promise((waited) => setTimeout(waited, ms));
}

const burstStore = new FakeStore();
const burst = await HeldDoc.read({
	store: new StoreClient(burstStore.invoke, undefined),
	root: "global",
	kind: {
		file: "burst.json",
		v: 1,
		schema: z.record(z.string(), z.unknown()),
	},
	empty: {},
});
const burstStarted = Date.now();
let firstWriteAfterMs: number | null = null;

for (let at = 0; at < 30; at += 1) {
	burst.change({ said: String(at) }, "typing without a pause");
	await pause(100);

	if (firstWriteAfterMs === null && burstStore.commandsCalled().includes("replace")) {
		firstWriteAfterMs = Date.now() - burstStarted;
	}
}

check(
	"typing without a pause still reaches disk within the 2 s ceiling",
	firstWriteAfterMs !== null && firstWriteAfterMs <= 2300,
	true,
);

interface QuitProbe {
	readonly steps: string[];
	readonly listeners: Map<string, () => void>;
}

async function quitProbeOver(unsaved: readonly string[]): Promise<QuitProbe> {
	const steps: string[] = [];
	const listeners = new Map<string, () => void>();
	await savesBeforeQuit(
		async () => {
			await pause(20);
			steps.push("saved");
			return unsaved;
		},
		{
			listen: async (event, heard) => void listeners.set(event, heard),
			tellListening: async () => void steps.push("listening"),
			tellFlushed: async (isSaved) => void steps.push(isSaved ? "told the app: saved" : "told the app: NOT saved"),
			page: {
				addEventListener: (event: string, heard: () => void) => void listeners.set(event, heard),
			},
			now: Date.now,
		},
	);
	return {
		steps,
		listeners,
	};
}

const quitting = await quitProbeOver([]);
quitting.listeners.get(FLUSH_BEFORE_QUIT_EVENT)?.();
await waitFor(() => quitting.steps.length === 3);
quitting.listeners.get("pagehide")?.();
await waitFor(() => quitting.steps.length === 4);
check("a window says it listens, saves before it tells the app to go on, and saves on pagehide too", quitting.steps, [
	"listening",
	"saved",
	"told the app: saved",
	"saved",
]);
const notSaving = await quitProbeOver(["workspace:x:chat/drafts.json chat:a"]);
notSaving.listeners.get(FLUSH_BEFORE_QUIT_EVENT)?.();
await waitFor(() => notSaving.steps.length === 3);
check("a save that did not land is told to the app as not saved", notSaving.steps.at(-1), "told the app: NOT saved");

const staleStore = new FakeStore();
const staleLeft = { count: 5 };
const staleInvoke: typeof staleStore.invoke = async (command, args) => {
	if (command.endsWith("|replace") && staleLeft.count > 0) {
		staleLeft.count -= 1;
		throw {
			code: "stale-rev",
			currentRev: 0,
		};
	}

	return staleStore.invoke(command, args);
};
const contested = await HeldDoc.read({
	store: new StoreClient(staleInvoke, undefined),
	root: "global",
	kind: {
		file: "contested.json",
		v: 1,
		schema: z.record(z.string(), z.unknown()),
	},
	empty: {},
});
contested.change({ "chat:a": "typed" }, "typing");
const landed = await contested.saveUntil(Date.now() + 2000);
const neverStore = new FakeStore();
const never = await HeldDoc.read({
	store: new StoreClient(async (command, args) => {
		if (command.endsWith("|replace")) {
			throw {
				code: "io",
				detail: "disk gone",
			};
		}

		return neverStore.invoke(command, args);
	}, undefined),
	root: "global",
	kind: {
		file: "never.json",
		v: 1,
		schema: z.record(z.string(), z.unknown()),
	},
	empty: {},
});
never.change({ "chat:b": "typed" }, "typing");
const unlanded = await never.saveUntil(Date.now() + 400);
check(
	"saving for a quit retries from a fresh read until it lands, and names what never landed",
	[landed, staleStore.files.get("global:contested.json")?.["chat:a"], unlanded],
	[[], "typed", ["global:never.json chat:b"]],
);

interface TestDisk {
	readonly files: DraftFiles;
	readonly held: Map<string, Uint8Array>;
	readonly failReadsOnce: Set<string>;
	readonly failWritesOnce: Set<string>;
}

function diskOf(held: Map<string, Uint8Array> = new Map()): TestDisk {
	const failReadsOnce = new Set<string>();
	const failWritesOnce = new Set<string>();
	return {
		held,
		failReadsOnce,
		failWritesOnce,
		files: {
			write: async (root, path, bytes) => {
				if (failWritesOnce.delete(path)) {
					throw new Error("disk full");
				}

				held.set(`${root}:${path}`, bytes);
			},
			read: async (root, path) => {
				const bytes = held.get(`${root}:${path}`);

				if (failReadsOnce.delete(path) || bytes === undefined) {
					throw new Error(`no file ${path}`);
				}

				return bytes;
			},
			remove: async (root, path) => void held.delete(`${root}:${path}`),
		},
	};
}

const SHOT_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const shot = {
	id: SHOT_ID,
	name: "shot.png",
	kind: "image" as const,
	mime: "image/png",
	bytes: PNG,
	preview: null,
	path: null,
};
const draftWith = (said: string): ChatDraft => ({
	said,
	attachments: [shot],
	choices: null,
	provider: null,
});
const draftsFile = `workspace:${DEFAULT.id}:chat/drafts.json`;

const attachStore = new FakeStore();
const attachShelf = await TauriChatDraftShelf.read({
	store: new StoreClient(attachStore.invoke, undefined),
	files: diskOf().files,
	workspaceId: DEFAULT.id,
});
attachShelf.keep(DAILY, draftWith(""));
check(
	"an attached file is in the draft file at once, not after the 400 ms wait",
	await waitFor(() => JSON.stringify(attachStore.files.get(draftsFile) ?? {}).includes("shot.png"), 150),
	true,
);

const sharedStore = new FakeStore();
const hearings: Array<(payload: unknown) => void> = [];
const windowStore = (label: string): StoreClient =>
	new StoreClient(sharedStore.invoke, {
		ownLabel: label,
		listen: (_event, heard) => void hearings.push(heard),
	});
const sharedDisk = diskOf();
const sharedAt = (label: string): ChatDraftsAt => ({
	store: windowStore(label),
	files: sharedDisk.files,
	workspaceId: DEFAULT.id,
});
const windowA = await TauriChatDraftShelf.read(sharedAt("a"));
const windowB = await TauriChatDraftShelf.read(sharedAt("b"));
windowA.keep(DAILY, draftWith("typed in window a"));
windowB.keep(OTHER, draftWith("typed in window b"));
await windowA.flush();
await windowB.flush();
const thirdWindow = await TauriChatDraftShelf.read(sharedAt("c"));
check(
	"two windows writing different chats keep both",
	[thirdWindow.draftOf(DAILY)?.said, thirdWindow.draftOf(OTHER)?.said],
	["typed in window a", "typed in window b"],
);
windowA.keep(DAILY, draftWith("changed again in window a"));
await windowA.flush();
const sharedRev = Number(sharedStore.files.get(draftsFile)?.["rev"] ?? 0);
hearings.forEach((heard) =>
	heard({
		root: `workspace:${DEFAULT.id}`,
		file: "chat/drafts.json",
		rev: sharedRev,
		by: "a",
	}),
);
check(
	"a window hears another window's change to a chat and shows it",
	await waitFor(() => windowB.draftOf(DAILY)?.said === "changed again in window a"),
	true,
);

const queuesFile = `workspace:${DEFAULT.id}:chat/queues.json`;
sharedStore.put(queuesFile, {
	v: 2,
	rev: 1,
	"chat:q@gone": [
		{
			id: "1-1",
			text: "queued before the crash",
			isHeld: false,
			files: [],
		},
	],
});
const queueWindow = async (label: string): Promise<TauriChatQueueShelf> =>
	TauriChatQueueShelf.read({
		...sharedAt(label),
		ownWindow: label,
		liveWindows: async () => ["a", "b"],
	});
const [queueA, queueB] = await Promise.all([queueWindow("a"), queueWindow("b")]);
const claimed = await Promise.all([queueA.queuedOf("q", tempFiles()), queueB.queuedOf("q", tempFiles())]);
check(
	"a queue left by a closed window comes back in exactly one window",
	claimed.map((queue) => queue.length).sort(),
	[0, 1],
);
check(
	"the taken queue is on disk under its new window before anything else is written",
	JSON.stringify(sharedStore.files.get(queuesFile) ?? {}).includes("queued before the crash"),
	true,
);

const unreadDisk = diskOf();
const unreadStore = new FakeStore();
const unreadAt = (retryAfterMs: readonly number[]): ChatDraftsAt => ({
	store: new StoreClient(unreadStore.invoke, undefined),
	files: unreadDisk.files,
	workspaceId: DEFAULT.id,
	retryAfterMs,
});
const seeded = await TauriChatDraftShelf.read(unreadAt([10]));
seeded.keep(DAILY, draftWith("with a picture"));
await seeded.flush();
unreadDisk.failReadsOnce.add(`chat/drafts/${DAILY}/${SHOT_ID}.bin`);
const unreadShelf = await TauriChatDraftShelf.read(unreadAt([150]));
const openedUnread = await chatServerOver(unreadShelf).send(OpenChatDraftCommand, { chatId: DAILY });
const noticeOnOpen = openedUnread.ok && openedUnread.output.notice !== null;
const notice = unreadShelf.problemOf(DAILY);
unreadShelf.keep(DAILY, {
	...(unreadShelf.draftOf(DAILY) ?? draftWith("")),
	said: "edited while the file could not be read",
});
await unreadShelf.flush();
const stillListed = JSON.stringify(unreadStore.files.get(draftsFile) ?? {}).includes("shot.png");
const isReadOnRetry = await waitFor(() => (unreadShelf.draftOf(DAILY)?.attachments.length ?? 0) === 1, 1000);
check(
	"a file that cannot be read back stays listed, is said to the person, and comes back on a retry",
	[noticeOnOpen, notice?.includes("shot.png") ?? false, stillListed, isReadOnRetry, unreadShelf.problemOf(DAILY)],
	[true, true, true, true, null],
);

const unwrittenDisk = diskOf();
unwrittenDisk.failWritesOnce.add(`chat/drafts/${OTHER}/${SHOT_ID}.bin`);
const unwrittenShelf = await TauriChatDraftShelf.read({
	store: new StoreClient(new FakeStore().invoke, undefined),
	files: unwrittenDisk.files,
	workspaceId: DEFAULT.id,
	retryAfterMs: [100],
});
unwrittenShelf.keep(OTHER, draftWith(""));
const writeNotice = await waitFor(() => unwrittenShelf.problemOf(OTHER) !== null, 100);
const isWrittenOnRetry = await waitFor(
	() => unwrittenDisk.held.size === 1 && unwrittenShelf.problemOf(OTHER) === null,
	1000,
);
check(
	"a file that cannot be written is said to the person and written on a retry",
	[writeNotice, isWrittenOnRetry],
	[true, true],
);

const legacyStore = new FakeStore();
legacyStore.put(draftsFile, {
	v: 1,
	rev: 1,
	drafts: {
		[DAILY]: {
			said: "legacy daily",
			attachments: [],
			choices: null,
			provider: null,
		},
		[OTHER]: {
			said: "legacy other",
			attachments: [],
			choices: null,
			provider: null,
		},
	},
});
const legacyAt = (): ChatDraftsAt => ({
	store: new StoreClient(legacyStore.invoke, undefined),
	files: diskOf().files,
	workspaceId: DEFAULT.id,
});
const legacyShelf = await TauriChatDraftShelf.read(legacyAt());
const movedKeys = Object.keys(legacyStore.files.get(draftsFile) ?? {}).filter(
	(key) => key === "drafts" || key.startsWith("chat:"),
);
legacyShelf.keep(DAILY, {
	...(legacyShelf.draftOf(DAILY) ?? draftWith("")),
	said: "legacy daily edited",
});
await legacyShelf.flush();
const afterLegacy = await TauriChatDraftShelf.read(legacyAt());
check(
	"drafts from the one-key file all move to their own entries on read; editing one keeps the others",
	[movedKeys.sort(), afterLegacy.draftOf(DAILY)?.said, afterLegacy.draftOf(OTHER)?.said],
	[[`chat:${DAILY}`, `chat:${OTHER}`].sort(), "legacy daily edited", "legacy other"],
);

const lazyDisk = diskOf();
const lazyReads: string[] = [];
const countedFiles: DraftFiles = {
	...lazyDisk.files,
	read: async (root, path) => {
		lazyReads.push(path);
		return lazyDisk.files.read(root, path);
	},
};
const lazyStore = new FakeStore();
const lazyAt = (): ChatDraftsAt => ({
	store: new StoreClient(lazyStore.invoke, undefined),
	files: countedFiles,
	workspaceId: DEFAULT.id,
});
const lazySeed = await TauriChatDraftShelf.read(lazyAt());
lazySeed.keep(DAILY, draftWith("a draft with a picture"));
lazySeed.keep(OTHER, draftWith("another draft with a picture"));
await lazySeed.flush();
const lazyShelf = await TauriChatDraftShelf.read(lazyAt());
const readsAtStart = lazyReads.length;
const listedAtStart = lazyShelf.draftOf(DAILY)?.said;
await opened(chatServerOver(lazyShelf), DAILY);
check(
	"startup reads no draft file; opening a chat reads only that chat's",
	[readsAtStart, listedAtStart, lazyReads.length, lazyShelf.draftOf(DAILY)?.attachments.length],
	[0, "a draft with a picture", 1, 1],
);
lazyShelf.keep(OTHER, {
	...(lazyShelf.draftOf(OTHER) ?? draftWith("")),
	said: "edited before it was opened",
});
await lazyShelf.flush();
const otherOnDisk = JSON.stringify(lazyStore.files.get(draftsFile)?.[`chat:${OTHER}`] ?? {});
check(
	"a chat edited before its files were read keeps them listed and on disk",
	[otherOnDisk.includes("shot.png"), lazyDisk.held.size],
	[true, 2],
);

console.log(tally.failed ? `chat drafts: ${tally.failed} check(s) failed` : "chat drafts: all checks passed");
process.exit(tally.failed ? 1 : 0);
