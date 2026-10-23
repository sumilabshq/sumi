import type { Invoke } from "../packages/host-tauri/src/store/store-invoke.ts";
import type { WorkspaceEntry } from "../packages/host-tauri/src/workspace/workspace-docs.ts";

export type Doc = Record<string, unknown>;

interface Call {
	readonly command: string;
	readonly args: Readonly<Record<string, unknown>>;
}

export const DEFAULT: WorkspaceEntry = {
	id: "0b5e0f7c-6a8d-5d1e-9c3a-7f2b4c1d9e8a",
	name: "Default",
	folder: null,
	folderFound: false,
	lastOpenedAt: 1,
	recentFolders: [],
};

export const RESEARCH: WorkspaceEntry = {
	id: "6f1d2a4e-8a43-4c8e-9f55-0a6a4f1d2b3c",
	name: "Research",
	folder: "/tmp/gone",
	folderFound: false,
	lastOpenedAt: 2,
	recentFolders: [],
};

export function refuse(refusal: Readonly<Record<string, unknown>>): never {
	throw refusal;
}

export class FakeStore {
	readonly files = new Map<string, Doc>();
	readonly lines = new Map<string, unknown[]>();
	readonly calls: Call[] = [];
	readonly known = new Map<string, WorkspaceEntry>();
	refusesFirst = false;
	answerOverride: unknown = undefined;

	invoke: Invoke = async (command, args) => {
		this.calls.push({ command, args });
		if (this.answerOverride !== undefined) {
			return this.answerOverride;
		}

		return this.answer(command.replace("plugin:store|", ""), args);
	};

	put(key: string, doc: Doc): void {
		this.files.set(key, doc);
	}

	commandsCalled(): string[] {
		return this.calls.map((call) => call.command.replace("plugin:store|", ""));
	}

	private answer(command: string, args: Readonly<Record<string, unknown>>): unknown {
		const key = `${String(args["root"])}:${String(args["path"])}`;
		const answers: Readonly<Record<string, () => unknown>> = {
			read: () => this.read(key),
			replace: () => this.replace(key, args),
			append: () => void this.lines.set(key, [...(this.lines.get(key) ?? []), args["line"]]),
			read_lines: () => this.readLines(key),
			list_workspaces: () => [...this.known.values()],
			rename_workspace: () => null,
			attach_workspace_folder: () => this.known.get(String(args["id"])) ?? null,
			mark_workspace_opened: () => this.known.get(String(args["id"])) ?? refuse({ code: "no-workspace" }),
		};
		const answered = answers[command];
		if (answered !== undefined) {
			return answered();
		}

		if (this.refusesFirst) {
			refuse({ code: "io", detail: "disk full" });
		}

		return DEFAULT;
	}

	private read(key: string): unknown {
		const doc = this.files.get(key);
		return {
			doc: doc ?? null,
			rev: typeof doc?.["rev"] === "number" ? doc["rev"] : 0,
			quarantined: null,
		};
	}

	private readLines(key: string): unknown {
		const newestFirst = [...(this.lines.get(key) ?? [])].reverse();
		const seen = new Set<unknown>();
		const kept = newestFirst.filter((line) => {
			const id: unknown = typeof line === "object" && line !== null ? Reflect.get(line, "id") : undefined;
			const isRepeat = seen.has(id);
			seen.add(id);
			return !isRepeat;
		});
		return {
			lines: kept.reverse(),
			cursor: 0,
			hasEarlier: false,
			tornTail: false,
		};
	}

	private replace(key: string, args: Readonly<Record<string, unknown>>): unknown {
		const currentRev = Number(this.files.get(key)?.["rev"] ?? 0);
		if (args["baseRev"] !== currentRev) {
			throw { code: "stale-rev", currentRev };
		}

		const doc: unknown = args["doc"];
		this.files.set(key, {
			...(typeof doc === "object" && doc !== null ? doc : {}),
			rev: currentRev + 1,
		});
		return { rev: currentRev + 1 };
	}
}

export async function quietly<Answer>(run: () => Promise<Answer>): Promise<{ answer: Answer; infos: string[] }> {
	const infos: string[] = [];
	const { info, warn, error } = console;
	console.info = (...said: unknown[]) => void infos.push(said.map(String).join(" "));
	console.warn = () => undefined;
	console.error = () => undefined;
	try {
		return { answer: await run(), infos };
	} finally {
		Object.assign(console, { info, warn, error });
	}
}
