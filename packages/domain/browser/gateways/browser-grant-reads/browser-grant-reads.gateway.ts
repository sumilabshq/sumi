import type { SiteGrant } from "../../shared/schema/site-access.schema.js";

export abstract class BrowserGrantReadsGateway {
	abstract readGrants(): readonly SiteGrant[];
	abstract watch(changed: () => void): () => void;
}
