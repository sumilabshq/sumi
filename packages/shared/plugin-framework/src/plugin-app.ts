export interface Dependency {
	readonly id: string;
	readonly api: unknown;
}

export type ApiOf<D extends Dependency> = D["api"];

export interface App<Required extends Dependency, Optional extends Dependency> {
	use<D extends Required>(dependency: D): ApiOf<D>;
	use<D extends Optional>(dependency: D): ApiOf<D> | null;
}

export type AnyApp = App<Dependency, Dependency>;

export interface CallerFacts {
	readonly pluginId: string;
	readonly prefix: string | null;
}

export type ProvideFor<Api> = (caller: CallerFacts) => Api;
