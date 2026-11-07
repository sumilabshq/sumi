import type { Provided, ServerParts } from "./module";
import type { ModuleScope, Platform } from "./platform-module";
import { MemoryRateLimits } from "./rate-limits";
import type { RateLimits } from "./rate-limits";

export interface RuntimeProvides {
	readonly rateLimits: RateLimits;
}

// TRADE-OFF: a mapped copy, since an interface has no implicit index signature and contexts meet Record types
export type ProvidedByRuntime = Pick<RuntimeProvides, keyof RuntimeProvides>;

type DefaultedRuntimeKey = "rateLimits";

export type UndefaultedRuntimeKey = Exclude<keyof RuntimeProvides, DefaultedRuntimeKey>;

export interface RuntimeFacts extends ServerParts {
	readonly platform: Platform | null;
	readonly scope: ModuleScope | null;
}

export type ProvideRuntime = (facts: RuntimeFacts) => ProvidedByRuntime & Provided;

export type ProvideDefaultRuntime = (facts: RuntimeFacts) => Pick<RuntimeProvides, DefaultedRuntimeKey>;

export const provideDefaultRuntime: ProvideDefaultRuntime = () => ({ rateLimits: new MemoryRateLimits() });
