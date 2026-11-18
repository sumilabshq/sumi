import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { z } from "zod";
import type { McpAppEntry } from "../../../shared/lib/mcp-app-entry.js";

export interface AddedView {
	readonly name: string;
	readonly height: number;
	readonly guide: string;
	drawnOf(output: string): ReactElement | null;
}

const VIEW_NAME = /^[a-z][a-z0-9-]*$/;
const BAD_NAME = "MCP app view {name}: a name is lowercase letters, digits and -, so a tool can name it as ui://{name}";
const ADDED_TWICE = "MCP app view {name} is added twice: names are unique, so start one with its plugin id";
const BAD_HEIGHT = "MCP app view {name}: height {height} is not a positive number of pixels";
const NOT_JSON = "[mcp-apps] {name}: the tool answered no JSON, the tool row stays: {reason}";
const NOT_RESULT = "[mcp-apps] {name}: the tool answered no result this view reads, the tool row stays: {reason}";

export class AddedViews {
	private readonly views = new Map<string, AddedView>();

	add<Schema extends z.ZodType>(entry: McpAppEntry<Schema>): void {
		if (!VIEW_NAME.test(entry.name)) {
			throw new Error(BAD_NAME.replaceAll("{name}", entry.name));
		}

		if (this.views.has(entry.name)) {
			throw new Error(ADDED_TWICE.replace("{name}", entry.name));
		}

		if (!(entry.height > 0)) {
			throw new Error(BAD_HEIGHT.replace("{name}", entry.name).replace("{height}", String(entry.height)));
		}

		this.views.set(entry.name, {
			name: entry.name,
			height: entry.height,
			guide: entry.guide,
			drawnOf: (output) => drawnResultOf(entry, output),
		});
	}

	viewOf(name: string): AddedView | null {
		return this.views.get(name) ?? null;
	}

	guides(): readonly string[] {
		return [...this.views.values()].map(({ guide }) => guide);
	}
}

function drawnResultOf<Schema extends z.ZodType>(entry: McpAppEntry<Schema>, output: string): ReactElement | null {
	const answered = jsonOf(output);

	if (!answered.ok) {
		console.warn(NOT_JSON.replace("{name}", entry.name).replace("{reason}", answered.reason));
		return null;
	}

	const parsed = entry.schema.safeParse(answered.value);

	if (!parsed.success) {
		console.warn(NOT_RESULT.replace("{name}", entry.name).replace("{reason}", parsed.error.message));
		return null;
	}

	return h(entry.view, { result: parsed.data });
}

type JsonRead = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly reason: string };

function jsonOf(text: string): JsonRead {
	try {
		return {
			ok: true,
			value: JSON.parse(text),
		};
	} catch (error) {
		return {
			ok: false,
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}
