import type { AppKind } from "../../shared/schema/app-tab.schema.js";

export abstract class AppTabsGateway {
	abstract shownApp(): AppKind | null;
	abstract watch(changed: () => void): () => void;
	abstract show(app: AppKind): void;
	abstract closePanel(): void;
}
