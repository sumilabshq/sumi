import type { Token } from "./handler";

export class HostObject<T extends object> {
	constructor(
		readonly name: string,
		readonly holds: (value: unknown) => value is T,
	) {}
}

export type Need<T extends object> = Token<T> | HostObject<T>;

export type NeedsShape = Readonly<Record<string, Need<object>>>;

export type NeedSets = Readonly<Record<string, NeedsShape>>;

export class OneOf<S extends NeedSets> {
	constructor(readonly sets: S) {}
}

export interface HostNeeds {
	readonly always: NeedsShape;
	readonly sets: NeedSets | null;
}

export type Lent = Readonly<Record<string, unknown>>;

export interface NeedsBox<N> {
	readonly needs: N;
}

export type Unboxed<B> = B extends NeedsBox<infer N> ? N : never;

type HeldOf<D> = D extends HostObject<infer T> ? T : D extends Token<infer T> ? T : never;

export type HeldBy<M extends NeedsShape> = { readonly [K in keyof M]: HeldOf<M[K]> };

type KeysOfSets<S extends NeedSets> = { [K in keyof S]: keyof S[K] }[keyof S];

export type OneSetLent<S extends NeedSets> = {
	[K in keyof S]: HeldBy<S[K]> & { readonly [O in Exclude<KeysOfSets<S>, keyof S[K]>]?: never };
}[keyof S];

export type OneSetTagged<S extends NeedSets> = {
	[K in keyof S]: { readonly kind: K } & HeldBy<S[K]>;
}[keyof S];

export const NOTHING_NEEDED: HostNeeds = Object.freeze({ always: Object.freeze({}), sets: null });

const NOT_LENT = 'module "{module}" needs {key}: the host did not provide it as a {token}';
const NOT_ONE_SET = 'module "{module}" needs one of: {sets}; the host lent {lent}';
const SECOND_ONE_OF = 'module "{module}" names .needs(oneOf(...)) twice: a host lends one set of a single list';
const UNTOLD_SETS =
	'module "{module}" names oneOf sets a host cannot be told apart by: every set needs keys of its own, none named kind';
const KIND_KEY = "kind";

export function hostObject<T extends object>(name: string, holds: (value: unknown) => value is T): HostObject<T> {
	return new HostObject(name, holds);
}

export function oneOf<const S extends NeedSets>(sets: S): OneOf<S> {
	return new OneOf(sets);
}

export function withNeeds(module: string, held: HostNeeds, added: NeedsShape | OneOf<NeedSets>): HostNeeds {
	if (!(added instanceof OneOf)) {
		return {
			...held,
			always: {
				...held.always,
				...added,
			},
		};
	}

	if (held.sets !== null) {
		throw new Error(SECOND_ONE_OF.replace("{module}", module));
	}

	if (!areToldApart(added.sets)) {
		throw new Error(UNTOLD_SETS.replace("{module}", module));
	}

	return {
		...held,
		sets: added.sets,
	};
}

export function lentFor(module: string, needs: HostNeeds, host: Lent): Lent {
	const always = lentOf(module, needs.always, host);

	if (needs.sets === null) {
		return always;
	}

	const kind = setLentBy(module, needs.sets, host);
	return {
		...always,
		kind,
		...lentOf(module, needs.sets[kind] ?? {}, host),
	};
}

function lentOf(module: string, needs: NeedsShape, host: Lent): Lent {
	const lent: Record<string, unknown> = {};

	for (const [key, need] of Object.entries(needs)) {
		const held = host[key];

		if (!isHeldAs(need, held)) {
			const said = NOT_LENT.replace("{module}", module).replace("{key}", key);
			throw new Error(said.replace("{token}", need.name));
		}

		lent[key] = held;
	}

	return lent;
}

function isHeldAs(need: Need<object>, held: unknown): boolean {
	return need instanceof HostObject ? need.holds(held) : held instanceof need;
}

function setLentBy(module: string, sets: NeedSets, host: Lent): string {
	const touched = Object.keys(sets).filter((kind) => Object.keys(sets[kind] ?? {}).some((key) => key in host));
	const [kind, ...others] = touched;

	if (kind !== undefined && others.length === 0) {
		return kind;
	}

	const said = NOT_ONE_SET.replace("{module}", module).replace("{sets}", setsListed(sets));
	throw new Error(said.replace("{lent}", touched.length === 0 ? "none of them" : `parts of ${touched.join(" and ")}`));
}

function areToldApart(sets: NeedSets): boolean {
	const keys = Object.values(sets).map((needs) => Object.keys(needs));
	const named = keys.flat();
	return keys.every((own) => own.length > 0) && !named.includes(KIND_KEY) && new Set(named).size === named.length;
}

function setsListed(sets: NeedSets): string {
	return Object.entries(sets)
		.map(([kind, needs]) => `${kind} {${Object.keys(needs).join(", ")}}`)
		.join(", ");
}
