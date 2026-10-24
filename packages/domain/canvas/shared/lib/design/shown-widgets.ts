import type { WidgetDefinition, WidgetLookup } from "@widgetarium/core/registry.js";
import type { DrawnDesign } from "../../schema/drawn-design.schema.js";

interface ScreensShow {
	readonly onScreens: ReadonlySet<string>;
	readonly pictured: ReadonlySet<string>;
}

export function shownWidgetsOf(
	registry: Pick<WidgetLookup, "get">,
	candidates: readonly string[],
	screens: DrawnDesign["screens"],
): string[] {
	const states = screens.flatMap((screen) => screen.states);
	const shown: ScreensShow = {
		onScreens: new Set(widgetsOnScreens(screens)),
		pictured: new Set(states.flatMap((state) => (state.picture ? [state.picture.widget] : []))),
	};
	return [...new Set(candidates)].filter((id) => isShownBeside(registry.get(id), id, shown));
}

export function widgetsOnScreens(screens: DrawnDesign["screens"]): string[] {
	const tiles = screens.flatMap((screen) => screen.states.flatMap((state) => state.board?.tiles ?? []));
	return tiles.map((tile) => tile.widget);
}

function isShownBeside(definition: WidgetDefinition | null, id: string, screens: ScreensShow): boolean {
	if (!definition?.component) return false;
	if (!screens.onScreens.has(id)) return true;
	return Object.keys(definition.states ?? {}).length > 0 && !screens.pictured.has(id);
}
