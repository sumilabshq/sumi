import type { Parsed } from "@widgetarium/core/json-text.js";
import type { Look } from "@widgetarium/core/app-look.js";
import type { CanvasDoc } from "../../schema/doc.schema.js";
import type { DrawnDesign } from "../../schema/drawn-design.schema.js";

export interface DesignFolderRead {
	readonly design: DrawnDesign | null;
	readonly docs: readonly CanvasDoc[];
	readonly look: Parsed<Look> | null;
}

export const NOTHING_DRAWN: DrawnDesign = {
	screens: [],
	references: [],
	widgets: [],
};

export function refusedDesignOf(app: string, refusal: string): DrawnDesign {
	return {
		screens: [
			{
				name: app,
				states: [
					{
						name: app,
						board: null,
						refusal,
					},
				],
			},
		],
		references: [],
		widgets: [],
	};
}
