import { z } from "zod";
import type { Plugin } from "./plugin";
import { originOf } from "./plugin-names";
import { sentenceOf } from "./sentence";

export const PLUGIN_STATE_FILE = "sumi.plugins.json";

const PluginEntrySchema = z.looseObject({
	enabled: z.boolean(),
	alias: z
		.string()
		.regex(/^[a-z]+(-[a-z]+)*-[1-9][0-9]*$/, "an alias is a plugin id and a numeric suffix")
		.optional(),
	of: z.string().optional(),
	from: z.string().optional(),
});

export const PluginStateSchema = z.looseObject({
	plugins: z.record(z.string(), PluginEntrySchema),
});

export type PluginState = z.infer<typeof PluginStateSchema>;

type PluginEntry = z.infer<typeof PluginEntrySchema>;

type PluginEntries = PluginState["plugins"];

export interface PluginStateStore {
	readonly initialSource: string;
	keptPluginState(): unknown;
	initialEnabledIds(): readonly string[];
	queuePluginStateSave(state: PluginState, reason: string): void;
}

export interface StateAsk {
	readonly named: readonly Plugin[];
	readonly alwaysOnIds: ReadonlySet<string>;
	readonly store: PluginStateStore;
	readonly kept: PluginState | null;
}

export interface SettledState {
	readonly rankedIds: readonly string[];
	readonly notes: readonly string[];
}

interface EntryChange {
	readonly id: string;
	readonly entry: PluginEntry;
	readonly reason: string;
}

interface Identity {
	readonly alias?: string | undefined;
	readonly of?: string | undefined;
	readonly from?: string | undefined;
}

const UNREAD = "the plugin state {file} cannot be read, so no plugin starts: {reason}";
const NOT_A_STATE = "the plugin state {file} is not a plugin state, so no plugin starts: {reason}";
const SEEDED = "{file} none → seeded from {source} ({plugins})";
const ADDED = "plugin {plugin} none → enabled (new in this build)";
const ALIASED = "plugin {plugin} repeats an id → runs as alias {alias}";
const NAMED_FOR = "plugin {plugin} stands for {was} → {now}";
const ALWAYS_ON = "plugin {plugin} enabled: false → true (always on)";
const NOT_INSTALLED = "plugin {plugin} is enabled in {file} but not built in: its entry stays";
const NO_IDENTITY = "itself";

export function keptStateOf(store: PluginStateStore): PluginState | null {
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

export function settledStateOf({ named, alwaysOnIds, store, kept }: StateAsk): SettledState {
	const held = kept ?? seededStateOf(named, alwaysOnIds, store.initialEnabledIds());
	const changes = changesOf(held.plugins, { named, alwaysOnIds });
	const state = {
		...held,
		plugins: changes.reduce<PluginEntries>((plugins, { id, entry }) => ({ ...plugins, [id]: entry }), held.plugins),
	};
	const reasons = [...(kept === null ? [seededReasonOf(store)] : []), ...changes.map(({ reason }) => reason)];

	if (reasons.length > 0) {
		store.queuePluginStateSave(state, reasons.join("; "));
	}

	return {
		rankedIds: rankedIdsOf(state, named, alwaysOnIds),
		notes: notInstalledOf(state, named),
	};
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
	initialEnabledIds: readonly string[],
): PluginState {
	const enabledIds = new Set([...alwaysOnIds, ...initialEnabledIds]);
	const ids = new Set([...enabledIds, ...named.filter((each) => !each.isAliased).map(({ id }) => id)]);
	return {
		plugins: Object.fromEntries([...ids].map((id) => [id, { enabled: enabledIds.has(id) }])),
	};
}

function seededReasonOf(store: PluginStateStore): string {
	return sentenceOf(SEEDED, {
		file: PLUGIN_STATE_FILE,
		source: store.initialSource,
		plugins: store.initialEnabledIds().join(", "),
	});
}

function changesOf(plugins: PluginEntries, { named, alwaysOnIds }: Omit<StateAsk, "store" | "kept">): EntryChange[] {
	const twinIds = new Set(named.filter((each) => each.isAliased).map(({ slotOwnerId }) => slotOwnerId));
	const namedChanges = named.flatMap((each) => namedChangeOf(each, plugins[each.id], identityOf(each, twinIds)));
	return [
		...namedChanges,
		...alwaysOnChangesOf(
			{
				...plugins,
				...Object.fromEntries(namedChanges.map(({ id, entry }) => [id, entry])),
			},
			alwaysOnIds,
		),
	];
}

function identityOf(plugin: Plugin, twinIds: ReadonlySet<string>): Identity {
	if (plugin.isAliased) {
		return {
			alias: plugin.id,
			of: plugin.slotOwnerId,
			from: originOf(plugin),
		};
	}

	return twinIds.has(plugin.id) ? { from: originOf(plugin) } : {};
}

function namedChangeOf(plugin: Plugin, was: PluginEntry | undefined, identity: Identity): EntryChange[] {
	if (was === undefined) {
		return [
			{
				id: plugin.id,
				entry: {
					enabled: true,
					...identity,
				},
				reason: plugin.isAliased
					? sentenceOf(ALIASED, { plugin: plugin.slotOwnerId, alias: plugin.id })
					: sentenceOf(ADDED, { plugin: plugin.id }),
			},
		];
	}

	const now = { ...was, ...identity };

	if (identityTextOf(was) === identityTextOf(now)) {
		return [];
	}

	return [
		{
			id: plugin.id,
			entry: now,
			reason: sentenceOf(NAMED_FOR, { plugin: plugin.id, was: identityTextOf(was), now: identityTextOf(now) }),
		},
	];
}

function identityTextOf({ alias, of, from }: Identity): string {
	const parts = [of === undefined ? null : `${alias ?? ""} of ${of}`, from === undefined ? null : `from ${from}`];
	const text = parts.filter((part) => part !== null).join(" ");
	return text === "" ? NO_IDENTITY : text;
}

function alwaysOnChangesOf(plugins: PluginEntries, alwaysOnIds: ReadonlySet<string>): EntryChange[] {
	return [...alwaysOnIds].flatMap((id) => {
		const entry = plugins[id];

		if (entry === undefined || entry.enabled) {
			return [];
		}

		return [
			{
				id,
				entry: {
					...entry,
					enabled: true,
				},
				reason: sentenceOf(ALWAYS_ON, { plugin: id }),
			},
		];
	});
}

function rankedIdsOf(state: PluginState, named: readonly Plugin[], alwaysOnIds: ReadonlySet<string>): string[] {
	const installed = new Set(named.map(({ id }) => id));
	const enabled = Object.entries(state.plugins)
		.filter(([id, entry]) => entry.enabled && installed.has(id) && !alwaysOnIds.has(id))
		.map(([id]) => id);
	return [...[...alwaysOnIds].filter((id) => installed.has(id)), ...enabled];
}

function notInstalledOf(state: PluginState, named: readonly Plugin[]): string[] {
	const installed = new Set(named.map(({ id }) => id));
	return Object.entries(state.plugins)
		.filter(([id, entry]) => entry.enabled && !installed.has(id))
		.map(([id]) => sentenceOf(NOT_INSTALLED, { plugin: id, file: PLUGIN_STATE_FILE }));
}
