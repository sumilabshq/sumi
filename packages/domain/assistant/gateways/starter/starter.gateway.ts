import type { Starter } from "../../shared/schema/starter.schema.js";

export abstract class StarterGateway {
	abstract starter(): Starter | null;
	abstract saveStarter(next: Starter | null): void;
}
