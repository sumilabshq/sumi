import type { SlotShape } from "./declared-slot";
import { DerivedFill, Fill } from "./fill";
import { checkedAlias, checkedName } from "./identity";
import type { App, Dependency } from "./plugin-app";
import { Service } from "./service";

interface PluginParts {
	readonly requiredPlugins: readonly Plugin[];
	readonly optionalPlugins: readonly Plugin[];
	readonly requiredServices: readonly Service<unknown>[];
	readonly optionalServices: readonly Service<unknown>[];
	readonly declaredSlots: readonly SlotShape[];
	readonly fills: readonly Fill[];
	readonly derivedFills: readonly DerivedFill[];
}

interface Applying<Api, Required extends Dependency, Optional extends Dependency> {
	run(app: App<Required, Optional>): Api;
}

export class Plugin<Api = unknown, Required extends Dependency = Dependency, Optional extends Dependency = Dependency> {
	declare readonly api: Api;

	constructor(
		readonly id: string,
		readonly parts: PluginParts,
		readonly slotOwnerId: string = id,
		private readonly applying: Applying<Api, Required, Optional> | null = null,
	) {}

	get isAliased(): boolean {
		return this.id !== this.slotOwnerId;
	}

	get applies(): boolean {
		return this.applying !== null;
	}

	aliased(alias: string): Plugin<Api, Required, Optional> {
		return new Plugin(checkedAlias(alias), this.parts, this.id, this.applying);
	}

	require<const D extends readonly Dependency[]>(...dependencies: D): Plugin<Api, Required | D[number], Optional> {
		return new Plugin<Api, Required | D[number], Optional>(
			this.id,
			{
				...this.parts,
				requiredPlugins: [...this.parts.requiredPlugins, ...dependencies.filter(isPlugin)],
				requiredServices: [...this.parts.requiredServices, ...dependencies.filter(isService)],
			},
			this.slotOwnerId,
		);
	}

	optional<const D extends readonly Dependency[]>(...dependencies: D): Plugin<Api, Required, Optional | D[number]> {
		return new Plugin<Api, Required, Optional | D[number]>(
			this.id,
			{
				...this.parts,
				optionalPlugins: [...this.parts.optionalPlugins, ...dependencies.filter(isPlugin)],
				optionalServices: [...this.parts.optionalServices, ...dependencies.filter(isService)],
			},
			this.slotOwnerId,
		);
	}

	declare(...slots: readonly SlotShape[]): Plugin<Api, Required, Optional> {
		return new Plugin(
			this.id,
			{
				...this.parts,
				declaredSlots: [...this.parts.declaredSlots, ...slots],
			},
			this.slotOwnerId,
			this.applying,
		);
	}

	fill(...fills: readonly (Fill | DerivedFill)[]): Plugin<Api, Required, Optional> {
		return new Plugin(
			this.id,
			{
				...this.parts,
				fills: [...this.parts.fills, ...fills.filter((each) => each instanceof Fill)],
				derivedFills: [...this.parts.derivedFills, ...fills.filter((each) => each instanceof DerivedFill)],
			},
			this.slotOwnerId,
			this.applying,
		);
	}

	apply<A>(run: (app: App<Required, Optional>) => A): Plugin<A, Required, Optional> {
		return new Plugin<A, Required, Optional>(this.id, this.parts, this.slotOwnerId, { run });
	}

	applyWith(app: App<Required, Optional>): Api | undefined {
		return this.applying?.run(app);
	}

	hasDependencyOn(pluginId: string): boolean {
		return [...this.parts.requiredPlugins, ...this.parts.optionalPlugins].some((each) => each.id === pluginId);
	}

	isRequired(dependency: Dependency): boolean {
		return [...this.parts.requiredPlugins, ...this.parts.requiredServices].some((each) => each.id === dependency.id);
	}

	isOptional(dependency: Dependency): boolean {
		return [...this.parts.optionalPlugins, ...this.parts.optionalServices].some((each) => each.id === dependency.id);
	}
}

export function plugin(id: string): Plugin<void, never, never> {
	return new Plugin<void, never, never>(checkedName(id), {
		requiredPlugins: [],
		optionalPlugins: [],
		requiredServices: [],
		optionalServices: [],
		declaredSlots: [],
		fills: [],
		derivedFills: [],
	});
}

function isPlugin(dependency: Dependency): dependency is Plugin {
	return dependency instanceof Plugin;
}

function isService(dependency: Dependency): dependency is Service<unknown> {
	return dependency instanceof Service;
}
