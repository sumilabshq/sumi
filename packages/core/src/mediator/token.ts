import { isPlatform } from "./platform";
import type { AnyHost, HostOf, Platform } from "./platform";

export type Token<T> = abstract new (...args: never[]) => T;

export type Inject = <T>(wanted: Token<T>) => T;

interface NotAFunction {
	readonly call?: never;
}

export type PlatformMakers<T> = {
	readonly [P in Platform]?: (host: HostOf<P>, inject: Inject) => T;
} & NotAFunction;

export interface Provided<T = unknown, P extends Platform = Platform> {
	readonly token: Token<T>;
	readonly platforms: readonly P[];
	readonly make: (host: AnyHost, inject: Inject) => T;
}

const NOT_ON = "{token} has no implementation on {platform}";

export function provided<T, P extends Platform>(
	wanted: Token<T>,
	makers: { readonly [K in P]: (host: HostOf<K>, inject: Inject) => NoInfer<T> } & NotAFunction,
): Provided<T, P> {
	const platforms = Object.keys(makers).filter((named): named is P => isPlatform(named));
	return {
		token: wanted,
		platforms,
		make: (host, inject) => {
			const made = madeOn<T>(makers, host, inject);
			if (made.length === 0)
				throw new Error(NOT_ON.replace("{token}", wanted.name).replace("{platform}", host.platform));
			return made[0];
		},
	};
}

function madeOn<T>(makers: PlatformMakers<T>, host: AnyHost, inject: Inject): [] | [T] {
	switch (host.platform) {
		case "obsidian":
			return makers.obsidian ? [makers.obsidian(host, inject)] : [];
		case "web":
			return makers.web ? [makers.web(host, inject)] : [];
		case "mobile":
			return makers.mobile ? [makers.mobile(host, inject)] : [];
		case "desktop":
			return makers.desktop ? [makers.desktop(host, inject)] : [];
		case "server":
			return makers.server ? [makers.server(host, inject)] : [];
	}
}
