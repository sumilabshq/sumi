import { PageIconsReadSchema, SiteIconSchema } from "../../../shared/schema/site-icon.schema.js";
import type { KeptSiteIcon, WornIcon } from "../../../shared/schema/site-icon.schema.js";
import { freshIconAt, latestIconOfOrigin, withIconKept } from "../../../shared/lib/site-icon-cache.js";
import { iconAddressesOf } from "../../../shared/lib/site-icon-choice.js";
import { DATA_IMAGE } from "../../../shared/lib/page-icon-links.js";
import { originOf } from "../../../shared/lib/site-key.js";
import type { SiteFilesGateway } from "../../site-files/site-files.gateway.js";
import type { SiteIconsGateway } from "../../site-icons/site-icons.gateway.js";
import { ICONS_UNCHANGED, readPageIconsScript } from "./page-icon-script.js";
import type { PagesBridge } from "./pages-bridge.js";

export interface PageIconsHold {
	readonly bridge: Pick<PagesBridge, "evaluate">;
	readonly siteIcons: SiteIconsGateway;
	readonly siteFiles: SiteFilesGateway;
	readonly drawnPages: () => readonly string[];
	readonly isOnScreen: () => boolean;
	readonly wear: (page: string, worn: WornIcon) => void;
}

const ICONS_EVERY_MS = 2000;

export class PageIcons {
	private readonly worn = new Map<string, string>();
	private readonly reading = new Set<string>();
	private timer: ReturnType<typeof setTimeout> | null = null;
	private readonly hold: PageIconsHold;

	constructor(hold: PageIconsHold) {
		this.hold = hold;
	}

	forget(page: string): void {
		this.worn.delete(page);
	}

	wearRemembered(page: string, address: string): void {
		const origin = originOf(address);
		const favicon = origin === null ? null : latestIconOfOrigin(this.hold.siteIcons.siteIcons(), origin, Date.now());

		if (origin === null || favicon === null) {
			return;
		}

		this.hold.wear(page, {
			favicon,
			origin,
		});
	}

	async readNow(page: string): Promise<void> {
		this.pollLater();
		await this.readOrSay(page, true);
	}

	async reread(): Promise<void> {
		if (!this.hold.isOnScreen()) {
			return;
		}

		await Promise.all(this.hold.drawnPages().map((page) => this.readOrSay(page, false)));
	}

	private pollLater(): void {
		if (this.timer !== null) {
			return;
		}

		this.timer = setTimeout(() => {
			this.timer = null;
			void this.reread().then(() => this.pollLater());
		}, ICONS_EVERY_MS);
	}

	private async readOrSay(page: string, isForced: boolean): Promise<void> {
		if (this.reading.has(page)) {
			return;
		}

		this.reading.add(page);

		try {
			await this.read(page, isForced);
		} catch (failure: unknown) {
			console.error(`[widgetarium] browser page ${page} gave no icon`, failure);
		} finally {
			this.reading.delete(page);
		}
	}

	private async read(page: string, isForced: boolean): Promise<void> {
		const answer = await this.hold.bridge.evaluate(page, readPageIconsScript(isForced));

		if (answer === ICONS_UNCHANGED) {
			return;
		}

		const read = PageIconsReadSchema.parse(JSON.parse(answer));
		const origin = originOf(read.page);
		const addresses = iconAddressesOf(read);
		const choice = addresses.join(" ");

		if (origin === null || addresses.length === 0 || this.worn.get(page) === choice) {
			return;
		}

		const favicon = await this.firstIconOf(addresses, origin);

		if (favicon === null) {
			return;
		}

		this.worn.set(page, choice);
		this.hold.wear(page, {
			favicon,
			origin,
		});
	}

	private async firstIconOf(addresses: readonly string[], origin: string): Promise<string | null> {
		for (const address of addresses) {
			const icon = await this.iconAt(address, origin);

			if (icon !== null) {
				return icon;
			}
		}

		return null;
	}

	private async iconAt(address: string, origin: string): Promise<string | null> {
		if (address.startsWith(DATA_IMAGE)) {
			return SiteIconSchema.safeParse(address).success ? address : null;
		}

		const kept = freshIconAt(this.hold.siteIcons.siteIcons(), address, Date.now());

		if (kept !== null) {
			return kept.icon;
		}

		return this.fetchedIcon(address, origin);
	}

	private async fetchedIcon(address: string, origin: string): Promise<string | null> {
		const { icon, isReached } = await this.hold.siteFiles.siteIcon(address);
		this.keepIfReached({ address, origin, icon, fetchedAt: Date.now() }, isReached);
		return icon;
	}

	private keepIfReached(fetched: KeptSiteIcon, isReached: boolean): void {
		const said = fetched.icon === null ? "none" : `${fetched.icon.length} characters`;

		if (!isReached) {
			console.info(`[widgetarium] site icon ${fetched.address} not kept: the site was not reached`);
			return;
		}

		const reason = `site icon ${fetched.origin} → ${said} (fetched from the live page, ${fetched.address})`;
		this.hold.siteIcons.saveSiteIcons(withIconKept(this.hold.siteIcons.siteIcons(), fetched), fetched.origin, reason);
		console.info(`[widgetarium] ${reason}`);
	}
}
