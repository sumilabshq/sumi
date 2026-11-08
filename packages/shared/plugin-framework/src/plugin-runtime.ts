import { appliedPluginsOf } from "./applied-plugins";
import type { ServiceProvision } from "./applied-plugins";
import type { SlotShape } from "./declared-slot";
import type { ShownFill } from "./fill-outcome";
import type { Plugin } from "./plugin";
import type { ProvideFor } from "./plugin-app";
import { namedPluginsOf } from "./plugin-names";
import { keptStateOf, settledStateOf } from "./plugin-state";
import type { PluginStateStore } from "./plugin-state";
import { sentenceOf } from "./sentence";
import { slotFillsOf } from "./slot-fills";
import type { SlotFills } from "./slot-fills";
import { slotReaderOf } from "./slot-reader";
import type { SlotReader } from "./slot-reader";
import type { Service } from "./service";
import { startOrderOf } from "./start-order";

export interface PluginRuntime {
	readonly startedIds: readonly string[];
	readonly refusals: readonly string[];
	readonly notes: readonly string[];
	modulePrefixOf(pluginId: string): string | null;
	fillsOf(slot: SlotShape): readonly ShownFill[];
	readerOf(pluginId: string): SlotReader;
}

interface RuntimePlan {
	readonly builtIn: readonly Plugin[];
	readonly alwaysOn: readonly Plugin[];
	readonly store: PluginStateStore | null;
	readonly resolvesNames: boolean;
	readonly provisions: readonly ServiceProvision[];
}

type Statefulness = "stateless" | "stated";

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

	provide<Api>(service: Service<Api>, provideFor: ProvideFor<Api>): PluginRuntimeBuilder<S> {
		return new PluginRuntimeBuilder({
			...this.plan,
			provisions: [...this.plan.provisions, { service, provideFor }],
		});
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
	return new PluginRuntimeBuilder({ builtIn: [], alwaysOn: [], store: null, resolvesNames: false, provisions: [] });
}

function startPlugins(plan: RuntimePlan, store: PluginStateStore): PluginRuntime {
	const kept = keptStateOf(store);
	const { named, refusals: nameRefusals } = namedPluginsOf(plan.builtIn, { resolvesNames: plan.resolvesNames, kept });
	const alwaysOnIds = new Set(plan.alwaysOn.map(({ id }) => id));
	const state = settledStateOf({ named, alwaysOnIds, store, kept });
	const startOrder = startOrderOf(named, state.rankedIds);
	const slotFills = slotFillsOf(startOrder.plugins, state.rankedIds);
	const applied = appliedPluginsOf(startOrder.plugins, plan.provisions);
	return new StartedPlugins({
		started: startOrder.plugins.filter(({ id }) => applied.appliedIds.has(id)),
		slotFills,
		refusals: [...nameRefusals, ...startOrder.refusals, ...slotFills.refusals, ...applied.refusals],
		notes: state.notes,
	});
}

interface StartedParts {
	readonly started: readonly Plugin[];
	readonly slotFills: SlotFills;
	readonly refusals: readonly string[];
	readonly notes: readonly string[];
}

class StartedPlugins implements PluginRuntime {
	readonly startedIds: readonly string[];
	readonly refusals: readonly string[];
	readonly notes: readonly string[];
	private readonly started: readonly Plugin[];
	private readonly slotFills: SlotFills;

	constructor({ started, slotFills, refusals, notes }: StartedParts) {
		this.started = started;
		this.slotFills = slotFills;
		this.refusals = refusals;
		this.notes = notes;
		this.startedIds = started.map(({ id }) => id);
	}

	modulePrefixOf(pluginId: string): string | null {
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
