import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { AttachedFilesReach, ProviderReads } from "@widgetarium/core/engine/assistant-port.js";

export interface ProviderFacts {
	readonly id: string;
	readonly label: string;
	readonly found: boolean;
	readonly outputFormat: string;
	readonly resumesWithoutAnId: boolean;
	readonly compacts: boolean;
	readonly reads: ProviderReads;
}

export interface ProvidersAnswer {
	readonly project: string | null;
	readonly attachmentsFolder: string;
	readonly providers: readonly ProviderFacts[];
}

export type TurnEvent =
	| { readonly kind: "out"; readonly text: string }
	| { readonly kind: "err"; readonly text: string }
	| { readonly kind: "exited"; readonly code: number | null };

export interface ClaudeStart {
	readonly mode: string;
	readonly model: string;
	readonly effort: string;
}

export interface TurnStart {
	readonly providerId: string;
	readonly prompt: string;
	readonly resume: string | null;
	readonly claude: ClaudeStart | null;
	readonly folders: readonly string[];
	readonly chatId: string | null;
}

export interface DroppedEntry {
	readonly path: string;
	readonly name: string;
	readonly kind: "file" | "folder";
	readonly size: number;
}

export interface AssistantBridge {
	providers(): Promise<ProvidersAnswer>;
	startTurn(start: TurnStart, onEvent: (event: TurnEvent) => void): Promise<number>;
	stopTurn(turnId: number): Promise<void>;
	writeAttachment(path: string, bytes: Uint8Array): Promise<void>;
	removeAttachment(path: string): Promise<void>;
	sweepAttachments(ageMs: number): Promise<void>;
	pickFolder(): Promise<string | null>;
	dropPaths(paths: readonly string[]): Promise<readonly DroppedEntry[]>;
	readDropped(path: string): Promise<Uint8Array<ArrayBuffer>>;
}

export interface IpcOptions {
	readonly headers: Readonly<Record<string, string>>;
}

export interface TauriIpc {
	invoke(
		command: string,
		args?: Readonly<Record<string, unknown>> | Uint8Array,
		options?: IpcOptions,
	): Promise<unknown>;
	channel(onMessage: (message: unknown) => void): unknown;
}

export const ATTACHMENT_PATH_HEADER = "x-widgetarium-attachment";

const COMMAND = "plugin:assistant|{name}";

const NOT_PROVIDERS = "The assistant answered its providers in a shape Widgetarium cannot read";

const NOT_A_TURN = "The assistant answered a started turn without its id";

const NOT_A_FOLDER = "The assistant answered a picked folder that is not a path";

const NOT_DROPPED = "The assistant answered dropped paths in a shape Widgetarium cannot read";

const NOT_BYTES = "The assistant answered a dropped file without its bytes";

const FILES_REACHES: readonly AttachedFilesReach[] = ["path", "inline", "none"];

export function providersAnswerIn(held: unknown): ProvidersAnswer {
	const providers = isObject(held) && Array.isArray(held["providers"]) ? held["providers"].map(providerFactsIn) : null;
	const project = isObject(held) ? held["project"] : undefined;
	const attachmentsFolder = isObject(held) ? held["attachmentsFolder"] : undefined;
	const isProject = project === null || typeof project === "string";

	if (providers === null || providers.includes(null) || !isProject || typeof attachmentsFolder !== "string") {
		throw new Error(NOT_PROVIDERS);
	}

	return { project, attachmentsFolder, providers: providers.filter((facts) => facts !== null) };
}

export function turnEventIn(held: unknown): TurnEvent | null {
	if (!isObject(held)) {
		return null;
	}

	const { kind, text, code } = held;
	if ((kind === "out" || kind === "err") && typeof text === "string") {
		return { kind, text };
	}

	return kind === "exited" && (code === null || typeof code === "number") ? { kind, code } : null;
}

