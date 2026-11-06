import { isObject } from "@widgetarium/data-framework/is-object";
import { hostObject } from "@widgetarium/data-framework";

export interface FolderLending {
	pick(): Promise<string | null>;
	lend(paths: readonly string[]): void;
}

export const FolderLendingHost = hostObject<FolderLending>("FolderLending", isFolderLending);

function isFolderLending(held: unknown): held is FolderLending {
	return isObject(held) && typeof held["pick"] === "function" && typeof held["lend"] === "function";
}
