import type { HostTabsMoment } from "../../shared/lib/host-tabs/host-tabs.js";
import { TabsSessionGateway } from "./tabs-session.gateway.js";

export class NoTabsSessionGateway extends TabsSessionGateway {
	kept(): HostTabsMoment | null {
		return null;
	}

	keep(): void {}
}
