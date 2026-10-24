import type { Starter } from "../../shared/schema/starter.schema.js";
import { StarterGateway } from "./starter.gateway.js";

export class MemoryStarterGateway extends StarterGateway {
	private picked: Starter | null = null;

	starter(): Starter | null {
		return this.picked;
	}

	saveStarter(next: Starter | null): void {
		this.picked = next;
	}
}
