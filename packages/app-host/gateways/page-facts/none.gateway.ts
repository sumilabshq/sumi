import type { PageFacts } from "../../shared/schema/page-facts.schema.js";
import { PageFactsGateway } from "./page-facts.gateway.js";

export class NoPageFactsGateway extends PageFactsGateway {
	pages(): readonly PageFacts[] {
		return [];
	}

	watch(): () => void {
		return () => undefined;
	}

	showPage(): void {}

	stop(): void {}
}
