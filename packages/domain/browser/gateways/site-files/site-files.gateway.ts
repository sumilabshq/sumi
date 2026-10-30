import type { PageHeadRead, SiteIconAnswer } from "../../shared/schema/site-icon.schema.js";

export abstract class SiteFilesGateway {
	abstract pageHead(address: string): Promise<PageHeadRead>;
	abstract siteIcon(address: string): Promise<SiteIconAnswer>;
}