export function tauriAssistantBridge(ipc: TauriIpc): AssistantBridge {
	const call = (name: string, args?: Readonly<Record<string, unknown>>): Promise<unknown> =>
		ipc.invoke(commandNamed(name), args);
	return {
		providers: async () => providersAnswerIn(await call("providers")),
		startTurn: async ({ providerId, prompt, resume, claude, folders, chatId }, onEvent) => {
			const onEventChannel = ipc.channel((message) => {
				const event = turnEventIn(message);
				if (event !== null) {
					onEvent(event);
				}
			});
			return turnIdIn(
				await call("start_turn", { providerId, prompt, resume, claude, folders, chatId, onEvent: onEventChannel }),
			);
		},
		stopTurn: async (turnId) => void (await call("stop_turn", { turnId })),
		writeAttachment: async (path, bytes) =>
			void (await ipc.invoke(commandNamed("write_attachment"), bytes, {
				headers: { [ATTACHMENT_PATH_HEADER]: path },
			})),
		removeAttachment: async (path) => void (await call("remove_attachment", { path })),
		sweepAttachments: async (ageMs) => void (await call("sweep_attachments", { ageMs })),
		pickFolder: async () => pickedFolderIn(await call("pick_folder")),
		dropPaths: async (paths) => droppedEntriesIn(await call("drop_paths", { paths })),
		readDropped: async (path) => droppedBytesIn(await call("read_dropped", { path })),
	};
}

export function pickedFolderIn(held: unknown): string | null {
	if (held === null) {
		return null;
	}

	if (typeof held !== "string" || !held.startsWith("/")) {
		throw new Error(NOT_A_FOLDER);
	}

	return held;
}

export function droppedEntriesIn(held: unknown): readonly DroppedEntry[] {
	const entries = Array.isArray(held) ? held.map(droppedEntryIn) : null;

	if (entries === null || entries.includes(null)) {
		throw new Error(NOT_DROPPED);
	}

	return entries.filter((entry) => entry !== null);
}

export function droppedBytesIn(held: unknown): Uint8Array<ArrayBuffer> {
	if (held instanceof ArrayBuffer) {
		return new Uint8Array(held);
	}

	if (Array.isArray(held) && held.every((byte) => typeof byte === "number")) {
		return Uint8Array.from(held);
	}

	throw new Error(NOT_BYTES);
}

const commandNamed = (name: string): string => COMMAND.replace("{name}", name);

function readsIn(held: unknown): ProviderReads | null {
	if (!isObject(held) || typeof held["images"] !== "boolean") {
		return null;
	}

	const files = FILES_REACHES.find((reach) => reach === held["files"]);
	const mostAttached = held["mostAttached"];

	if (files === undefined) {
		return null;
	}

	return typeof mostAttached === "number"
		? { images: held["images"], files, mostAttached }
		: { images: held["images"], files };
}

function providerFactsIn(held: unknown): ProviderFacts | null {
	if (!isObject(held)) {
		return null;
	}

	const { id, label, found, outputFormat, resumesWithoutAnId } = held;
	const reads = readsIn(held["reads"]);
	const isText = typeof id === "string" && typeof label === "string" && typeof outputFormat === "string";
	const isFlags = typeof found === "boolean" && typeof resumesWithoutAnId === "boolean";
	const compacts = held["compacts"] === true;

	return isText && isFlags && reads !== null
		? { id, label, found, outputFormat, resumesWithoutAnId, compacts, reads }
		: null;
}

function turnIdIn(held: unknown): number {
	if (typeof held !== "number") {
		throw new Error(NOT_A_TURN);
	}

	return held;
}

function droppedEntryIn(held: unknown): DroppedEntry | null {
	if (!isObject(held)) {
		return null;
	}

	const { path, name, kind, size } = held;
	const isKind = kind === "file" || kind === "folder";
	const isNamed = typeof path === "string" && path.startsWith("/") && typeof name === "string";

	return isNamed && isKind && typeof size === "number"
		? {
				path,
				name,
				kind,
				size,
			}
		: null;
}
