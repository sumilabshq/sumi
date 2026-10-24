import { contrastOf } from "@widgetarium/core/color-math.js";
import type { Rgba } from "@widgetarium/core/color-math.js";

export type PlateInk = "dark" | "light";

export type PlateInks = Readonly<Record<PlateInk, Rgba>>;

export function inkOn(fill: Rgba, inks: PlateInks): PlateInk {
	return contrastOf(fill, inks.dark) >= contrastOf(fill, inks.light) ? "dark" : "light";
}
