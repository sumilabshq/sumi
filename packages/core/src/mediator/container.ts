import { builtWith } from "./building";
import type { Building } from "./building";
import { isServerOnly } from "./module";
import type { Module } from "./module";
import type { AnyHost } from "./platform";
import type { Inject, Provided, Token } from "./token";

export interface Asker {
	readonly who: string;
	readonly module: Module;
}

interface Held {
	readonly pair: Provided;
	readonly module: Module;
}

interface Made<T> {
	readonly token: Token<T>;
	readonly value: T;
}

const NOT_PROVIDED = "{who} injects {token}, which no module provides";
const NOT_VISIBLE =
	'{who} in module "{asker}" injects {token}, which module "{owner}" provides but does not export to it: add {token} to its exports and "{owner}" to the imports of "{asker}"';
const SERVER_ONLY =
	"{who} injects {token}, which is provided only on server. Mark the request .onServer(), or keep it on the client and send a server request from it.";
const CYCLE = "{token} needs itself while it is built";

export class Container {
	private readonly held: ReadonlyMap<Token<unknown>, Held>;
	private readonly made = new Map<Token<unknown>, Made<unknown>>();
	private readonly making = new Set<Token<unknown>>();

	constructor(
		modules: readonly Module[],
		private readonly host: AnyHost,
		private readonly sender: Building["sender"],
	) {
		this.held = new Map(
			modules.flatMap((module) => module.provide.map((pair): [Token<unknown>, Held] => [pair.token, { pair, module }])),
		);
	}

	has(wanted: Token<unknown>): boolean {
		return this.held.has(wanted);
	}

	resolveForApp<T>(wanted: Token<T>): T {
		const held = this.held.get(wanted);
		if (held === undefined) throw new Error(NOT_PROVIDED.replace("{who}", "the app").replace("{token}", wanted.name));
		return this.madeOf(wanted, held);
	}

	build<T>(asker: Asker, make: () => T): T {
		return builtWith({ inject: this.injectFor(asker), sender: this.sender }, make);
	}

	private injectFor(asker: Asker): Inject {
		return (wanted) => {
			const held = this.held.get(wanted);
			if (held === undefined) throw new Error(fill(NOT_PROVIDED, asker, wanted));
			if (!isVisible(asker.module, held.module, wanted)) throw new Error(notVisible(asker, wanted, held.module));
			if (isServerOnly(held.pair) && this.host.platform !== "server") throw new Error(fill(SERVER_ONLY, asker, wanted));
			return this.madeOf(wanted, held);
		};
	}

	private madeOf<T>(wanted: Token<T>, held: Held): T {
		const known = this.made.get(wanted);
		if (known !== undefined && isMadeFor(known, wanted)) return known.value;
		const { pair } = held;
		if (!isProvidedFor(pair, wanted)) throw new Error(NOT_PROVIDED.replace("{token}", wanted.name));
		if (this.making.has(wanted)) throw new Error(CYCLE.replace("{token}", wanted.name));
		this.making.add(wanted);
		try {
			const asker = { who: wanted.name, module: held.module };
			const value = this.build(asker, () => pair.make(this.host, this.injectFor(asker)));
			this.made.set(wanted, { token: wanted, value });
			return value;
		} finally {
			this.making.delete(wanted);
		}
	}
}

function isVisible(asker: Module, owner: Module, wanted: Token<unknown>): boolean {
	if (asker === owner) return true;
	return asker.imports.some((imported) => imported === owner && owner.exports.includes(wanted));
}

function fill(message: string, asker: Asker, wanted: Token<unknown>): string {
	return message.replace("{who}", asker.who).split("{token}").join(wanted.name);
}

function notVisible(asker: Asker, wanted: Token<unknown>, owner: Module): string {
	return fill(NOT_VISIBLE, asker, wanted).split("{asker}").join(asker.module.name).split("{owner}").join(owner.name);
}

function isProvidedFor<T>(pair: Provided, wanted: Token<T>): pair is Provided<T> {
	return pair.token === wanted;
}

function isMadeFor<T>(made: Made<unknown>, wanted: Token<T>): made is Made<T> {
	return made.token === wanted;
}
