import type { AppTab } from "../../shared/schema/app-tab.schema.js";

export abstract class AppTabsGateway {
	abstract tabs(): readonly AppTab[];
	abstract shownId(): string;
	abstract watch(changed: () => void): () => void;
	abstract show(id: string): void;
	abstract closePanel(): void;
}
