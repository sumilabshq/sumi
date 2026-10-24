import type { KeptTabs } from "../../shared/schema/tabs-session.schema.js";
import { TabsSessionGateway } from "./tabs-session.gateway.js";

export class NoTabsSessionGateway extends TabsSessionGateway {
	kept(): KeptTabs | null {
		return null;
	}

	keep(): void {}
}
