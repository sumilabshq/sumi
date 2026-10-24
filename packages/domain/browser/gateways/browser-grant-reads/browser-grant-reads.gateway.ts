import type { SiteGrant } from "../../shared/schema/site-access.schema.js";

export abstract class BrowserGrantReadsGateway {
	abstract grants(): readonly SiteGrant[];
	abstract grantsChanged(listener: () => void): () => void;
}
