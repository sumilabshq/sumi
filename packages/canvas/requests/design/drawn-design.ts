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
import type { WidgetRegistry } from "@widgetarium/core/registry.js";
import type { DrawnDesign } from "../../schema/design.js";
import { shownWidgetsOf, widgetsOnScreens } from "./shown-widgets.js";
import { blockIdOf, blocksOf } from "./design-block-registry.js";
import { readDrawnState } from "./drawn-state.js";
import { catalogueInstallsOf, specWidgetsOf } from "./spec-widgets.js";

export interface DesignVault {
	readonly adapter: DataAdapter;
	readonly registry: WidgetRegistry;
}

const DRAFT_PREFIX = "@draft/";
const NO_DESIGN_YET = "{app} has no design yet, or it was removed.";

export async function drawnDesignOf(vault: DesignVault, app: string, isStarting = false): Promise<DrawnDesign> {
	const text = await vault.adapter.read(designPathOf(app)).catch(() => null);
	const isEmpty = text === null ? isStarting : isNothingDrawn(text);
	if (isEmpty) return { screens: [], references: [], widgets: [] };
	if (text === null) return refusedDesignOf(app, NO_DESIGN_YET.replace("{app}", app));
	const read = readDesign(text);
	if (read.refusal !== undefined) return refusedDesignOf(app, read.refusal);
	const screens = await drawnScreensOf(vault, app, read.design.screens);
	const references = drawnReferencesOf(vault.adapter, app, read.design.references);
	return { screens, references, widgets: await widgetsOf(vault, app, screens) };
}

export function widgetsDrawnOn(
	registry: WidgetRegistry,
	screens: DrawnDesign["screens"],
	widgets: DrawnDesign["widgets"],
): string[] {
	const pages = widgetsOnScreens(screens);
	const used = pages.flatMap((id) => registry.get(id)?.uses ?? []);
	return [...new Set([...pages, ...used, ...widgets.map((widget) => widget.id)])];
}

export function draftsOn(screens: DrawnDesign["screens"]): string[] {
	return [...new Set(widgetsOnScreens(screens).filter(isDraft))];
}

function refusedDesignOf(app: string, refusal: string): DrawnDesign {
	return {
		screens: [{ name: app, states: [{ name: app, board: null, refusal }] }],
		references: [],
		widgets: [],
	};
}

function drawnScreensOf(vault: DesignVault, app: string, screens: Design["screens"]): Promise<DrawnDesign["screens"]> {
	const source = {
		adapter: vault.adapter,
		statesOf: (widget: string) => vault.registry.get(widget)?.states,
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
		...shownWidgetsOf(registry, used.fromCatalogue, screens).map((id) => ({ id, isFromCatalogue: true })),
		...[...draftBlocksOf(registry, screens), ...shownWidgetsOf(registry, used.made, screens)].map((id) => ({
			id,
			isFromCatalogue: false,
		})),
	];
}

function draftBlocksOf(registry: WidgetRegistry, screens: DrawnDesign["screens"]): string[] {
	return draftsOn(screens).flatMap((draft) => blocksOf(registry, draft).map((block) => blockIdOf(draft, block)));
}

function isDraft(id: string): boolean {
	return id.startsWith(DRAFT_PREFIX);
}
