import type { HostTabsMoment } from "../../shared/lib/host-tabs/host-tabs.js";

export abstract class TabsSessionGateway {
	abstract kept(): HostTabsMoment | null;
	abstract keep(tabs: HostTabsMoment): void;
}
