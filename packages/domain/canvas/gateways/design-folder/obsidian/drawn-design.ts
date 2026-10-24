import type { DataAdapter } from "obsidian";
import {
	framePixelsOf,
	designPathOf,
	isNothingDrawn,
	readDesign,
	referencePathOf,
	statesOf,
} from "@widgetarium/core/app-design.js";
import type { Design } from "@widgetarium/core/app-design.js";
import { appWidgetsOf } from "@widgetarium/core/app-widgets.js";
import type { WidgetLookup, WidgetRegistry } from "@widgetarium/core/registry.js";
import type { DrawnDesign } from "../../../shared/schema/drawn-design.schema.js";
import { shownWidgetsOf, widgetsOnScreens } from "../../../shared/lib/design/shown-widgets.js";
import { blockIdOf, blocksOf } from "../../../shared/lib/design/design-block-registry.js";
import { NOTHING_DRAWN, refusedDesignOf } from "../../../shared/lib/design/design-shown.js";
import { draftsOn } from "../../../shared/lib/design/drawn-design.js";
import { readDrawnState } from "./drawn-state.js";
import { catalogueInstallsOf, specWidgetsOf } from "./spec-widgets.js";
import { textAt } from "./text-at.js";

export interface DesignVault {
	readonly adapter: DataAdapter;
	readonly registry: WidgetRegistry;
	readonly drawnRegistry: Pick<WidgetLookup, "get">;
}

export async function drawnDesignOf(vault: DesignVault, app: string): Promise<DrawnDesign | null> {
	const held = await textAt(vault.adapter, designPathOf(app));

	if (held.kind === "refused") {
		return refusedDesignOf(app, held.refusal);
	}

	if (held.kind === "absent") {
		return null;
	}

	if (isNothingDrawn(held.text)) {
		return NOTHING_DRAWN;
	}

	const read = readDesign(held.text);

	if (read.refusal !== undefined) {
		return refusedDesignOf(app, read.refusal);
	}

	const screens = await drawnScreensOf(vault, app, read.design.screens);
	const references = drawnReferencesOf(vault.adapter, app, read.design.references);
	return {
		screens,
		references,
		widgets: await widgetsOf(vault, app, screens),
	};
}

function drawnScreensOf(vault: DesignVault, app: string, screens: Design["screens"]): Promise<DrawnDesign["screens"]> {
	const source = {
		adapter: vault.adapter,
		registry: vault.drawnRegistry,
	};
	return Promise.all(
		screens.map(async (screen) => ({
			name: screen.name,
			states: await Promise.all(
				statesOf(screen).map(async (state) => ({
					...(await readDrawnState(source, app, state, screen.name)),
					situation: state.situation,
					size: framePixelsOf(state.size),
				})),
			),
		})),
	);
}

function drawnReferencesOf(
	adapter: DataAdapter,
	app: string,
	references: Design["references"],
): DrawnDesign["references"] {
	return references.map((reference) => ({
		name: "url" in reference ? reference.url : reference.file,
		src: "url" in reference ? reference.url : adapter.getResourcePath(referencePathOf(app, reference.file)),
		why: reference.why,
		kind: reference.kind,
		pages: reference.pages ?? [],
		notes: reference.notes ?? [],
	}));
}

async function widgetsOf(
	vault: DesignVault,
	app: string,
	screens: DrawnDesign["screens"],
): Promise<DrawnDesign["widgets"]> {
	const { registry, adapter } = vault;
	const onScreens = [...new Set(widgetsOnScreens(screens))].flatMap((id) => registry.get(id)?.uses ?? []);
	const used = appWidgetsOf([...(await specWidgetsOf(adapter, app)), ...onScreens], await catalogueInstallsOf(adapter));
	return [
		...shownWidgetsOf(registry, used.fromCatalogue, screens).map((id) => ({
			id,
			isFromCatalogue: true,
		})),
		...[...draftBlocksOf(registry, screens), ...shownWidgetsOf(registry, used.made, screens)].map((id) => ({
			id,
			isFromCatalogue: false,
		})),
	];
}

function draftBlocksOf(registry: WidgetRegistry, screens: DrawnDesign["screens"]): string[] {
	return draftsOn(screens).flatMap((draft) => blocksOf(registry, draft).map((block) => blockIdOf(draft, block)));
}
