import { z } from "zod";
import { MAIN_STUDIO_WINDOW, placesWindowOf } from "@widgetarium/behaviors";
import { workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { keptPanesOf } from "../../../shared/lib/panes/kept-panes.js";
import { treeLeavingSplit } from "../../../shared/lib/panes/split-boards.js";
import { WindowViewSchema } from "../../../shared/schema/tabs.schema.js";
import type { PlacedTabs, WindowView } from "../../../shared/schema/tabs.schema.js";
import type { PaneTree } from "../../../shared/schema/pane-tree.schema.js";

const OldViewDocSchema = z.record(z.string(), z.unknown());

type OldViewDoc = z.infer<typeof OldViewDocSchema>;

const SESSION_FILE = "session.json";
const MAIN_PANES_KEY = "panes";
const WINDOW_PANES_KEY = "panes:";
const SPLIT_COPY_PREFIX = "pane-split-";

export interface OldViews {
	readonly session: OldViewDoc;
	readonly windowDocs: Readonly<Record<string, OldViewDoc>>;
}

export interface CarriedViews {
	readonly placed: PlacedTabs;
	readonly said: readonly string[];
}

export async function oldViewsOf(store: StoreClient, workspaceId: string): Promise<OldViews> {
	const session = await oldDocOf(store, workspaceId, SESSION_FILE);
	const others = oldLabelsOf(session).filter((label) => label !== MAIN_STUDIO_WINDOW);
	const windowDocs = await Promise.all(
		others.map(async (label) => [label, await oldDocOf(store, workspaceId, `window-${label}.json`)] as const),
	);
	return {
		session,
		windowDocs: Object.fromEntries(windowDocs),
	};
}

export function viewsCarried(placed: PlacedTabs, old: OldViews, workspaceId: string): CarriedViews {
	return oldLabelsOf(old.session).reduce<CarriedViews>(
		(was, label) => viewCarried(was, { label, old, window: placesWindowOf(label, workspaceId) }),
		{ placed, said: [] },
	);
}

interface CarriedWindow {
	readonly label: string;
	readonly window: string;
	readonly old: OldViews;
}

function viewCarried(was: CarriedViews, { label, window, old }: CarriedWindow): CarriedViews {
	const view = was.placed.views[window] ?? WindowViewSchema.parse({ shownId: null });
	const panes = view.panes === undefined ? oldPanesOf(old.session, label) : null;
	const isMain = label === MAIN_STUDIO_WINDOW;
	const oldHidden = isMain ? old.session["leftHidden"] : old.windowDocs[label]?.["leftHidden"];
	const leftHidden = view.leftHidden === undefined && typeof oldHidden === "boolean" ? oldHidden : null;

	if (panes === null && leftHidden === null) {
		return was;
	}

	const carried: WindowView = {
		...view,
		...(panes === null ? {} : { panes }),
		...(leftHidden === null ? {} : { leftHidden }),
	};
	const hiddenFile = isMain ? SESSION_FILE : `window-${label}.json`;
	return {
		placed: {
			...was.placed,
			views: {
				...was.placed.views,
				[window]: carried,
			},
		},
		said: [
			...was.said,
			...(panes === null ? [] : [`panes of ${window}: ${SESSION_FILE} → navigation.json (migrated)`]),
			...(leftHidden === null ? [] : [`left side hidden of ${window}: ${hiddenFile} → navigation.json (migrated)`]),
		],
	};
}

function oldPanesOf(session: OldViewDoc, label: string): PaneTree | null {
	const kept = keptPanesOf(session[label === MAIN_STUDIO_WINDOW ? MAIN_PANES_KEY : `${WINDOW_PANES_KEY}${label}`]);

	if (kept === null) {
		return null;
	}

	return kept.root?.id.startsWith(SPLIT_COPY_PREFIX) === true ? treeLeavingSplit(kept) : kept;
}

function oldLabelsOf(session: OldViewDoc): readonly string[] {
	return Object.keys(session).flatMap((key) => {
		if (key === MAIN_PANES_KEY) {
			return [MAIN_STUDIO_WINDOW];
		}

		return key.startsWith(WINDOW_PANES_KEY) ? [key.slice(WINDOW_PANES_KEY.length)] : [];
	});
}

async function oldDocOf(store: StoreClient, workspaceId: string, file: string): Promise<OldViewDoc> {
	const kind: DocKind<OldViewDoc> = {
		file,
		v: 1,
		schema: OldViewDocSchema,
	};

	try {
		return (await store.readDoc(workspaceRootOf(workspaceId), kind)).doc ?? {};
	} catch (failure: unknown) {
		console.warn(`[widgetarium] navigation: the old ${file} could not be read, nothing carried from it`, failure);
		return {};
	}
}
