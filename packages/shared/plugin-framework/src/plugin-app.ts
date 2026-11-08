import type { SlotFilling, UiSlot } from "./ui-slot";

export interface Dependency {
	readonly id: string;
	readonly api: unknown;
}

type SlotsOf<D> = D extends { readonly slots: infer S } ? S : never;

type FillingsOf<S> = {
	readonly [K in keyof S]: S[K] extends UiSlot<infer Props, infer Shape> ? SlotFilling<Props, Shape> : never;
};

type ApiWithSlots<A, S> = ([A] extends [void] ? unknown : A) & { readonly slots: FillingsOf<S> };

export type ApiOf<D extends Dependency> = [SlotsOf<D>] extends [never] ? D["api"] : ApiWithSlots<D["api"], SlotsOf<D>>;

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
