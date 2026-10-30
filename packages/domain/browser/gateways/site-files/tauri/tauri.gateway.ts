import { PageHeadReadSchema, SiteIconAnswerSchema } from "../../../shared/schema/site-icon.schema.js";
import type { PageHeadRead, SiteIconAnswer } from "../../../shared/schema/site-icon.schema.js";
import type { BrowserPagesIpc } from "../../browser-pages/tauri/tauri.gateway.js";
import { SiteFilesGateway } from "../site-files.gateway.js";
import { AskedOnce } from "./asked-once.js";

const PAGE_HEAD = "plugin:browser|site_page_head";
const SITE_ICON = "plugin:browser|site_icon";

export class TauriSiteFilesGateway extends SiteFilesGateway {
	private readonly heads: AskedOnce<PageHeadRead>;
	private readonly icons: AskedOnce<SiteIconAnswer>;

	constructor(
		private readonly ipc: BrowserPagesIpc,
		now: () => number = Date.now,
	) {
		super();
		this.heads = new AskedOnce((page) => ({ page, head: null, isReached: false }), now);
		this.icons = new AskedOnce(() => ({ icon: null, isReached: false }), now);
	}

	pageHead(address: string): Promise<PageHeadRead> {
		return this.heads.answerOf(address, async () =>
			PageHeadReadSchema.parse(await this.ipc.invoke(PAGE_HEAD, { address })),
		);
	}

	siteIcon(address: string): Promise<SiteIconAnswer> {
		return this.icons.answerOf(address, async () =>
			SiteIconAnswerSchema.parse(await this.ipc.invoke(SITE_ICON, { address })),
		);
	}
}
