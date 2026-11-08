import type { Plugin } from "./plugin";
import type { PluginState } from "./plugin-state";
import { sentenceOf } from "./sentence";

export interface NamedPlugins {
	readonly named: readonly Plugin[];
	readonly refusals: readonly string[];
}

export interface NamingAsk {
	readonly resolvesNames: boolean;
	readonly kept: PluginState | null;
}

interface Placed {
	readonly plugin: Plugin;
	readonly at: number;
}

interface SavedName {
	readonly name: string;
	readonly from: string | undefined;
}

const ID_TWICE =
	'plugins #{first} and #{second} of .builtInPlugins() are both named "{plugin}", so the second does not start: rename the plugin("{plugin}") string of one, or start the runtime .withNameResolves()';
const ALIASED_WITH_SLOTS =
	'plugin #{at} of .builtInPlugins() would run as {alias}, since another plugin is named "{plugin}" too, but it declares slots, which an aliased plugin cannot yet, so it does not start: rename the plugin("{plugin}") string of one';
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function namedPluginsOf(builtIn: readonly Plugin[], ask: NamingAsk): NamedPlugins {
	const placed = builtIn.map((plugin, at) => ({ plugin, at }));
	const groups = [...groupedById(placed)];
	const naming = ask.resolvesNames
		? groups.map(([id, group]) => resolvedGroupOf(id, group, ask.kept))
		: groups.map(([, group]) => firstOnlyOf(group));
	const named = new Map(naming.flatMap(({ names }) => [...names]));
	const started = placed.flatMap(({ plugin, at }) => {
		const name = named.get(plugin);
		return name === undefined ? [] : [{ plugin: name === plugin.id ? plugin : plugin.aliased(name), at }];
	});
	return withoutAliasedSlots(
		started,
		naming.flatMap(({ refusals }) => refusals),
	);
}

export function originOf(plugin: Plugin): string {
	const { fills, derivedFills, declaredSlots, requiredPlugins, optionalPlugins } = plugin.parts;
	const marks = [
		...fills.map((fill) => `fill ${fill.slot.label} ${fill.listId ?? ""}`),
		...derivedFills.map((fill) => `derived ${fill.slot.label} ${fill.source.label}`),
		...declaredSlots.map((slot) => `declares ${slot.label}`),
		...requiredPlugins.map(({ id }) => `requires ${id}`),
		...optionalPlugins.map(({ id }) => `optional ${id}`),
	];
	return hashOf([...new Set(marks)].sort().join("\n"));
}

interface GroupNaming {
	readonly names: ReadonlyMap<Plugin, string>;
	readonly refusals: readonly string[];
}

function groupedById(placed: readonly Placed[]): ReadonlyMap<string, readonly Placed[]> {
	const grouped = new Map<string, Placed[]>();

	for (const each of placed) {
		grouped.set(each.plugin.id, [...(grouped.get(each.plugin.id) ?? []), each]);
	}

	return grouped;
}

function firstOnlyOf([first, ...rest]: readonly Placed[]): GroupNaming {
	if (first === undefined) {
		return {
			names: new Map(),
			refusals: [],
		};
	}

	return {
		names: new Map([[first.plugin, first.plugin.id]]),
		refusals: rest.map(({ plugin, at }) =>
			sentenceOf(ID_TWICE, { first: String(first.at + 1), second: String(at + 1), plugin: plugin.id }),
		),
	};
}

// TRADE-OFF: no plugin identity beyond its id; the hash of its fills stands in, changed fills fall back to builtInPlugins order
function resolvedGroupOf(id: string, group: readonly Placed[], kept: PluginState | null): GroupNaming {
	const saved = savedNamesOf(id, kept);
	const names = new Map<Plugin, string>();
	const taken = new Set<string>();

	for (const { plugin } of group) {
		const origin = originOf(plugin);
		const match = saved.find(({ name, from }) => from === origin && !taken.has(name));

		if (match !== undefined) {
			names.set(plugin, match.name);
			taken.add(match.name);
		}
	}

	for (const { plugin } of group.filter((each) => !names.has(each.plugin))) {
		const name = unclaimedNameOf(id, saved, { taken, kept });
		names.set(plugin, name);
		taken.add(name);
	}

	return {
		names,
		refusals: [],
	};
}

function savedNamesOf(id: string, kept: PluginState | null): readonly SavedName[] {
	return Object.entries(kept?.plugins ?? {})
		.filter(([name, entry]) => (name === id && entry.from !== undefined) || entry.of === id)
		.map(([name, entry]) => ({ name, from: entry.from }));
}

interface Taken {
	readonly taken: ReadonlySet<string>;
	readonly kept: PluginState | null;
}

function unclaimedNameOf(id: string, saved: readonly SavedName[], { taken, kept }: Taken): string {
	const free = [id, ...saved.map(({ name }) => name)].find((name) => !taken.has(name));

	if (free !== undefined) {
		return free;
	}

	const used = new Set([...taken, ...Object.keys(kept?.plugins ?? {})]);
	let suffix = 2;

	while (used.has(`${id}-${suffix}`)) {
		suffix += 1;
	}

	return `${id}-${suffix}`;
}

// TODO: slots of an aliased plugin
function withoutAliasedSlots(started: readonly Placed[], refusals: readonly string[]): NamedPlugins {
	const refused = started.filter(({ plugin }) => plugin.isAliased && plugin.parts.declaredSlots.length > 0);
	return {
		named: started.filter((each) => !refused.includes(each)).map(({ plugin }) => plugin),
		refusals: [
			...refusals,
			...refused.map(({ plugin, at }) =>
				sentenceOf(ALIASED_WITH_SLOTS, {
					at: String(at + 1),
					alias: plugin.id,
					plugin: plugin.slotOwnerId,
				}),
			),
		],
	};
}

function hashOf(text: string): string {
	let hash = FNV_OFFSET;

	for (const code of new TextEncoder().encode(text)) {
		hash = Math.imul(hash ^ code, FNV_PRIME) >>> 0;
	}

	return hash.toString(16).padStart(8, "0");
}
