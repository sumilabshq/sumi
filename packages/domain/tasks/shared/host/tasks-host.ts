import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";

export interface BoardFile {
	readonly read: () => Promise<string | null>;
	readonly write: (text: string) => Promise<void>;
}

const BoardFileHost = hostObject<BoardFile>("BoardFile", isBoardFile);

export const TASKS_HOST_NEEDS = {
	file: BoardFileHost,
};

function isBoardFile(held: unknown): held is BoardFile {
	return isObject(held) && typeof held["read"] === "function" && typeof held["write"] === "function";
}
