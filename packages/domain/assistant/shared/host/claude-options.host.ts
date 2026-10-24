import { isObject } from "@widgetarium/core/engine/is-object.js";
import { hostObject } from "@widgetarium/core/requests";
import type { ClaudeOptions } from "../schema/claude-options.schema.js";

export interface ClaudeOptionsCell {
	value(): ClaudeOptions;
	save(next: ClaudeOptions): void;
	changed(listener: () => void): () => void;
}

export const ClaudeOptionsHost = hostObject<ClaudeOptionsCell>("ClaudeOptionsCell", isClaudeOptionsCell);

function isClaudeOptionsCell(held: unknown): held is ClaudeOptionsCell {
	return isObject(held) && typeof held["value"] === "function" && typeof held["save"] === "function";
}
