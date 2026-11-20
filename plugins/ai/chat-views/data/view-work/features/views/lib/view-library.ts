import { fileSystem, terminal } from "@sumi/contract";
import type { Send } from "@widgetarium/data-framework";
import { StoredViewSchema } from "../../../shared/schema/view-work.schema.js";
import type { ViewTemplate } from "../../../shared/host/view-parts.host.js";
import type { ReadView, SavedView, StoredView } from "../../../shared/schema/view-work.schema.js";

const LIBRARY_FOLDER = "{home}/.sumi/views";
const VIEW_FILE = "{folder}/{id}.json";
const VIEW_EXTENSION = ".json";
const NO_HOME = "Sumi could not find the home folder for the view library: {reason}";
const UNREADABLE = "[view-work] {path} is not a saved view, skipped: {reason}";
const LONGEST_SLUG = 40;
const NEUTRAL_SLUG = "view";
const BUILT_IN_UPDATED_MS = 0;

export async function libraryFolderOf(send: Send): Promise<string> {
	const printed = await send(terminal.programs.run, {
		folder: "/",
		program: "printenv",
		args: ["HOME"],
	});
	const home = printed.out.trim();

	if (printed.code !== 0 || !home.startsWith("/")) {
		throw new Error(NO_HOME.replace("{reason}", printed.err.trim() || "HOME is empty"));
	}

	return LIBRARY_FOLDER.replace("{home}", home);
}

export function viewPathOf(folder: string, id: string): string {
	return VIEW_FILE.replace("{folder}", folder).replace("{id}", id);
}

export function storedViewText(view: StoredView): string {
	return JSON.stringify(view, null, "\t");
}

export function newViewIdOf(title: string, nowMs: number): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, LONGEST_SLUG)
		.replace(/-+$/, "");
	return `${slug === "" ? NEUTRAL_SLUG : slug}-${nowMs.toString(36)}`;
}

export function builtInViewOf(templates: readonly ViewTemplate[], id: string): ReadView | null {
	const template = templates.find((one) => one.id === id);

	if (template === undefined) {
		return null;
	}

	return {
		...template,
		updatedMs: BUILT_IN_UPDATED_MS,
		builtIn: true,
	};
}

export function builtInViews(templates: readonly ViewTemplate[]): readonly SavedView[] {
	return templates.map(({ id, title, purpose }) => ({
		id,
		title,
		purpose,
		updatedMs: BUILT_IN_UPDATED_MS,
		builtIn: true,
	}));
}

export async function ownViewOf(send: Send, folder: string, id: string): Promise<ReadView | null> {
	const path = viewPathOf(folder, id);

	if (!(await send(fileSystem.files.info, { path })).exists) {
		return null;
	}

	const stored = await storedViewAt(send, path);
	return stored === null
		? null
		: {
				...stored,
				builtIn: false,
			};
}

export async function ownViewsOf(send: Send, folder: string): Promise<readonly SavedView[]> {
	const info = await send(fileSystem.files.info, { path: folder });

	if (!info.exists) {
		return [];
	}

	const listed = await send(fileSystem.files.readFolder, { path: folder });
	const files = listed.entries.filter(({ kind, name }) => kind === "file" && name.endsWith(VIEW_EXTENSION));
	const read = await Promise.all(files.map(({ name }) => storedViewAt(send, `${folder}/${name}`)));
	return read
		.filter((view): view is StoredView => view !== null)
		.sort((a, b) => b.updatedMs - a.updatedMs)
		.map(({ id, title, purpose, updatedMs }) => ({
			id,
			title,
			purpose,
			updatedMs,
			builtIn: false,
		}));
}

export async function writtenViewOf(send: Send, folder: string, view: StoredView): Promise<string> {
	const path = viewPathOf(folder, view.id);
	await send(fileSystem.files.makeFolder, { path: folder });
	await send(fileSystem.files.write, {
		path,
		content: storedViewText(view),
	});
	return path;
}

async function storedViewAt(send: Send, path: string): Promise<StoredView | null> {
	const text = await send(fileSystem.files.read, { path });
	const parsed = StoredViewSchema.safeParse(jsonOf(text));

	if (!parsed.success) {
		console.warn(UNREADABLE.replace("{path}", path).replace("{reason}", parsed.error.message));
		return null;
	}

	return parsed.data;
}

function jsonOf(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
