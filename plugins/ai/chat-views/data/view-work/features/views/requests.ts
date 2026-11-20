import { fileSystem } from "@sumi/contract";
import { AuthenticatedGuard, PerCall, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import {
	CHAT_VIEW_URI,
	DuplicateViewAskSchema,
	OneViewAskSchema,
	ReadViewSchema,
	RemovedViewSchema,
	SavedViewSchema,
	SavedViewsSchema,
	ShowViewAskSchema,
	ShownViewSchema,
} from "../../shared/schema/view-work.schema.js";
import { builtInViewOf, builtInViews, libraryFolderOf, newViewIdOf, ownViewOf, ownViewsOf, viewPathOf, writtenViewOf } from "./lib/view-library.js";
import { lintedViewOf, refusalOf } from "./lib/view-lint.js";

const GUIDE_FIRST = "Call view-work_guide_read first: every view is checked against its rules.";
const NO_VIEW = "There is no saved view {id}; view-work_views_saved lists them.";
const BUILT_IN_KEPT = "{id} is built into Sumi and never changes. Copy it with view-work_views_duplicate, then change the copy by its new id.";

export const show = command()
	.public()
	.metadata({
		description:
			"Show a view in this chat: an HTML fragment Sumi draws inline as part of your reply, styled by Sumi, and saved to the person's view library. Read view-work_guide_read once before the first. Draw one only when seeing beats reading; no view is the default.",
		mcp: {
			kind: "other",
			running: "Drawing",
			done: "Drew",
			shows: "title",
			ui: { resourceUri: CHAT_VIEW_URI },
		},
	})
	.input(ShowViewAskSchema)
	.output(ShownViewSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ guideRead, title, purpose, html, id }, { send, templates }) => {
		if (!guideRead) {
			return refuse(GUIDE_FIRST);
		}

		if (id !== null && builtInViewOf(templates, id) !== null) {
			return refuse(BUILT_IN_KEPT.replace("{id}", id));
		}

		const problems = lintedViewOf(html);

		if (problems.length > 0) {
			return refuse(refusalOf(problems));
		}

		const folder = await libraryFolderOf(send);

		if (id !== null && (await ownViewOf(send, folder, id)) === null) {
			return refuse(NO_VIEW.replace("{id}", id));
		}

		const viewId = id ?? newViewIdOf(title, Date.now());
		const path = await writtenViewOf(send, folder, {
			id: viewId,
			title,
			purpose,
			updatedMs: Date.now(),
			html,
		});
		return {
			id: viewId,
			title,
			path,
			builtIn: false,
		};
	});

export const saved = command()
	.public()
	.metadata({
		description:
			"List the views in the person's library, theirs newest first, then the built-in ones Sumi ships: id, title, purpose and whether it is built in. Look here before drawing: a view for the same kind of answer is a start to adapt.",
		mcp: {
			kind: "read",
			running: "Looking through saved views",
			done: "Looked through saved views",
		},
	})
	.output(SavedViewsSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async (_asked, { send, templates }) => [...(await ownViewsOf(send, await libraryFolderOf(send))), ...builtInViews(templates)]);

export const read = command()
	.public()
	.metadata({
		description: "Read one saved or built-in view whole, its HTML included, to adapt it for a new answer or lift a part of it.",
		mcp: {
			kind: "read",
			running: "Reading the view",
			done: "Read the view",
			shows: "id",
		},
	})
	.input(OneViewAskSchema)
	.output(ReadViewSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ id }, { send, templates }) => {
		const view = builtInViewOf(templates, id) ?? (await ownViewOf(send, await libraryFolderOf(send), id));
		return view ?? refuse(NO_VIEW.replace("{id}", id));
	});

export const showSaved = command()
	.public()
	.metadata({
		description: "Show a saved or built-in view in this chat again as it is, without writing it out.",
		mcp: {
			kind: "read",
			running: "Showing",
			done: "Showed",
			shows: "id",
			ui: { resourceUri: CHAT_VIEW_URI },
		},
	})
	.input(OneViewAskSchema)
	.output(ShownViewSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ id }, { send, templates }) => {
		const builtIn = builtInViewOf(templates, id);

		if (builtIn !== null) {
			return {
				id,
				title: builtIn.title,
				path: null,
				builtIn: true,
			};
		}

		const folder = await libraryFolderOf(send);
		const own = await ownViewOf(send, folder, id);

		if (own === null) {
			return refuse(NO_VIEW.replace("{id}", id));
		}

		return {
			id,
			title: own.title,
			path: viewPathOf(folder, id),
			builtIn: false,
		};
	});

export const duplicate = command()
	.public()
	.metadata({
		description:
			"Copy a built-in or saved view into the person's library under a new id, to change the copy. Built-in views never change themselves; this is how one becomes the person's own.",
		mcp: {
			kind: "other",
			running: "Copying the view",
			done: "Copied the view",
			shows: "id",
		},
	})
	.input(DuplicateViewAskSchema)
	.output(SavedViewSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ id, title }, { send, templates }) => {
		const folder = await libraryFolderOf(send);
		const source = builtInViewOf(templates, id) ?? (await ownViewOf(send, folder, id));

		if (source === null) {
			return refuse(NO_VIEW.replace("{id}", id));
		}

		const copyTitle = title ?? source.title;
		const copy = {
			id: newViewIdOf(copyTitle, Date.now()),
			title: copyTitle,
			purpose: source.purpose,
			updatedMs: Date.now(),
			html: source.html,
		};
		await writtenViewOf(send, folder, copy);
		return {
			id: copy.id,
			title: copy.title,
			purpose: copy.purpose,
			updatedMs: copy.updatedMs,
			builtIn: false,
		};
	});

export const remove = command()
	.public()
	.metadata({
		description: "Remove one of the person's saved views from their library, only when the person asked for it. Built-in views cannot be removed.",
		mcp: {
			kind: "other",
			running: "Removing the view",
			done: "Removed the view",
			shows: "id",
		},
	})
	.input(OneViewAskSchema)
	.output(RemovedViewSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ id }, { send, templates }) => {
		if (builtInViewOf(templates, id) !== null) {
			return refuse(BUILT_IN_KEPT.replace("{id}", id));
		}

		const path = viewPathOf(await libraryFolderOf(send), id);

		if (!(await send(fileSystem.files.info, { path })).exists) {
			return {
				id,
				removed: false,
			};
		}

		await send(fileSystem.files.remove, { path });
		return {
			id,
			removed: true,
		};
	});
