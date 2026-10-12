import type { AppHost } from "./handles";
import { buildWith, nameOfToken } from "./token";
import type { Provided, Resolver, Token } from "./token";

interface Made<T> {
	readonly token: Token<T>;
	readonly value: T;
}

const NOT_PROVIDED = "{token} is provided by no module";
const CYCLE = "{token} needs itself while it is built";

export class Container implements Resolver {
	private readonly made = new Map<symbol, Made<unknown>>();
	private readonly making = new Set<symbol>();

	constructor(
		private readonly provided: ReadonlyMap<symbol, Provided>,
		private readonly host: AppHost,
	) {}

	has(wanted: symbol): boolean {
		return this.provided.has(wanted);
	}

	resolve<T>(wanted: Token<T>): T {
		const known = this.made.get(wanted);
		if (known !== undefined && isMadeFor(known, wanted)) return known.value;
		const pair = this.provided.get(wanted);
		if (pair === undefined || !isProvidedFor(pair, wanted))
			throw new Error(NOT_PROVIDED.replace("{token}", nameOfToken(wanted)));
		if (this.making.has(wanted)) throw new Error(CYCLE.replace("{token}", nameOfToken(wanted)));
		this.making.add(wanted);
		try {
			const value = this.build(() => pair.make(this.host));
			this.made.set(wanted, { token: wanted, value });
			return value;
		} finally {
			this.making.delete(wanted);
		}
	}

	build<T>(make: () => T): T {
		return buildWith(this, make);
	}
}

function isProvidedFor<T>(pair: Provided, wanted: Token<T>): pair is Provided<T> {
	return pair.token === wanted;
}

function isMadeFor<T>(made: Made<unknown>, wanted: Token<T>): made is Made<T> {
	return made.token === wanted;
}
