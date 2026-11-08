import { z } from "zod";
import { workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, DocState, StoreClient, WorkspaceRoot } from "@widgetarium/behaviors/tauri-store";
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

const QUARANTINED = "{file} could not be parsed and was kept aside as {aside}";
const OF_ANOTHER_SHAPE = "{file} is not an object of the shape this build reads";
const SAVED = "[studio] workspace {workspace}: {file} rev {was} → {now} ({reason})";
const LOST_RACE = "[studio] workspace {workspace}: {file} was written by another window first, rev {now} stays ({reason})";
const NOT_SAVED = "[studio] workspace {workspace}: {file} not saved ({reason})";

export async function workspacePluginStateOf(store: StoreClient, workspace: string): Promise<PluginStateStore> {
	const root = workspaceRootOf(workspace);
	const kept = await store.readDoc(root, WORKSPACE_PLUGIN_STATE);
	const firstEnabled = isMissing(kept) ? await profilePluginsOf(store, root) : [];
	return {
		keptPluginState: () => keptDocOf(kept, PLUGIN_STATE_FILE),
		firstEnabledIds: () => firstEnabled,
		savePluginState: (state, reason) => void saveState({ store, workspace, baseRev: kept.rev }, state, reason),
	};
}

async function profilePluginsOf(store: StoreClient, root: WorkspaceRoot): Promise<readonly string[]> {
	const profile = keptDocOf(await store.readDoc(root, WORKSPACE_PROFILE), PROFILE_FILE);
	return profile === null ? BUILT_IN_PROFILE.plugins : profile.plugins;
}

function isMissing({ doc, isReadOnly, quarantined }: DocState<KeptState>): boolean {
	return doc === null && !isReadOnly && quarantined === null;
}

function keptDocOf<Doc>({ doc, isReadOnly, quarantined }: DocState<Doc>, file: string): Doc | null {
	if (quarantined !== null) {
		throw new Error(QUARANTINED.replace("{file}", file).replace("{aside}", quarantined));
	}

	if (doc === null && isReadOnly) {
		throw new Error(OF_ANOTHER_SHAPE.replace("{file}", file));
	}

	return doc;
}

interface StateSaving {
	readonly store: StoreClient;
	readonly workspace: string;
	readonly baseRev: number;
}

async function saveState({ store, workspace, baseRev }: StateSaving, state: PluginState, reason: string): Promise<void> {
	const said = (template: string): string =>
		template.replace("{workspace}", workspace).replace("{file}", PLUGIN_STATE_FILE).replace("{reason}", reason);

	try {
		const replaced = await store.replaceDoc(workspaceRootOf(workspace), WORKSPACE_PLUGIN_STATE, {
			doc: state,
			baseRev,
			reason,
		});

		if (!replaced.ok) {
			console.info(said(LOST_RACE).replace("{now}", String(replaced.currentRev)));
			return;
		}

		console.info(said(SAVED).replace("{was}", String(baseRev)).replace("{now}", String(replaced.rev)));
	} catch (failure) {
		console.error(said(NOT_SAVED), failure);
	}
}
