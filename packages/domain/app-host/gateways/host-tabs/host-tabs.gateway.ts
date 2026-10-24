import type { KeptTabs } from "../../shared/schema/tabs-session.schema.js";

export abstract class HostTabsGateway {
	abstract tabsLoaded(): Promise<void>;
	abstract tabs(): KeptTabs | null;
	abstract saveTabs(tabs: KeptTabs, reason: string): void;
	abstract tabsChanged(listener: () => void): () => void;
	abstract keepsPagesAcrossStarts(): boolean;
}
