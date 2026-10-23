import type { PageFacts } from "../../shared/schema/page-facts.schema.js";
import { PageFactsGateway } from "./page-facts.gateway.js";

export class NoPageFactsGateway extends PageFactsGateway {
	isAvailable(): boolean {
		return false;
	}

	pages(): readonly PageFacts[] {
		return [];
	}

	watch(): () => void {
		return () => undefined;
	}

	openPage(): void {}

	closePage(): void {}

	showPage(): void {}

	openAddress(): void {}

	reloadPage(): void {}

	stop(): void {}
}
