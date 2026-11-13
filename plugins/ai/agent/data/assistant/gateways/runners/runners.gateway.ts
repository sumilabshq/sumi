import type { Runner } from "../../shared/host/runner.host.js";

export abstract class RunnersGateway {
	abstract runners(): readonly Runner[];
}
