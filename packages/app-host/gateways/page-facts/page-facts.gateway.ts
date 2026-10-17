import type { PageFacts } from "../../shared/schema/page-facts.schema.js";

export abstract class PageFactsGateway {
	abstract pages(): readonly PageFacts[];
	abstract watch(changed: () => void): () => void;
	abstract showPage(pageId: string): void;
	abstract stop(): void;
}
