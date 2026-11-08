import { appliedPluginsOf } from "./applied-plugins";
import type { ServiceProvision } from "./applied-plugins";
import type { Plugin } from "./plugin";
import type { ProvideFor } from "./plugin-app";
import { namedPluginsOf } from "./plugin-names";
import { keptStateOf, settledStateOf } from "./plugin-state";
import type { PluginStateStore } from "./plugin-state";
import { sentenceOf } from "./sentence";
import type { Service } from "./service";
import type { SlotFills } from "./slot-fills";
import { startOrderOf } from "./start-order";

export interface PluginRuntime {
	readonly startedIds: readonly string[];
	readonly refusals: readonly string[];
	readonly notes: readonly string[];
	readonly slotFills: SlotFills;
	modulePrefixOf(pluginId: string): string | null;
}

interface RuntimePlan {
	readonly builtIn: readonly Plugin[];
	readonly alwaysOn: readonly Plugin[];
	readonly store: PluginStateStore | null;
	readonly resolvesNames: boolean;
	readonly provisions: readonly ServiceProvision[];
}

type Statefulness = "stateless" | "stated";

const NOT_STARTED = "plugin {plugin} did not start";
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
	const applied = appliedPluginsOf(startOrder.plugins, plan.provisions);
	return new StartedPlugins({
		started: startOrder.plugins.filter(({ id }) => applied.appliedIds.has(id)),
		refusals: [...nameRefusals, ...startOrder.refusals, ...applied.refusals],
		notes: state.notes,
		slotFills: applied.slotFills,
	});
}

interface StartedParts {
	readonly started: readonly Plugin[];
	readonly refusals: readonly string[];
	readonly notes: readonly string[];
	readonly slotFills: SlotFills;
}

class StartedPlugins implements PluginRuntime {
	readonly startedIds: readonly string[];
	readonly refusals: readonly string[];
	readonly notes: readonly string[];
	readonly slotFills: SlotFills;
	private readonly started: readonly Plugin[];

	constructor({ started, refusals, notes, slotFills }: StartedParts) {
		this.started = started;
		this.refusals = refusals;
		this.slotFills = slotFills;
		this.notes = notes;
		this.startedIds = started.map(({ id }) => id);
	}

	modulePrefixOf(pluginId: string): string | null {
		return this.startedOf(pluginId).isAliased ? pluginId : null;
	}

	private startedOf(pluginId: string): Plugin {
		const found = this.started.find(({ id }) => id === pluginId);

		if (found === undefined) {
			throw new Error(sentenceOf(NOT_STARTED, { plugin: pluginId }));
		}

		return found;
	}
}
