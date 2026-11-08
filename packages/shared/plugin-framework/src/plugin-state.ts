import { z } from "zod";
import type { Plugin } from "./plugin";
import { sentenceOf } from "./sentence";

export const PLUGIN_STATE_FILE = "sumi.plugins.json";

const PluginEntrySchema = z.strictObject({
	enabled: z.boolean(),
	alias: z
		.string()
		.regex(/^[a-z]+(-[a-z]+)*-[1-9][0-9]*$/, "an alias is a plugin id and a numeric suffix")
		.optional(),
});

export const PluginStateSchema = z.object({
	version: z.literal(1),
	plugins: z.record(z.string(), PluginEntrySchema),
});

export type PluginState = z.infer<typeof PluginStateSchema>;

type PluginEntry = z.infer<typeof PluginEntrySchema>;

export interface PluginStateStore {
	keptPluginState(): unknown;
	firstEnabledIds(): readonly string[];
	savePluginState(state: PluginState, reason: string): void;
}

export interface StateAsk {
	readonly named: readonly Plugin[];
	readonly alwaysOnIds: ReadonlySet<string>;
	readonly store: PluginStateStore;
}

export interface SettledState {
	readonly rankedNames: readonly string[];
	readonly refusals: readonly string[];
}

const UNREAD = "the plugin state {file} cannot be read, so no plugin starts: {reason}";
const NOT_A_STATE = "the plugin state {file} is not a version 1 plugin state, so no plugin starts: {reason}";
const SEEDED = "{file} none → seeded from the enabled profile ({plugins})";
const ADDED = "plugin {plugin} none → enabled (new in this build)";
const ALIASED = "plugin {plugin} repeats an id → runs as alias {alias}";
const ALWAYS_ON = "plugin {plugin} is always on: the plugin state's enabled: false is ignored";
const NOT_INSTALLED = "the plugin state enables plugin {plugin}, which is not installed: its entry stays";

export function settledStateOf({ named, alwaysOnIds, store }: StateAsk): SettledState {
	const kept = keptStateOf(store);
	const completed = completedStateOf(kept ?? seededStateOf(named, alwaysOnIds, store.firstEnabledIds()), named);
	const reasons = [...(kept === null ? [seededReasonOf(store.firstEnabledIds())] : []), ...completed.reasons];

	if (reasons.length > 0) {
		store.savePluginState(completed.state, reasons.join("; "));
	}

	return {
		rankedNames: rankedNamesOf(completed.state, named, alwaysOnIds),
		refusals: refusalsOf(completed.state, named, alwaysOnIds),
	};
}

function keptStateOf(store: PluginStateStore): PluginState | null {
	const kept = readOrThrow(store);

	if (kept === null || kept === undefined) {
		return null;
	}

	const parsed = PluginStateSchema.safeParse(kept);

	if (!parsed.success) {
		throw new Error(sentenceOf(NOT_A_STATE, { file: PLUGIN_STATE_FILE, reason: z.prettifyError(parsed.error) }));
	}

	return parsed.data;
}

function readOrThrow(store: PluginStateStore): unknown {
	try {
		return store.keptPluginState();
	} catch (failure) {
		const reason = failure instanceof Error ? failure.message : String(failure);
		throw new Error(sentenceOf(UNREAD, { file: PLUGIN_STATE_FILE, reason }));
	}
}

function seededStateOf(
	named: readonly Plugin[],
	alwaysOnIds: ReadonlySet<string>,
	firstEnabledIds: readonly string[],
): PluginState {
	const enabledIds = new Set([...alwaysOnIds, ...firstEnabledIds]);
	const ids = new Set([...enabledIds, ...named.filter((each) => !each.isAliased).map(({ id }) => id)]);
	return {
		version: 1,
		plugins: Object.fromEntries([...ids].map((id) => [id, { enabled: enabledIds.has(id) }])),
	};
}

function seededReasonOf(firstEnabledIds: readonly string[]): string {
	return sentenceOf(SEEDED, { file: PLUGIN_STATE_FILE, plugins: firstEnabledIds.join(", ") });
}

interface CompletedState {
	readonly state: PluginState;
	readonly reasons: readonly string[];
}

function completedStateOf(held: PluginState, named: readonly Plugin[]): CompletedState {
	const added = named.filter(({ id }) => held.plugins[id] === undefined);
	const aliasesUnkept = named.filter((each) => {
		const entry = held.plugins[each.id];
		return each.isAliased && entry !== undefined && entry.alias !== each.id;
	});
	return {
		state: {
			version: 1,
			plugins: {
				...held.plugins,
				...Object.fromEntries(added.map((each) => [each.id, entryOf(each, true)])),
				...Object.fromEntries(
					aliasesUnkept.map((each) => [each.id, entryOf(each, held.plugins[each.id]?.enabled ?? true)]),
				),
			},
		},
		reasons: [
			...added.map(({ id }) => sentenceOf(ADDED, { plugin: id })),
			...aliasesUnkept.map(({ id, slotOwnerId }) => sentenceOf(ALIASED, { plugin: slotOwnerId, alias: id })),
		],
	};
}

function entryOf(plugin: Plugin, enabled: boolean): PluginEntry {
	return plugin.isAliased ? { enabled, alias: plugin.id } : { enabled };
}

function rankedNamesOf(state: PluginState, named: readonly Plugin[], alwaysOnIds: ReadonlySet<string>): string[] {
	const installed = new Set(named.map(({ id }) => id));
	const enabled = Object.entries(state.plugins)
		.filter(([id, entry]) => entry.enabled && installed.has(id) && !alwaysOnIds.has(id))
		.map(([id]) => id);
	return [...[...alwaysOnIds].filter((id) => installed.has(id)), ...enabled];
}

function refusalsOf(state: PluginState, named: readonly Plugin[], alwaysOnIds: ReadonlySet<string>): string[] {
	const installed = new Set(named.map(({ id }) => id));
	const entries = Object.entries(state.plugins);
	return [
		...entries
			.filter(([id, entry]) => !entry.enabled && alwaysOnIds.has(id))
			.map(([id]) => sentenceOf(ALWAYS_ON, { plugin: id })),
		...entries
			.filter(([id, entry]) => entry.enabled && !installed.has(id))
			.map(([id]) => sentenceOf(NOT_INSTALLED, { plugin: id })),
	];
}
