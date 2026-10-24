import type { OnceAllowance } from "../../shared/schema/site-access.schema.js";

export abstract class OnceAllowancesGateway {
	abstract onceAllowances(): readonly OnceAllowance[];
	abstract onceAllowancesChanged(listener: () => void): () => void;
	abstract saveOnceAllowances(allowances: readonly OnceAllowance[]): void;
}
