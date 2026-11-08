import { z } from "zod";
import { workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, DocState, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { PLUGIN_STATE_FILE, PROFILE_FILE, PluginIdSchema } from "@widgetarium/plugin-framework";
import type { PluginState, PluginStateStore } from "@widgetarium/plugin-framework";
import { BUILT_IN_PROFILE } from "@widgetarium/studio";

const KeptProfileSchema = z.looseObject({
	plugins: z.array(PluginIdSchema),
});

const KeptStateSchema = z.looseObject({});

type KeptState = z.infer<typeof KeptStateSchema>;

const WORKSPACE_PROFILE: DocKind<z.infer<typeof KeptProfileSchema>> = {
	file: PROFILE_FILE,
	v: 1,
	schema: KeptProfileSchema,
};

const WORKSPACE_PLUGIN_STATE: DocKind<KeptState> = {
	file: PLUGIN_STATE_FILE,
	v: 1,
	schema: KeptStateSchema,
};

interface InitialPlugins {
	readonly ids: readonly string[];
	readonly source: string;
}

interface StateSaving {
	readonly store: StoreClient;
	readonly workspace: string;
	readonly kept: DocState<KeptState>;
	readonly initial: InitialPlugins;
}

const BUILT_IN_SOURCE = "the built-in profile";
const BUILT_IN: InitialPlugins = {
	ids: BUILT_IN_PROFILE.plugins,
	source: BUILT_IN_SOURCE,
};
const KEPT: InitialPlugins = {
	ids: [],
	source: PLUGIN_STATE_FILE,
};

const OF_ANOTHER_SHAPE = "{file} is not an object of the shape this build reads";
const QUARANTINED_RESET =
	"[studio] workspace {workspace}: {file} unparseable → kept aside as {aside} beside it; plugin choices reset to {source}";
const PROFILE_UNUSED = "[studio] workspace {workspace}: {profile} {why} → {builtIn} seeds the plugins";
const PROFILE_QUARANTINED = "unparseable, kept aside as {aside}";
const PROFILE_ODD = "of another shape";
const PROFILE_UNREAD = "unreadable";
const SAVED = "[studio] workspace {workspace}: {file} rev {was} → {now} ({reason})";
const SUPERSEDED = "[studio] workspace {workspace}: {profile} in use → superseded by {file}";
const NEWER_KEPT = "[studio] workspace {workspace}: {file} newer state kept, not written ({reason})";
const LOST_RACE = "[studio] workspace {workspace}: {file} was written by another window first, rev {now} stays ({reason})";
const LOST_RACE_DIFFERS =
	"[studio] workspace {workspace}: {file} was written by another window first at rev {now}, plugins of this start {was} → stored {stored}, read on the next start ({reason})";
const NOT_SAVED = "[studio] workspace {workspace}: {file} not saved ({reason})";

export async function workspacePluginStateOf(store: StoreClient, workspace: string): Promise<PluginStateStore> {
	const root = workspaceRootOf(workspace);
	const kept = await store.readDoc(root, WORKSPACE_PLUGIN_STATE);
	const initial = kept.doc === null && !kept.isReadOnly ? await initialPluginsOf(store, workspace) : KEPT;

	if (kept.quarantined !== null) {
		console.error(sentenceOf(QUARANTINED_RESET, { workspace, aside: kept.quarantined, source: initial.source }));
	}

	return {
		initialSource: initial.source,
		keptPluginState: () => keptStateOf(kept),
		initialEnabledIds: () => initial.ids,
		queuePluginStateSave: (state, reason) => void saveState({ store, workspace, kept, initial }, state, reason),
	};
}

async function initialPluginsOf(store: StoreClient, workspace: string): Promise<InitialPlugins> {
	try {
		return profilePluginsOf(await store.readDoc(workspaceRootOf(workspace), WORKSPACE_PROFILE), workspace);
	} catch (failure) {
		console.error(sentenceOf(PROFILE_UNUSED, { workspace, why: PROFILE_UNREAD }), failure);
		return BUILT_IN;
	}
}

function profilePluginsOf(
	{ doc, isReadOnly, quarantined }: DocState<z.infer<typeof KeptProfileSchema>>,
	workspace: string,
): InitialPlugins {
	if (quarantined !== null) {
		console.error(
			sentenceOf(PROFILE_UNUSED, { workspace, why: sentenceOf(PROFILE_QUARANTINED, { aside: quarantined }) }),
		);
		return BUILT_IN;
	}

	if (doc === null && isReadOnly) {
		console.error(sentenceOf(PROFILE_UNUSED, { workspace, why: PROFILE_ODD }));
		return BUILT_IN;
	}

	return doc === null ? BUILT_IN : { ids: doc.plugins, source: PROFILE_FILE };
}

function keptStateOf({ doc, isReadOnly }: DocState<KeptState>): KeptState | null {
	if (doc === null && isReadOnly) {
		throw new Error(OF_ANOTHER_SHAPE.replace("{file}", PLUGIN_STATE_FILE));
	}

	return doc;
}

async function saveState(saving: StateSaving, state: PluginState, reason: string): Promise<void> {
	const { store, workspace, kept, initial } = saving;

	if (kept.isReadOnly) {
		console.info(sentenceOf(NEWER_KEPT, { workspace, reason }));
		return;
	}

	try {
		const replaced = await store.replaceDoc(workspaceRootOf(workspace), WORKSPACE_PLUGIN_STATE, {
			doc: state,
			baseRev: kept.rev,
			reason,
		});

		if (!replaced.ok) {
			await reportLostRace(saving, state, reason);
			return;
		}

		console.info(sentenceOf(SAVED, { workspace, reason, was: String(kept.rev), now: String(replaced.rev) }));

		if (initial.source === PROFILE_FILE) {
			console.info(sentenceOf(SUPERSEDED, { workspace, profile: PROFILE_FILE }));
		}
	} catch (failure) {
		console.error(sentenceOf(NOT_SAVED, { workspace, reason }), failure);
	}
}

async function reportLostRace({ store, workspace }: StateSaving, state: PluginState, reason: string): Promise<void> {
	const now = await store.readDoc(workspaceRootOf(workspace), WORKSPACE_PLUGIN_STATE);
	const was = sortedJsonOf(state.plugins);
	const stored = sortedJsonOf(now.doc?.["plugins"] ?? null);

	if (was === stored) {
		console.info(sentenceOf(LOST_RACE, { workspace, reason, now: String(now.rev) }));
		return;
	}

	console.info(sentenceOf(LOST_RACE_DIFFERS, { workspace, reason, now: String(now.rev), was, stored }));
}

function sortedJsonOf(value: unknown): string {
	return JSON.stringify(value, (_key, held: unknown) =>
		isRecord(held) ? Object.fromEntries(Object.entries(held).sort(([left], [right]) => left.localeCompare(right))) : held,
	);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sentenceOf(template: string, words: Readonly<Record<string, string>>): string {
	const named: Readonly<Record<string, string>> = {
		file: PLUGIN_STATE_FILE,
		profile: PROFILE_FILE,
		builtIn: BUILT_IN_SOURCE,
		...words,
	};
	return template.replace(/\{(\w+)\}/g, (placeholder: string, key: string) => named[key] ?? placeholder);
}
