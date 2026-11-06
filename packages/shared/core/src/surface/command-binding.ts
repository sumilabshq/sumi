import { z } from "zod";

import { refOf } from "../gateway/refs.js";
import { isObject } from "@widgetarium/data-framework/is-object";
import type { Tile } from "../model.js";
import { registeredCommands } from "../engine/packs.js";
import { inResourceOrder } from "../gateway/implementation-metadata.js";
import type { CommandConsent, Resource } from "../gateway/implementation-metadata.js";

export const TARGET_FIELD = "target";

export const CONSOLE_LOG = "@core/console-log";

export type CommandTarget = "collection" | "value";

export interface OfferedCommand {
	readonly id: string;
	readonly title: string;
	readonly resource: Resource;
	readonly said: string;
	readonly target: CommandTarget | null;
	readonly consent: CommandConsent;
	readonly fields: z.ZodType;
}

export function offeredCommands(): OfferedCommand[] {
	return inResourceOrder(registeredCommands()).map((entry) => ({
		id: entry.id,
		title: entry.title,
		resource: entry.resource,
		said: entry.description,
		target: entry.target,
		consent: entry.consent,
		fields: entry.fields,
	}));
}

export function offeredCommandOf(id: string | undefined): OfferedCommand | null {
	return offeredCommands().find((offered) => offered.id === id) ?? null;
}

export const CommandBindingSchema = z.object({
	implementation: z.string().optional(),
	fields: z.record(z.string(), z.unknown()).optional(),
	allow: z.array(z.string()).optional(),
});

export type CommandBinding = z.infer<typeof CommandBindingSchema>;

const CommandSpecSchema = z.object({
	label: z.string(),
	hint: z.string().optional(),
	source: z.object({ implementation: z.string(), fields: z.record(z.string(), z.unknown()).optional() }).optional(),
});

export type ParsedCommandSpec = z.infer<typeof CommandSpecSchema>;

const SWITCHED_OFF_UNTIL_REPAIRED: CommandBinding = { allow: [] };

export function commandSpecsOf(held: unknown): Readonly<Record<string, ParsedCommandSpec>> {
	if (!isObject(held)) return {};
	const parsed = Object.entries(held).map(([name, spec]) => [name, CommandSpecSchema.safeParse(spec)] as const);
	return Object.fromEntries(parsed.flatMap(([name, spec]) => (spec.success ? [[name, spec.data] as const] : [])));
}

export function commandBindingOf(tile: Tile, name: string, spec: ParsedCommandSpec | undefined): CommandBinding {
	const own = tile.props?.[name];
	if (own !== undefined) {
		const parsed = CommandBindingSchema.safeParse(own);
		return parsed.success ? parsed.data : SWITCHED_OFF_UNTIL_REPAIRED;
	}
	if (!spec?.source) return { implementation: CONSOLE_LOG };
	return { implementation: spec.source.implementation, fields: siblingRefsOf(tile.id, spec.source.fields ?? {}) };
}

export function isRunAllowed(binding: CommandBinding, isConsentNeeded: boolean): boolean {
	return binding.allow === undefined ? !isConsentNeeded : binding.allow.includes("run");
}

export function withRunAllowed(binding: CommandBinding, isOn: boolean): CommandBinding {
	return { ...binding, allow: isOn ? ["run"] : [] };
}

function siblingRefsOf(tileId: string, fields: Readonly<Record<string, unknown>>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(fields).map(([field, held]) => [
			field,
			typeof held === "string" && !held.includes("/") ? refOf(tileId, held) : held,
		]),
	);
}
