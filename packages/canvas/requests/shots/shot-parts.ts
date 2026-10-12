import { frameLabelOf } from "../../schema/design.js";
import type { DrawnDesign, DrawnScreen } from "../../schema/design.js";
import type { Drawing } from "../../schema/drawing.js";
import type { Region } from "../../schema/regions.js";
import { referencesRegionOf } from "../field/reference-regions.js";
import { screensRegionOf } from "../field/screen-regions.js";
import { widgetsRegionOf } from "../field/widget-regions.js";
import { pageOfScreen, screensOfPage } from "../pages/screen-names.js";

export interface ShotAsked {
	readonly app: string;
	readonly page: string;
	readonly frame: string;
}

const WIDGETS_PER_PART = 4;
const NO_PAGE = "{app} has no page {page} with a frame {frame}: its pages are {pages}";

export function shotPartsOf(design: DrawnDesign, asked: ShotAsked, drawing: Drawing): Region[] {
	if (asked.page) return [screensRegionOf(pageScreensOf(design, asked), null, drawing)];
	return [
		...referencesRegionOf(design.references, drawing),
		...design.screens.map((screen) => screensRegionOf([screen], null, drawing)),
		...batchesOf(design.widgets).flatMap((widgets) => widgetsRegionOf(widgets, drawing)),
	];
}

function pageScreensOf(design: DrawnDesign, asked: ShotAsked): DrawnScreen[] {
	const screens = framesNamed(screensOfPage(design.screens, asked.page), asked.frame);
	if (screens.length > 0) return screens;
	const pages = [...new Set(design.screens.map((screen) => pageOfScreen(screen.name)))].join(", ");
	throw new Error(
		NO_PAGE.replace("{app}", asked.app)
			.replace("{page}", asked.page)
			.replace("{frame}", asked.frame || "*")
			.replace("{pages}", pages),
	);
}

function framesNamed(screens: readonly DrawnScreen[], frame: string): DrawnScreen[] {
	if (!frame) return [...screens];
	return screens
		.map((screen) => ({
			...screen,
			states: screen.states.filter((state) => state.name === frame || frameLabelOf(screen, state.name) === frame),
		}))
		.filter((screen) => screen.states.length > 0);
}

function batchesOf<T>(items: readonly T[]): T[][] {
	const batches: T[][] = [];
	for (let at = 0; at < items.length; at += WIDGETS_PER_PART) batches.push(items.slice(at, at + WIDGETS_PER_PART));
	return batches;
}
