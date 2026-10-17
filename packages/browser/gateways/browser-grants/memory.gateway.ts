import type { GrantChange, SiteGrant } from "../../shared/schema/site-access.schema.js";
import { BrowserGrantsGateway } from "./browser-grants.gateway.js";

export class MemoryBrowserGrantsGateway extends BrowserGrantsGateway {
	readonly changes: GrantChange[] = [];
	private readonly watchers = new Set<() => void>();
	private held: readonly SiteGrant[] = [];

	readGrants(): readonly SiteGrant[] {
		return this.held;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	writeGrantChange(grants: readonly SiteGrant[], change: GrantChange): void {
		this.held = grants;
		this.changes.push(change);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}
