import type { GrantChange, SiteGrant } from "../../shared/schema/site-access.schema.js";
import { BrowserGrantsGateway } from "./browser-grants.gateway.js";

export class MemoryBrowserGrantsGateway extends BrowserGrantsGateway {
	readonly changes: GrantChange[] = [];
	private readonly listeners = new Set<() => void>();
	private held: readonly SiteGrant[] = [];

	grants(): readonly SiteGrant[] {
		return this.held;
	}

	grantsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	saveGrants(grants: readonly SiteGrant[], change: GrantChange): void {
		this.held = grants;
		this.changes.push(change);
		for (const changed of [...this.listeners]) {
			changed();
		}
	}
}
