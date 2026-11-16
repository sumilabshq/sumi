import { CoreChangesGateway } from "./core-changes.gateway.js";

export class NoCoreChangesGateway extends CoreChangesGateway {
	override coreChanged(): () => void {
		return () => undefined;
	}
}
