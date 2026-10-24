import type { GrantChange, SiteGrant } from "../../shared/schema/site-access.schema.js";
import { BrowserGrantReadsGateway } from "../browser-grant-reads/browser-grant-reads.gateway.js";

export abstract class BrowserGrantsGateway extends BrowserGrantReadsGateway {
	abstract saveGrants(grants: readonly SiteGrant[], change: GrantChange): void;
}
