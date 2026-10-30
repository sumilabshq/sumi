import type { PageHeadRead, SiteIconAnswer } from "../../shared/schema/site-icon.schema.js";
import { SiteFilesGateway } from "./site-files.gateway.js";

export interface ServedSiteFiles {
	readonly heads?: Readonly<Record<string, string>>;
	readonly icons?: Readonly<Record<string, string | null>>;
}

export class MemorySiteFilesGateway extends SiteFilesGateway {
	readonly asked: string[] = [];

	constructor(private readonly served: ServedSiteFiles = {}) {
		super();
	}

	async pageHead(address: string): Promise<PageHeadRead> {
		this.asked.push(address);
		const head = this.served.heads?.[address];
		return {
			page: address,
			head: head ?? null,
			isReached: head !== undefined,
		};
	}

	async siteIcon(address: string): Promise<SiteIconAnswer> {
		this.asked.push(address);
		const icon = this.served.icons?.[address];
		return {
			icon: icon ?? null,
			isReached: icon !== undefined,
		};
	}
}
