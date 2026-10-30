import { PageIconsReadSchema, SiteIconSchema } from "../../../shared/schema/site-icon.schema.js";
import type { KeptSiteIcon, WornIcon } from "../../../shared/schema/site-icon.schema.js";
import { freshIconAt, latestIconOfOrigin, withIconKept } from "../../../shared/lib/site-icon-cache.js";
import { iconAddressesOf } from "../../../shared/lib/site-icon-choice.js";
import { originOf } from "../../../shared/lib/site-key.js";
import type { SiteIconsGateway } from "../../site-icons/site-icons.gateway.js";
import { ICONS_UNCHANGED, readPageIconsScript } from "./page-icon-script.js";
import type { PagesBridge } from "./pages-bridge.js";

export interface PageIconsHold {
	readonly bridge: Pick<PagesBridge, "evaluate" | "siteIcon">;
	readonly siteIcons: SiteIconsGateway;
	readonly livePages: () => readonly string[];
	readonly wear: (page: string, worn: WornIcon) => void;
}

const ICONS_EVERY_MS = 2000;
const DATA_IMAGE = "data:image/";

export class PageIcons {
	private readonly worn = new Map<string, string>();
	private readonly reading = new Set<string>();
	private readonly fetching = new Map<string, Promise<string | null>>();
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
		await Promise.all(this.hold.livePages().map((page) => this.readOrSay(page, false)));
	}

	private pollLater(): void {
		if (this.timer !== null) {
			return;
		}

		this.timer = setTimeout(() => {
			this.timer = null;
			void this.reread().then(() => this.pollWhileLive());
		}, ICONS_EVERY_MS);
	}

	private pollWhileLive(): void {
		if (this.hold.livePages().length === 0) {
			return;
		}

		this.pollLater();
	}

	private async readOrSay(page: string, isForced: boolean): Promise<void> {
		if (this.reading.has(page)) {
			return;
		}

		this.reading.add(page);

		try {
			await this.read(page, isForced);
		} catch (failure: unknown) {
			console.debug(`[widgetarium] browser page ${page} gave no icon`, failure);
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

		return this.fetchedOnce(address, origin);
	}

	private fetchedOnce(address: string, origin: string): Promise<string | null> {
		const asked = this.fetching.get(address);

		if (asked !== undefined) {
			return asked;
		}

		const fetched = this.hold.bridge
			.siteIcon(address)
			.then(({ icon, isReached }) => {
				this.keepIfReached({ address, origin, icon, fetchedAt: Date.now() }, isReached);
				return icon;
			})
			.finally(() => this.fetching.delete(address));
		this.fetching.set(address, fetched);
		return fetched;
	}

	private keepIfReached(fetched: KeptSiteIcon, isReached: boolean): void {
		const said = fetched.icon === null ? "none" : `${fetched.icon.length} characters`;

		if (!isReached) {
			console.info(`[widgetarium] site icon ${fetched.address} not kept: the site was not reached`);
			return;
		}

		const reason = `site icon ${fetched.address} for ${fetched.origin} → ${said} (fetched)`;
		this.hold.siteIcons.saveSiteIcons(withIconKept(this.hold.siteIcons.siteIcons(), fetched), reason);
		console.info(`[widgetarium] ${reason}`);
	}
}
