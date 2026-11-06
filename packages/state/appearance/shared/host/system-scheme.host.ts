import { isObject } from "@widgetarium/data-framework/is-object";
import { hostObject } from "@widgetarium/data-framework";

export interface SystemScheme {
	readonly matches: boolean;
	addEventListener(type: "change", listener: () => void): void;
	removeEventListener(type: "change", listener: () => void): void;
}

export const SystemSchemeHost = hostObject<SystemScheme>("SystemScheme", isSystemScheme);

function isSystemScheme(held: unknown): held is SystemScheme {
	return (
		isObject(held) &&
		typeof held["matches"] === "boolean" &&
		typeof held["addEventListener"] === "function" &&
		typeof held["removeEventListener"] === "function"
	);
}
