export interface Dependency {
	readonly id: string;
	readonly api: unknown;
}

export type ApiOf<D extends Dependency> = D["api"];

export type UsedApi<D extends Dependency, Required extends Dependency> = D extends Required
	? ApiOf<D>
	: ApiOf<D> | null;

export interface App<Required extends Dependency, Optional extends Dependency> {
	use<D extends Required | Optional>(dependency: D): UsedApi<D, Required>;
}

export interface CallerFacts {
	readonly pluginId: string;
	readonly prefix: string | null;
}

export type ProvideFor<Api> = (caller: CallerFacts) => Api;
