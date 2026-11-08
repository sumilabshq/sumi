import type { SlotShape } from "./declared-slot";
import type { ShownFill } from "./fill-outcome";
import type { Plugin } from "./plugin";
import { settledStateOf } from "./plugin-state";
import type { PluginStateStore } from "./plugin-state";
import { sentenceOf } from "./sentence";
import { slotFillsOf } from "./slot-fills";
import type { SlotFills } from "./slot-fills";
import { slotReaderOf } from "./slot-reader";
import type { SlotReader } from "./slot-reader";
import { startOrderOf } from "./start-order";

export interface PluginRuntime {
	readonly startedNames: readonly string[];
	readonly refusals: readonly string[];
	aliasOf(pluginId: string): string | null;
	fillsOf(slot: SlotShape): readonly ShownFill[];
	readerOf(pluginId: string): SlotReader;
}

interface RuntimePlan {
	readonly builtIn: readonly Plugin[];
	readonly alwaysOn: readonly Plugin[];
	readonly store: PluginStateStore | null;
	readonly resolvesNames: boolean;
}

type Statefulness = "stateless" | "stated";

interface NamedPlugins {
	readonly named: readonly Plugin[];
	readonly refusals: readonly string[];
}

const ID_TWICE =
	'plugins #{first} and #{second} of .builtInPlugins() are both named "{plugin}", so the second does not start: rename the plugin("{plugin}") string of one, or start the runtime .withNameResolves()';
const NOT_STARTED = "plugin {plugin} filled a slot but did not start";
const NO_STATE = "the plugin runtime starts with no state: call .state(store) before .start()";

export class PluginRuntimeBuilder<S extends Statefulness> {
	declare readonly statefulness: S;

	constructor(private readonly plan: RuntimePlan) {}

	builtInPlugins(...plugins: readonly Plugin[]): PluginRuntimeBuilder<S> {
		return new PluginRuntimeBuilder({ ...this.plan, builtIn: [...this.plan.builtIn, ...plugins] });
	}

	alwaysOn(...plugins: readonly Plugin[]): PluginRuntimeBuilder<S> {
		return new PluginRuntimeBuilder({ ...this.plan, alwaysOn: [...this.plan.alwaysOn, ...plugins] });
	}

	state(store: PluginStateStore): PluginRuntimeBuilder<"stated"> {
		return new PluginRuntimeBuilder({ ...this.plan, store });
	}

	withNameResolves(): PluginRuntimeBuilder<S> {
		return new PluginRuntimeBuilder({ ...this.plan, resolvesNames: true });
	}

	start(this: PluginRuntimeBuilder<"stated">): PluginRuntime {
		const { store } = this.plan;

		if (store === null) {
			throw new Error(NO_STATE);
		}

		return startPlugins(this.plan, store);
	}
}

export function runtime(): PluginRuntimeBuilder<"stateless"> {
	return new PluginRuntimeBuilder({ builtIn: [], alwaysOn: [], store: null, resolvesNames: false });
}

function startPlugins(plan: RuntimePlan, store: PluginStateStore): PluginRuntime {
	const { named, refusals: nameRefusals } = namedPluginsOf(plan.builtIn, plan.resolvesNames);
	const state = settledStateOf({ named, alwaysOnIds: new Set(plan.alwaysOn.map(({ id }) => id)), store });
	const startOrder = startOrderOf(named, state.rankedNames);
	const slotFills = slotFillsOf(startOrder.plugins, state.rankedNames);
	return new StartedPlugins(startOrder.plugins, slotFills, [
		...nameRefusals,
		...state.refusals,
		...startOrder.refusals,
		...slotFills.refusals,
	]);
}

function namedPluginsOf(builtIn: readonly Plugin[], resolvesNames: boolean): NamedPlugins {
	const named: Plugin[] = [];
	const refusals: string[] = [];

	for (const [at, each] of builtIn.entries()) {
		const first = named.findIndex(({ id }) => id === each.id);

		if (first === -1) {
			named.push(each);
			continue;
		}

		if (!resolvesNames) {
			refusals.push(
				sentenceOf(ID_TWICE, { first: String(first + 1), second: String(at + 1), plugin: each.id }),
			);
			continue;
		}

		named.push(each.aliased(freeAliasOf(each.id, named)));
	}

	return { named, refusals };
}

function freeAliasOf(id: string, named: readonly Plugin[]): string {
	const taken = new Set(named.map((each) => each.id));
	let suffix = 2;

	while (taken.has(`${id}-${suffix}`)) {
		suffix += 1;
	}

	return `${id}-${suffix}`;
}

class StartedPlugins implements PluginRuntime {
	readonly startedNames: readonly string[];

	constructor(
		private readonly started: readonly Plugin[],
		private readonly slotFills: SlotFills,
		readonly refusals: readonly string[],
	) {
		this.startedNames = started.map(({ id }) => id);
	}

	aliasOf(pluginId: string): string | null {
		return this.startedOf(pluginId).isAliased ? pluginId : null;
	}

	fillsOf(slot: SlotShape): readonly ShownFill[] {
		return this.slotFills.byIdentity.get(slot.identity)?.fills ?? [];
	}

	readerOf(pluginId: string): SlotReader {
		return slotReaderOf(this.slotFills, this.startedOf(pluginId));
	}

	private startedOf(pluginId: string): Plugin {
		const found = this.started.find(({ id }) => id === pluginId);

		if (found === undefined) {
			throw new Error(sentenceOf(NOT_STARTED, { plugin: pluginId }));
		}

		return found;
	}
}
