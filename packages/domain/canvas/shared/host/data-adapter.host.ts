import type { DataAdapter } from "obsidian";
import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";

export const DataAdapterHost = hostObject<DataAdapter>("DataAdapter", isDataAdapter);

function isDataAdapter(held: unknown): held is DataAdapter {
	return (
		isObject(held) &&
		typeof held["read"] === "function" &&
		typeof held["exists"] === "function" &&
		typeof held["process"] === "function"
	);
}
