import { z } from "zod";
import { HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { PROFILE_FILE, PluginIdSchema } from "@widgetarium/plugin-framework";
import type { SumiProfile } from "@widgetarium/plugin-framework";
import { BUILT_IN_PROFILE } from "./sumi-plugins.js";

const KeptProfileSchema = z.looseObject({
	plugins: z.array(PluginIdSchema),
});

type KeptProfile = z.infer<typeof KeptProfileSchema>;

const WORKSPACE_PROFILE: DocKind<KeptProfile> = {
	file: PROFILE_FILE,
	v: 1,
	schema: KeptProfileSchema,
};

export async function workspaceProfileOf(store: StoreClient, workspace: string): Promise<SumiProfile> {
	const held = await HeldDoc.read({
		store,
		root: workspaceRootOf(workspace),
		kind: WORKSPACE_PROFILE,
		empty: BUILT_IN_PROFILE,
	});
	return {
		plugins: held.now().plugins,
	};
}
