import type { AppHost } from "./handles";
import { buildWith, nameOfToken } from "./token";
import type { Provider, Resolver, Token } from "./token";

const NOT_PROVIDED = "{token} is provided by no module";
const CYCLE = "{token} needs itself while it is built";

export class Container implements Resolver {
	private readonly made = new Map<symbol, unknown>();
	private readonly making = new Set<symbol>();

	constructor(
		private readonly providers: ReadonlyMap<symbol, Provider>,
		private readonly host: AppHost,
	) {}

	has(wanted: symbol): boolean {
		return this.providers.has(wanted);
	}

	resolve<T>(wanted: Token<T>): T;
	resolve(wanted: symbol): unknown {
		if (this.made.has(wanted)) return this.made.get(wanted);
		const provider = this.providers.get(wanted);
		if (provider === undefined) throw new Error(NOT_PROVIDED.replace("{token}", nameOfToken(wanted)));
		if (this.making.has(wanted)) throw new Error(CYCLE.replace("{token}", nameOfToken(wanted)));
		this.making.add(wanted);
		try {
			const made = this.build(() => provider(this.host));
			this.made.set(wanted, made);
			return made;
		} finally {
			this.making.delete(wanted);
		}
	}

	build<T>(make: () => T): T {
		return buildWith(this, make);
	}
}
