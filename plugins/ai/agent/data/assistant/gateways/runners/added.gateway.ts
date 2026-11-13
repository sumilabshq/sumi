import type { Runner } from "../../shared/host/runner.host.js";
import { RunnersGateway } from "./runners.gateway.js";

export class AddedRunnersGateway extends RunnersGateway {
	constructor(private readonly added: readonly Runner[]) {
		super();
	}

	runners(): readonly Runner[] {
		return this.added;
	}
}
