import type { HostTabsMoment } from "../../shared/lib/host-tabs/host-tabs.js";
import type { KeptTabs } from "../../shared/schema/tabs-session.schema.js";

export abstract class TabsSessionGateway {
	abstract kept(): KeptTabs | null;
	abstract keep(tabs: HostTabsMoment): void;
}
