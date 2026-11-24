import { GLOBAL_ROOT, HeldDoc, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import { z } from "zod";
import type { TabsGateway } from "../tabs/tabs.gateway.js";
import {
	KeptNavigationSchema,
	TauriTabsGateway,
	flowsConverted,
	groupEntriesOf,
	oldViewsOf,
	viewsCarried,
	workspaceTabsOf,
} from "../tabs/tauri/tauri.gateway.js";
import type { FlowsConversionFacts, KeptNavigation } from "../tabs/tauri/tauri.gateway.js";
import { ListedPlacedAppsGateway } from "../placed-apps/listed.gateway.js";
import type { PlacedAppsGateway } from "../placed-apps/placed-apps.gateway.js";
import { IS_FLOWS_CONVERSION_ON } from "../../shared/host/places.host.js";
import type { PlacesConfig } from "../../shared/host/places.host.js";
import { PlacedTabsSchema } from "../../shared/schema/tabs.schema.js";
import type { PlacedTabs } from "../../shared/schema/tabs.schema.js";

export type PlacesParts = {
	readonly tabs: TabsGateway;
	readonly placedApps: PlacedAppsGateway;
};

const NAVIGATION: DocKind<KeptNavigation> = {
	file: "navigation.json",
	v: 1,
	schema: KeptNavigationSchema,
};

const GLOBAL_PLACES: DocKind<{ readonly tabs?: unknown }> = {
	file: "places.json",
	v: 1,
	schema: z.looseObject({ tabs: z.unknown().optional() }),
};

const NOT_CARRIED =
	"[widgetarium] navigation of workspace {workspace}: the global places.json was not carried over ({reason})";

export function keptPlacesParts(
	{ store, apps, isFlowsConversionOn = IS_FLOWS_CONVERSION_ON }: PlacesConfig,
	workspaceId: string,
): PlacesParts {
	return {
		tabs: new TauriTabsGateway({
			ownId: workspaceId,
			navigationOf: (anyWorkspaceId) => heldNavigationOf(store, anyWorkspaceId, { isOn: isFlowsConversionOn, apps }),
		}),
		placedApps: new ListedPlacedAppsGateway(apps),
	};
}

type FlowsConversionConfig = Pick<FlowsConversionFacts, "isOn" | "apps">;

function heldNavigationOf(
	store: StoreClient,
	workspaceId: string,
	conversion: FlowsConversionConfig,
): Promise<HeldDoc<KeptNavigation>> {
	return store.heldOnce(workspaceRootOf(workspaceId), NAVIGATION.file, async () => {
		const carried = await panesCarried(store, workspaceId, await carriedNavigation(store, workspaceId));
		return startedFresh(await flowsConverted(carried, { store, workspaceId, ...conversion }));
	});
}

async function carriedNavigation(store: StoreClient, workspaceId: string): Promise<HeldDoc<KeptNavigation>> {
	const kept = await HeldDoc.read({
		store,
		root: workspaceRootOf(workspaceId),
		kind: NAVIGATION,
		empty: KeptNavigationSchema.parse({}),
	});

	if (kept.now().tabs !== undefined) {
		return groupsReshaped(kept);
	}

	const global = await readGlobalTabs(store, workspaceId);

	if (global === null) {
		return kept;
	}

	const carried = workspaceTabsOf(global, workspaceId);
	kept.change({ tabs: carried.placed }, `navigation ${carried.reason}`);
	await kept.flush();
	console.info(`[widgetarium] navigation ${carried.reason}`);
	return kept;
}

async function groupsReshaped(kept: HeldDoc<KeptNavigation>): Promise<HeldDoc<KeptNavigation>> {
	const { tabs, reshaped } = groupEntriesOf(kept.now().tabs);

	if (reshaped === 0) {
		return kept;
	}

	const reason = `groups tabIds → entries in ${reshaped} groups (a group holds tabs and groups)`;
	kept.change({ tabs }, `navigation ${reason}`);
	await kept.flush();
	console.info(`[widgetarium] navigation ${reason}`);
	return kept;
}

async function panesCarried(
	store: StoreClient,
	workspaceId: string,
	kept: HeldDoc<KeptNavigation>,
): Promise<HeldDoc<KeptNavigation>> {
	const readable = PlacedTabsSchema.safeParse(kept.now().tabs);

	if (kept.now().panesCarried === true || !readable.success) {
		return kept;
	}

	const carried = viewsCarried(readable.data, await oldViewsOf(store, workspaceId), workspaceId);
	const reason = `panes carried none → ${carried.said.length === 0 ? "nothing to carry" : carried.said.join("; ")}`;
	kept.change({ tabs: carried.placed, panesCarried: true }, `navigation ${reason}`);
	await kept.flush();

	for (const said of carried.said) {
		console.info(`[widgetarium] ${said}`);
	}

	return kept;
}

async function readGlobalTabs(store: StoreClient, workspaceId: string): Promise<PlacedTabs | null> {
	try {
		const global = await store.readDoc(GLOBAL_ROOT, GLOBAL_PLACES);
		const readable = PlacedTabsSchema.safeParse(groupEntriesOf(global.doc?.tabs).tabs);
		return readable.success ? readable.data : null;
	} catch (failure: unknown) {
		console.warn(NOT_CARRIED.replace("{workspace}", workspaceId).replace("{reason}", String(failure)));
		return null;
	}
}

async function startedFresh(kept: HeldDoc<KeptNavigation>): Promise<HeldDoc<KeptNavigation>> {
	const readable = PlacedTabsSchema.safeParse(kept.now().tabs);

	if (isAppReloaded() || !readable.success || readable.data.windows.length === 0) {
		return kept;
	}

	const gone = readable.data.windows.map(({ label }) => label);
	const reason = `windows ${gone.join(", ")} → none (the app started: every window joins again, no tab stays held)`;
	kept.change({ tabs: { ...readable.data, windows: [] } }, `navigation ${reason}`);
	await kept.flush();
	console.info(`[widgetarium] navigation ${reason}`);
	return kept;
}

function isAppReloaded(): boolean {
	return performance
		.getEntriesByType("navigation")
		.some((entry) => entry instanceof PerformanceNavigationTiming && entry.type === "reload");
}
