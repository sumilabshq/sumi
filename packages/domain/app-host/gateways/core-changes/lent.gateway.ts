import type { CoreChanges } from "../../shared/host/app-host.host.js";
import { CoreChangesGateway } from "./core-changes.gateway.js";

export class LentCoreChangesGateway extends CoreChangesGateway {
	constructor(private readonly coreChanges: CoreChanges) {
		super();
	}

	override coreChanged(listener: () => void): () => void {
		return this.coreChanges.onCoreChanged(listener);
	}
}
