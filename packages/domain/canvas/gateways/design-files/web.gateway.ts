import { notAvailable } from "../../shared/lib/not-available.js";
import { DesignFilesGateway } from "./design-files.gateway.js";

export class WebDesignFilesGateway extends DesignFilesGateway {
	override async read(): Promise<null> {
		return null;
	}

	override exists(): Promise<boolean> {
		return notAvailable();
	}

	override makeFolder(): Promise<void> {
		return notAvailable();
	}

	override writeBinary(): Promise<void> {
		return notAvailable();
	}

	override writeText(): Promise<void> {
		return notAvailable();
	}

	override changeText(): Promise<void> {
		return notAvailable();
	}
}
