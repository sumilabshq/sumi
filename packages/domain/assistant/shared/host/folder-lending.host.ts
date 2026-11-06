import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";

export interface FolderLending {
	pick(): Promise<string | null>;
	lend(paths: readonly string[]): void;
}

export const FolderLendingHost = hostObject<FolderLending>("FolderLending", isFolderLending);

function isFolderLending(held: unknown): held is FolderLending {
	return isObject(held) && typeof held["pick"] === "function" && typeof held["lend"] === "function";
}
